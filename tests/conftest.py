import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path so app imports cleanly
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.main import app
from app.database.init_db import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    init_db()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
