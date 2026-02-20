from fastapi.testclient import TestClient
import sys
import os

# Add parent dir to path to import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to Meals App API"}

def test_auth_signup_login():
    # Signup
    signup_data = {"username": "testuser", "password": "testpassword"}
    response = client.post("/auth/signup", data=signup_data)
    assert response.status_code == 200
    token = response.json().get("access_token")
    assert token is not None

    # Login
    login_data = {"username": "testuser", "password": "testpassword"}
    response = client.post("/auth/token", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_ingest_requires_char():
    # This might fail if RAG not initialized, but ingestion logic checks char len first
    response = client.post("/meals/ingest/ab")
    assert response.status_code == 400
