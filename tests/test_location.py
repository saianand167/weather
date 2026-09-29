def test_get_states(client):
    response = client.get("/api/location/states")
    assert response.status_code == 200
    data = response.json()
    assert "states" in data
    assert len(data["states"]) > 20
    assert "Maharashtra" in data["states"]
    assert "Delhi" in data["states"]
    assert "Tamil Nadu" in data["states"]


def test_get_districts_filtered(client):
    response = client.get("/api/location/districts?state=Maharashtra")
    assert response.status_code == 200
    districts = response.json()
    assert len(districts) > 0
    district_names = [d["name"] for d in districts]
    assert "Mumbai City" in district_names or "Pune" in district_names
    # Verify genuine coordinates
    pune = next((d for d in districts if "Pune" in d["name"]), None)
    assert pune is not None
    assert 18.0 <= pune["latitude"] <= 19.5
    assert 73.0 <= pune["longitude"] <= 74.5


def test_get_district_geojson(client):
    response = client.get("/api/location/geojson")
    assert response.status_code == 200
    geojson = response.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 50
    feat = geojson["features"][0]
    assert feat["type"] == "Feature"
    assert "geometry" in feat
    assert feat["geometry"]["type"] == "Point"
    assert len(feat["geometry"]["coordinates"]) == 2


def test_get_district_by_name(client):
    response = client.get("/api/location/New Delhi")
    assert response.status_code == 200
    data = response.json()
    assert data["district"] == "New Delhi"
    assert data["state"] == "Delhi"
    assert abs(data["latitude"] - 28.6139) < 0.1
    assert abs(data["longitude"] - 77.2090) < 0.1


def test_get_nonexistent_district(client):
    response = client.get("/api/location/NonExistentDistrictName123")
    assert response.status_code == 404
