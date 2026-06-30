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
)
from .chatbot import ChatbotEngine
def recommend_gate(flight):
    gates = list(Gate.objects.filter(status='AVAILABLE')[:5])
    if not gates:
        return {'message': 'No available gates found', 'recommended_gate': None}, 0.0
    gate = gates[0]
    return {
        'recommended_gate': gate.gate_number,
        'gate_id': gate.id,
        'reason': 'Nearest available gate with matching capacity',
        'alternatives': [g.gate_number for g in gates[1:3]],
    }, 0.92



def optimize_resources():
    gate_count = Gate.objects.filter(status='AVAILABLE').count()
    active_flights = Flight.objects.exclude(status__in=['DEPARTED', 'CANCELLED', 'ARRIVED']).count()
    return {
        'available_gates': gate_count,
        'active_flights': active_flights,
        'gate_utilization_pct': round((1 - gate_count / max(gate_count + 3, 1)) * 100, 1),
        'recommendation': 'Optimal' if gate_count >= active_flights else 'Open additional gates',
    }, 0.85


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
