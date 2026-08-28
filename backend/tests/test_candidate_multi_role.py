import requests
import sys
import time

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("--- Candidate Multi-Role Application Test ---")
    email = f"multi_role_{int(time.time())}@example.com"

    # 1. First application for JOB-0001
    payload1 = {
        "firstName": "MultiRole",
        "lastName": "Candidate",
        "email": email,
        "phone": "+91 9999988888",
        "currentRole": "Frontend Dev",
        "jobId": "JOB-0001"
    }

    res1 = requests.post(f"{BASE_URL}/candidates?jobId=JOB-0001", json=payload1)
    if res1.status_code not in (200, 201):
        print(f"FAILED Step 1: {res1.status_code} - {res1.text}")
        sys.exit(1)
    print("1. FIRST ROLE APPLICATION (JOB-0001): SUCCESS")

    # 2. Attempt duplicate application for SAME ROLE (JOB-0001)
    res2 = requests.post(f"{BASE_URL}/candidates?jobId=JOB-0001", json=payload1)
    if res2.status_code == 409:
        print(f"2. SAME ROLE DUPLICATE BLOCKED (JOB-0001): SUCCESS -> {res2.json()['detail']}")
    else:
        print(f"FAILED Step 2: Expected 409 Conflict, got {res2.status_code}")
        sys.exit(1)

    # 3. Attempt application for DIFFERENT ROLE (JOB-0002)
    payload2 = {
        "firstName": "MultiRole",
        "lastName": "Candidate",
        "email": email,
        "phone": "+91 9999988888",
        "currentRole": "Fullstack Dev",
        "jobId": "JOB-0002"
    }

    res3 = requests.post(f"{BASE_URL}/candidates?jobId=JOB-0002", json=payload2)
    if res3.status_code in (200, 201):
        print("3. DIFFERENT ROLE APPLICATION (JOB-0002): SUCCESS! Candidate allowed for multiple roles.")
    else:
        print(f"FAILED Step 3: Expected 200/201, got {res3.status_code} - {res3.text}")
        sys.exit(1)

    print("\nALL MULTI-ROLE CANDIDATE APPLICATION CHECKS PASSED CLEANLY!")

if __name__ == "__main__":
    run_test()
