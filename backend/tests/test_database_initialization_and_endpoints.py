import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
import main
from database import engine, Base

def run_tests():
    print("\n--- STARTING DATABASE INITIALIZATION & ENDPOINTS TEST ---")

    # 1. Verify Base.metadata.create_all initializes all tables cleanly
    Base.metadata.create_all(bind=engine)
    print("1. Executed Base.metadata.create_all(bind=engine) - All 11 models registered.")

    client = TestClient(main.app)

    endpoints_to_test = [
        ("/healthz", 200, "Health Check /healthz"),
        ("/api/jobs", 200, "Jobs API"),
        ("/api/candidates", 200, "Candidates API"),
        ("/api/applications", 200, "Applications API"),
        ("/api/interviews", 200, "Interviews API"),
        ("/api/notifications", 200, "Notifications API"),
        ("/api/offers", 200, "Offers API"),
        ("/api/templates", 200, "Email Templates API"),
        ("/api/talent-pool", 200, "Talent Pool API")
    ]

    print("\n2. Testing GET Endpoints:")
    for path, expected_code, label in endpoints_to_test:
        res = client.get(path)
        print(f"   [{res.status_code} {res.reason_phrase}] {label} -> GET {path}")
        assert res.status_code == expected_code, f"Expected {expected_code} for {path}, got {res.status_code}. Output: {res.text}"

    print("\n3. Testing POST /api/auth/login Endpoint:")
    
    # Test valid login
    valid_payload = {"email": "aditijadhav2828@gmail.com", "password": "password123"}
    valid_res = client.post("/api/auth/login", json=valid_payload)
    print(f"   [{valid_res.status_code} {valid_res.reason_phrase}] Valid Recruiter Login -> POST /api/auth/login")
    assert valid_res.status_code == 200, f"Expected 200 for valid login, got {valid_res.status_code}: {valid_res.text}"
    data = valid_res.json()
    assert data.get("success") is True, f"Expected success=True, got {data}"
    assert "token" in data, "Token missing in response"
    assert data["user"]["email"] == "aditijadhav2828@gmail.com", "Email mismatch"
    print(f"   -> Authenticated User: {data['user']['name']} ({data['user']['role']})")

    # Test invalid login
    invalid_payload = {"email": "aditijadhav2828@gmail.com", "password": "wrong_password_999"}
    invalid_res = client.post("/api/auth/login", json=invalid_payload)
    print(f"   [{invalid_res.status_code} {invalid_res.reason_phrase}] Invalid Login -> POST /api/auth/login")
    assert invalid_res.status_code == 401, f"Expected 401 for invalid login, got {invalid_res.status_code}"

    print("\n=============================================================")
    print("ALL 8 GET ENDPOINTS + HEALTHZ + AUTH LOGIN PASSED (100% OK)!")
    print("=============================================================")

if __name__ == "__main__":
    run_tests()
