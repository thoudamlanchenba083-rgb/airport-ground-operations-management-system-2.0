code = """
Fetches live weather from OpenWeatherMap and maps it to the feature schema
the trained weather ML models expect. Returns None on any failure so callers
can fall back to simulated values.
"""
import requests
from django.conf import settings
from django.core.cache import cache

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
CACHE_TIMEOUT_SECONDS = 600


def get_live_weather(city_name):
    if not city_name:
        return None

    api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
    if not api_key:
        return None

    cache_key = f"live_weather:{city_name.strip().lower()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            OPENWEATHER_URL,
            params={"q": city_name, "appid": api_key, "units": "metric"},
            timeout=5,
        )
        if response.status_code != 200:
            return None

        data = response.json()
        wind_speed_ms = data.get("wind", {}).get("speed", 0)
        precipitation_mm = (
            data.get("rain", {}).get("1h")
            or data.get("snow", {}).get("1h")
            or 0
        )

        result = {
            "visibility_km": round(data.get("visibility", 10000) / 1000, 1),
            "wind_speed_kmh": round(wind_speed_ms * 3.6, 1),
            "precipitation_mm": round(precipitation_mm, 1),
            "temperature_c": round(data.get("main", {}).get("temp", 20), 1),
            "humidity_pct": round(data.get("main", {}).get("humidity", 50), 1),
            "conditions_raw": (data.get("weather") or [{}])[0].get("main", "Clear"),
            "source": "live",
        }
        cache.set(cache_key, result, CACHE_TIMEOUT_SECONDS)
        return result

    except requests.RequestException:
        return None
