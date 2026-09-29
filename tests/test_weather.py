def test_get_current_weather_real_api(client):
    """
    Tests live NWP observation fetch for New Delhi.
    Verifies real units, timestamp, temperature, humidity, rainfall fields.
    Accepts 503 if Open-Meteo is temporarily unreachable (sandbox/CI environment).
    """
    response = client.get("/api/weather/current?lat=28.6139&lon=77.2090&district=New%20Delhi&state=Delhi")
    # 503 means upstream Open-Meteo is rate-limiting or unreachable — not an app bug
    if response.status_code in [502, 503]:
        import pytest
        pytest.skip("Open-Meteo upstream returned 502/503 (service unavailable/bad gateway) — transient network issue")
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert data["source"].startswith("Open-Meteo")
    assert data["is_live"] is True
    # Values should be numbers or None (no dummy string labels)
    assert isinstance(data["temperature"], (int, float))
    assert isinstance(data["humidity"], (int, float))
    assert data["units"]["rainfall"] == "mm"
    assert data["units"]["temperature"] == "°C"


def test_get_forecast_real_api(client):
    """
    Tests live NWP multi-day forecast fetch.
    Accepts 503 if Open-Meteo is temporarily unreachable (sandbox/CI environment).
    """
    response = client.get("/api/weather/forecast?lat=19.0760&lon=72.8777&district=Mumbai%20Suburban&state=Maharashtra&days=3")
    if response.status_code in [502, 503]:
        import pytest
        pytest.skip("Open-Meteo upstream returned 502/503 (service unavailable/bad gateway) — transient network issue")
    assert response.status_code == 200
    data = response.json()
    assert data["district"] == "Mumbai Suburban"
    assert data["state"] == "Maharashtra"
    assert "current" in data
    assert "hourly" in data
    assert len(data["hourly"]) > 24  # At least 24 hours of hourly predictions
    assert "daily" in data
    assert len(data["daily"]) == 3  # 3 days summary
    # Check first hourly record structure
    first_hour = data["hourly"][0]
    assert "timestamp" in first_hour
    assert "rainfall" in first_hour
    assert "temperature" in first_hour


def test_district_name_resolution(client):
    """
    Tests that passing district name automatically resolves verified coordinates.
    Accepts 503 if Open-Meteo is temporarily unreachable (sandbox/CI environment).
    """
    response = client.get("/api/weather/current?district=Bengaluru%20Urban")
    if response.status_code in [502, 503]:
        import pytest
        pytest.skip("Open-Meteo upstream returned 502/503 (service unavailable/bad gateway) — transient network issue")
    assert response.status_code == 200
    data = response.json()
    assert abs(data["latitude"] - 12.9716) < 0.1
    assert abs(data["longitude"] - 77.5946) < 0.1
