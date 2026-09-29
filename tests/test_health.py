def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "operational")
    assert data["sih_code"] == "SIH26080"
    assert data["app_name"] == "Rainfall Intelligence"
    assert "components" in data
    assert "database" in data["components"]
    assert data["components"]["database"]["status"] == "operational"
    assert "nwp_data_source" in data["components"]
