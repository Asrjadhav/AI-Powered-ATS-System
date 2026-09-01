import urllib.request
import urllib.error
import ssl

def test_cors_options():
    url = "https://ats-fastapi-backend.onrender.com/api/jobs/JOB-0004"
    print("\n=============================================================")
    print("      TESTING CORS OPTIONS PREFLIGHT AGAINST PRODUCTION     ")
    print("=============================================================\n")

    print(f"Target URL: {url}")
    print("HTTP Method: OPTIONS")
    print("Headers:")
    print("  Origin: http://localhost:3000")
    print("  Access-Control-Request-Method: DELETE")
    print("  Access-Control-Request-Headers: x-skip-interceptor,content-type\n")

    req = urllib.request.Request(
        url,
        method="OPTIONS",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "x-skip-interceptor,content-type",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
        }
    )

    ctx = ssl.create_default_context()

    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            print(f"OPTIONS Status Code: {resp.status}")
            print("\nResponse Headers:")
            headers = dict(resp.headers)
            for k, v in headers.items():
                if "access-control" in k.lower() or "server" in k.lower():
                    print(f"  {k}: {v}")
            
            allow_origin = resp.headers.get("Access-Control-Allow-Origin")
            allow_methods = resp.headers.get("Access-Control-Allow-Methods")
            allow_headers = resp.headers.get("Access-Control-Allow-Headers")
            
            print("\n--- CORS SUMMARY ---")
            print(f"Access-Control-Allow-Origin: {allow_origin}")
            print(f"Access-Control-Allow-Methods: {allow_methods}")
            print(f"Access-Control-Allow-Headers: {allow_headers}")
    except urllib.error.HTTPError as e:
        print(f"HTTPError Status Code: {e.code}")
        print(dict(e.headers))
    except Exception as ex:
        print(f"Error executing OPTIONS request: {ex}")

if __name__ == "__main__":
    test_cors_options()
