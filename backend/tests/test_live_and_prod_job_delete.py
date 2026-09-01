import urllib.request
import urllib.error
import json
import os

def test_local_and_prod_delete():
    print("\n=============================================================")
    print("      TESTING EXACT JOB DELETE REQUEST (LOCAL & PROD)        ")
    print("=============================================================\n")

    # Local Test
    local_url = "http://127.0.0.1:8000/api/jobs/JOB-0004"
    print(f"--- LOCAL BACKEND TEST ---")
    print(f"URL: {local_url}")
    print(f"HTTP Method: DELETE")
    print(f"Request Payload: None")

    try:
        req = urllib.request.Request(local_url, method="DELETE")
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            print(f"Response Status: {status} OK")
            print(f"Response Body: {body}")
    except urllib.error.HTTPError as e:
        print(f"Response Status: {e.code}")
        print(f"Response Body: {e.read().decode('utf-8')}")
    except Exception as ex:
        print(f"Local request note (Server may not be running locally): {ex}")

    # Production Render Test
    prod_url = "https://ats-fastapi-backend.onrender.com/api/jobs/JOB-0004"
    print(f"\n--- PRODUCTION RENDER BACKEND TEST ---")
    print(f"URL: {prod_url}")
    print(f"HTTP Method: DELETE")
    print(f"Request Payload: None")

    try:
        req = urllib.request.Request(prod_url, method="DELETE")
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            print(f"Response Status: {status} OK")
            print(f"Response Body: {body}")
    except urllib.error.HTTPError as e:
        print(f"Response Status: {e.code}")
        print(f"Response Body: {e.read().decode('utf-8')}")
    except Exception as ex:
        print(f"Production request note: {ex}")

if __name__ == "__main__":
    test_local_and_prod_delete()
