from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count
from .models import AIPrediction, AIChatMessage
from .serializers import AIPredictionSerializer, AIChatMessageSerializer
from flights.models import Flight
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
def recommend_gate(flight):
    gates = list(Gate.objects.filter(is_available=True)[:10])
    if not gates:
        return {'message': 'No available gates found', 'recommended_gate': None}, 0.0

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
        prediction = serializer.save(created_by=self.request.user, status='PENDING')
        try:
            handler = PREDICTION_HANDLERS.get(prediction.prediction_type)
            if handler:
                result, confidence = handler(prediction.flight, prediction.input_data)
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
        msgs = AIChatMessage.objects.filter(user=request.user, session_id=session)
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
        reply = self._generate_reply(content, user=request.user)
        bot_msg = AIChatMessage.objects.create(
            user=request.user, role='assistant',
            content=reply, session_id=session_id
        )
        return Response(AIChatMessageSerializer(bot_msg).data, status=201)

    def _generate_reply(self, message, user=None):
        try:
            return ChatbotEngine.respond(message, user=user)
        except Exception as e:
            return f"Sorry, I hit an error answering that: {str(e)}"
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        session_id = request.data.get('session_id', '')
        AIChatMessage.objects.filter(user=request.user, session_id=session_id).delete()
        return Response({'message': 'Chat cleared'})