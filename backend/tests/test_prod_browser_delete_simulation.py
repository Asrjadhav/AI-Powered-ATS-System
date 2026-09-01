import urllib.request
import urllib.error
import ssl
import json

def test_browser_delete_simulation():
    print("\n=============================================================")
    print("      SIMULATING BROWSER PREFLIGHT & DELETE REQUEST (PROD)   ")
    print("=============================================================\n")

    url = "https://ats-fastapi-backend.onrender.com/api/jobs/JOB-0004"
    ctx = ssl.create_default_context()

    # Step 1: OPTIONS Preflight
    print("STEP 1: OPTIONS Preflight Request")
    print(f"URL: {url}")
    print("Method: OPTIONS")
    print("Headers:")
    print("  Origin: http://localhost:3000")
    print("  Access-Control-Request-Method: DELETE")
    print("  Access-Control-Request-Headers: x-skip-interceptor,content-type")

    opt_req = urllib.request.Request(
        url,
        method="OPTIONS",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "x-skip-interceptor,content-type"
        }
    )

    try:
        with urllib.request.urlopen(opt_req, context=ctx) as opt_resp:
            print(f"OPTIONS Status: {opt_resp.status} OK")
            print(f"Access-Control-Allow-Origin: {opt_resp.headers.get('Access-Control-Allow-Origin')}")
            print(f"Access-Control-Allow-Methods: {opt_resp.headers.get('Access-Control-Allow-Methods')}")
            print(f"Access-Control-Allow-Headers: {opt_resp.headers.get('Access-Control-Allow-Headers')}")
    except Exception as e:
        print(f"OPTIONS Failed: {e}")
        return

    # Step 2: DELETE Request
    print("\nSTEP 2: Actual DELETE Request")
    print(f"URL: {url}")
    print("Method: DELETE")
    print("Headers:")
    print("  Origin: http://localhost:3000")
    print("  X-Skip-Interceptor: true")
    print("  Content-Type: application/json")

    del_req = urllib.request.Request(
        url,
        method="DELETE",
        headers={
            "Origin": "http://localhost:3000",
            "X-Skip-Interceptor": "true",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(del_req, context=ctx) as del_resp:
            body = del_resp.read().decode("utf-8")
            print(f"DELETE Status: {del_resp.status} OK")
            print(f"Access-Control-Allow-Origin: {del_resp.headers.get('Access-Control-Allow-Origin')}")
            print(f"DELETE Response Body: {body}")
            print("\n[SUCCESS] BROWSER PREFLIGHT + DELETE FLOW VERIFIED SUCCESSFULLY!")
    except urllib.error.HTTPError as he:
        print(f"DELETE HTTP Error: {he.code}")
        print(f"DELETE Response Body: {he.read().decode('utf-8')}")
    except Exception as e:
        print(f"DELETE Error: {e}")

if __name__ == "__main__":
    test_browser_delete_simulation()
