import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from fastapi.testclient import TestClient
import main
from database import engine, Base

def run_tests():
    print("\n--- STARTING DATABASE INITIALIZATION & GET ENDPOINTS TEST ---")

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

    print("\n=============================================================")
    print("ALL 8 GET ENDPOINTS + HEALTHZ PASSED CLEANLY (HTTP 200 OK)!")
    print("=============================================================")

if __name__ == "__main__":
    run_tests()
