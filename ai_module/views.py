from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from core_app.permissions import IsViewerReadOnly
from django.db.models import Avg, Count
from .models import AIPrediction, AIChatMessage, FlightScheduleUpload
from .serializers import AIPredictionSerializer, AIChatMessageSerializer, FlightScheduleUploadSerializer
from .excel_import import import_flight_schedule
from gates.models import Gate
from .ml.predictor import (
    predict_delay,
    predict_maintenance,
    predict_passenger_rush,
    predict_weather_risk,
    predict_staff,
    predict_best_gate,
)
from .ml.resource_optimizer import optimize_resources
from .ml.dashboard_intelligence import get_dashboard_intelligence
from .chatbot import ChatbotEngine
from . import llm_engine
from . import gemini_engine
from django.conf import settings


def recommend_gate(flight):
    gates = list(Gate.objects.filter(is_available=True)[:10])
    if not gates:
        return {'message': 'No available gates found',
                'recommended_gate': None}, 0.0

    ranked = predict_best_gate(flight, gates)
    best_gate, best_score = ranked[0]

    return {
        'recommended_gate': best_gate.gate_number,
        'gate_id': best_gate.id,
        'suitability_score': round(best_score, 1),
        'reason': 'ML-ranked by distance, recent utilization, terminal match, and aircraft fit',
        'alternatives': [g.gate_number for g, _ in ranked[1:3]],
    }, round(min(0.99, best_score / 100), 2)


PREDICTION_HANDLERS = {
    'DELAY': lambda f, d: predict_delay(f),
    'MAINTENANCE': lambda f, d: predict_maintenance(f),
    'GATE': lambda f, d: recommend_gate(f),
    'STAFF': lambda f, d: predict_staff(f),
    'PASSENGER_RUSH': lambda f, d: predict_passenger_rush(f),
    'WEATHER_RISK': lambda f, d: predict_weather_risk(f),
    'RESOURCE': lambda f, d: optimize_resources(),
}


class AIPredictionViewSet(viewsets.ModelViewSet):
    queryset = AIPrediction.objects.all()
    serializer_class = AIPredictionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        prediction = serializer.save(
            created_by=self.request.user,
            status='PENDING')
        try:
            handler = PREDICTION_HANDLERS.get(prediction.prediction_type)
            if handler:
                result, confidence = handler(
                    prediction.flight, prediction.input_data)
                prediction.result = result
                prediction.confidence_score = confidence
                prediction.status = 'COMPLETED'
            else:
                prediction.status = 'FAILED'
                prediction.result = {'error': 'Unknown prediction type'}
        except Exception as e:
            prediction.status = 'FAILED'
            prediction.result = {'error': str(e)}
        prediction.save()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        data = {
            'total_predictions': AIPrediction.objects.count(),
            'by_type': list(
                AIPrediction.objects.values('prediction_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            'avg_confidence': AIPrediction.objects.aggregate(
                avg=Avg('confidence_score')
            )['avg'] or 0,
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Live KPIs + ML forecasts (delay, weather, passenger rush, staff
        shortage, maintenance alerts) for the dashboard. Read-only, doesn't
        write an AIPrediction row - see dashboard_intelligence.py docstring.
        """
        return Response(get_dashboard_intelligence())


class AIChatViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        session = request.query_params.get('session_id', '')
        msgs = AIChatMessage.objects.filter(
            user=request.user, session_id=session)
        return Response(AIChatMessageSerializer(msgs, many=True).data)

    @action(detail=False, methods=['post'])
    def send(self, request):
        content = request.data.get('content', '').strip()
        session_id = request.data.get('session_id', '')
        if not content:
            return Response({'error': 'Message cannot be empty'}, status=400)
        AIChatMessage.objects.create(
            user=request.user, role='user',
            content=content, session_id=session_id
        )
        reply = self._generate_reply(
            content, user=request.user, session_id=session_id)
        bot_msg = AIChatMessage.objects.create(
            user=request.user, role='assistant',
            content=reply, session_id=session_id
        )
        return Response(AIChatMessageSerializer(bot_msg).data, status=201)

    def _generate_reply(self, message, user=None, session_id=''):
        # Try LLM providers in priority order (Claude, then Gemini), and
        # fall back to the offline rule-based engine if none are configured
        # or all of them fail (network error, bad key, rate limit, etc).
        # This means the assistant always answers - with an API if one is
        # set up, without one otherwise.
        providers = []
        if getattr(settings, "ANTHROPIC_API_KEY", ""):
            providers.append(llm_engine.get_reply)
        if getattr(settings, "GEMINI_API_KEY", ""):
            providers.append(gemini_engine.get_reply)

        for provider in providers:
            try:
                return provider(message, user=user, session_id=session_id)
            except Exception as e:
                print(f"[AI DEBUG] {provider.__module__} failed: {e}")
                continue  # try the next provider, or fall through to offline

        try:
            return ChatbotEngine.respond(
                message, user=user, session_id=session_id)
        except Exception as e:
            return f"Sorry, I hit an error answering that: {str(e)}"

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        session_id = request.data.get('session_id', '')
        AIChatMessage.objects.filter(
            user=request.user,
            session_id=session_id).delete()
        return Response({'message': 'Chat cleared'})


class FlightScheduleViewSet(viewsets.ViewSet):
    """
    Upload an Excel/CSV flight-timing sheet so the AI Assistant chatbot can
    answer "is there a flight at this time" questions against it.
    Any authenticated role can view the active sheet; VIEWER is blocked from
    uploading or clearing it (read-only role, enforced by IsViewerReadOnly).
    """
    permission_classes = [IsAuthenticated, IsViewerReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def list(self, request):
        """GET /api/ai/schedule/ - info about the currently active sheet."""
        upload = FlightScheduleUpload.objects.order_by('-uploaded_at').first()
        if not upload:
            return Response({'active': False})
        return Response(
            {'active': True, **FlightScheduleUploadSerializer(upload).data})

    def create(self, request):
        """POST /api/ai/schedule/ - upload a new sheet (multipart 'file')."""
        f = request.FILES.get('file')
        if not f:
            return Response(
                {'error': 'No file provided. Attach it under the "file" field.'}, status=400)
        if not f.name.lower().endswith(('.xlsx', '.xls', '.csv')):
            return Response(
                {'error': 'Please upload a .xlsx, .xls, or .csv file.'}, status=400)

        upload = import_flight_schedule(f, f.name, user=request.user)
        if upload.status == 'FAILED':
            return Response(
                {'error': f"Couldn't read that file: {upload.error_message}"}, status=400
            )
        return Response(
            FlightScheduleUploadSerializer(upload).data,
            status=201)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        FlightScheduleUpload.objects.all().delete()
        return Response({'message': 'Flight schedule cleared'})
