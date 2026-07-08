"""
Performance/load test for the Airport Ground Operations API.
Run with: locust -f locustfile.py --host=http://127.0.0.1:8000
Then open http://localhost:8089 to configure users/spawn-rate and start.
"""
import random
from locust import HttpUser, task, between


class AirportOpsUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Log in once per simulated user before running tasks."""
        response = self.client.post("/api/token/", json={
            "username": "loadtest_user",
            "password": "LoadTest123!"
        })
        if response.status_code == 200:
            self.token = response.json().get("access")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})

    @task(5)
    def list_flights(self):
        self.client.get("/api/flights/flights/", name="/api/flights/flights/ [list]")

    @task(3)
    def list_gates(self):
        self.client.get("/api/gates/gates/", name="/api/gates/gates/ [list]")

    @task(3)
    def list_staff(self):
        self.client.get("/api/staff/staff/", name="/api/staff/staff/ [list]")

    @task(2)
    def list_notifications(self):
        self.client.get("/api/notifications/", name="/api/notifications/ [list]")
    @task(1)
    def view_flight_detail(self):
        response = self.client.get("/api/flights/flights/", name="/api/flights/flights/ [list-for-detail]")
        if response.status_code == 200:
            results = response.json().get("results", [])
            if results:
                flight_id = random.choice(results)["id"]
                self.client.get(f"/api/flights/flights/{flight_id}/", name="/api/flights/flights/:id/ [detail]")

    @task(1)
    def create_airline(self):
        """Occasional write load — uses a random suffix so it doesn't collide on unique 'code'."""
        suffix = random.randint(10000, 99999)
        self.client.post("/api/flights/airlines/", json={
            "name": f"LoadTest Air {suffix}",
            "code": f"LT{suffix}"[:10],
        }, name="/api/flights/airlines/ [create]")