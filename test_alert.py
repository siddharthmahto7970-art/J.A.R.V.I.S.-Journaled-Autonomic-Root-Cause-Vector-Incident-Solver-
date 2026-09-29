import requests
import json
import sys

BASE_URL = "http://127.0.0.1:3000"

def test_health():
    print("--> Testing /health endpoint...")
    res = requests.get(f"{BASE_URL}/health")
    print(f"Status: {res.status_code}")
    print(f"Response: {res.json()}\n")

def test_alert(service: str, severity: str, alert_message: str, stack_trace: str):
    print(f"--> Sending Alert for service: '{service}'...")
    payload = {
        "service": service,
        "severity": severity,
        "alert_message": alert_message,
        "stack_trace": stack_trace
    }
    res = requests.post(f"{BASE_URL}/api/v1/alert", json=payload)
    print(f"Status Code: {res.status_code}")
    print("Response Plan:")
    print(json.dumps(res.json(), indent=2))
    print("-" * 50)

def main():
    try:
        test_health()
    except Exception as e:
        print(f"Error connecting to {BASE_URL}: {e}")
        print("Please ensure the server is running on port 3000")
        sys.exit(1)

    # 1. Test HikariCP connection pool exhaustion alert
    test_alert(
        service="payment-gateway-v2",
        severity="P1-CRITICAL",
        alert_message="504 Gateway Timeout detected on checkout endpoint",
        stack_trace="HikariPool-1 - Connection is not available, request timed out after 30000ms."
    )

    # 2. Test Redis session OOM crash alert
    test_alert(
        service="auth-service",
        severity="P2-HIGH",
        alert_message="OOMKilled pods crashing repeatedly under elevated login requests",
        stack_trace="OutOfMemoryError: Container killed by cgroup memory limit"
    )

    # 3. Test CoreDNS stale cache resolution failure alert
    test_alert(
        service="notification-dispatcher",
        severity="P1-CRITICAL",
        alert_message="Stale DNS resolution causing connection refusal to AWS SES SMTP endpoints",
        stack_trace="SocketTimeoutException: Connection refused to email.us-east-1.amazonaws.com"
    )

if __name__ == "__main__":
    main()
