import requests
import json

print("Scanning 3 hosts... please wait...")

response = requests.post(
    "http://127.0.0.1:8000/scan",
    json={"hosts": ["google.com", "github.com", "cloudflare.com"]}
)

print("STATUS CODE:", response.status_code)
print("RAW RESPONSE:")
print(response.text)

print("\n--- TRYING TO PARSE JSON ---")
try:
    result = response.json()
    print(json.dumps(result, indent=2))
except Exception as e:
    print("JSON PARSE ERROR:", e)

print("\n--- DASHBOARD ---")
dash = requests.get("http://127.0.0.1:8000/dashboard")
print("DASHBOARD STATUS:", dash.status_code)
print(dash.text)