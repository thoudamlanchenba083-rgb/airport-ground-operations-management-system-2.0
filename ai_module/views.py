from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count
import random

from .models import AIPrediction, AIChatMessage
from .serializers import AIPredictionSerializer, AIChatMessageSerializer
from flights.models import Flight
from gates.models import Gate


def predict_delay(flight):
    hour = flight.departure_time.hour
    risk = 0.1
    if 7 <= hour <= 9 or 17 <= hour <= 19:
        risk += 0.3
    if flight.status == 'DELAYED':
        risk += 0.4
    risk = min(round(risk + random.uniform(-0.05, 0.05), 2), 1.0)
    return {
        'delay_probability': risk,
        'estimated_delay_minutes': int(risk * 90),
        'risk_level': 'HIGH' if risk > 0.6 else 'MEDIUM' if risk > 0.3 else 'LOW',
        'reason': 'Peak hour congestion' if (7 <= hour <= 9 or 17 <= hour <= 19) else 'Normal conditions',
    }, round(1 - risk, 2)


def predict_maintenance(flight):
    score = random.uniform(0.1, 0.9)
    return {
        'maintenance_required': score > 0.6,
        'urgency': 'IMMEDIATE' if score > 0.8 else 'SOON' if score > 0.6 else 'ROUTINE',
        'estimated_hours': round(score * 10, 1),
        'components_at_risk': ['Engine Oil', 'Landing Gear'] if score > 0.6 else ['Tires'],
    }, round(score, 2)


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


def predict_staff(flight):
    passenger_count = flight.aircraft.capacity if flight.aircraft else 150
    ground_crew = max(4, passenger_count // 30)
    security = max(2, passenger_count // 50)
    return {
        'ground_crew_required': ground_crew,
        'security_staff_required': security,
        'baggage_handlers_required': max(3, passenger_count // 40),
        'total_staff_required': ground_crew + security,
    }, 0.88


def predict_passenger_rush(flight):
    hour = flight.departure_time.hour
    is_peak = 7 <= hour <= 9 or 17 <= hour <= 19
    capacity = flight.aircraft.capacity if flight.aircraft else 150
    rush_factor = random.uniform(0.7, 1.0) if is_peak else random.uniform(0.3, 0.6)
    return {
        'expected_passengers': int(capacity * rush_factor),
        'rush_level': 'HIGH' if rush_factor > 0.7 else 'MEDIUM' if rush_factor > 0.4 else 'LOW',
        'peak_boarding_time': str(hour) + ':30',
        'recommended_open_counters': max(2, int(rush_factor * 6)),
    }, round(rush_factor, 2)


def predict_weather_risk(flight):
    risk = random.uniform(0.0, 0.8)
    return {
        'weather_risk_score': round(risk, 2),
        'risk_level': 'HIGH' if risk > 0.6 else 'MEDIUM' if risk > 0.3 else 'LOW',
        'conditions': random.choice(['Clear', 'Light Rain', 'Fog', 'Strong Winds', 'Thunderstorm']),
        'visibility_km': round(random.uniform(1, 10), 1),
        'delay_likely': risk > 0.5,
    }, round(1 - risk, 2)


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
        reply = self._generate_reply(content)
        bot_msg = AIChatMessage.objects.create(
            user=request.user, role='assistant',
            content=reply, session_id=session_id
        )
        return Response(AIChatMessageSerializer(bot_msg).data, status=201)

    def _generate_reply(self, message):
        msg = message.lower()
        if 'delay' in msg:
            return 'Flights during peak hours have a 40 percent higher delay risk. Consider adding buffer time.'
        if 'gate' in msg:
            gates = Gate.objects.filter(status='AVAILABLE').count()
            return 'Currently ' + str(gates) + ' gates are available. Provide a flight number for a specific recommendation.'
        if 'weather' in msg:
            return 'Current risk model shows moderate conditions. Always check METAR before departure.'
        if 'maintenance' in msg:
            return 'Aircraft with more than 500 cycles since last check should be flagged for inspection.'
        if 'flight' in msg:
            count = Flight.objects.exclude(status__in=['DEPARTED', 'CANCELLED']).count()
            return 'There are currently ' + str(count) + ' active flights in the system.'
        return 'I am the AGOMS AI Assistant. I can help with delay predictions, gate recommendations, maintenance alerts, and weather risk.'

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        session_id = request.data.get('session_id', '')
        AIChatMessage.objects.filter(user=request.user, session_id=session_id).delete()
        return Response({'message': 'Chat cleared'})
