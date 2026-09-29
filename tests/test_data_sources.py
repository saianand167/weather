def test_get_data_sources_status(client):
    response = client.get("/api/data-sources/status")
    assert response.status_code == 200
    data = response.json()
    assert data["total_sources"] >= 2
    assert data["active_sources"] >= 1
    source_names = [s["name"] for s in data["sources"]]
    assert any("Open-Meteo" in name for name in source_names)


def test_probe_data_sources_live(client):
    response = client.post("/api/data-sources/check")
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    assert data["result"]["status"] in ("Connected", "Operational")
    assert data["result"]["latency_ms"] is not None
