import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Hindsight configuration
HINDSIGHT_API_URL = os.getenv(
    "HINDSIGHT_API_URL",
    "https://api.hindsight.vectorize.io"
)

HINDSIGHT_API_KEY = os.getenv(
    "HINDSIGHT_API_KEY",
    "your-hindsight-api-key"
)

# Dedicated memory bank for this project
HINDSIGHT_BANK_ID = os.getenv(
    "HINDSIGHT_BANK_ID",
    "incident-response-agent"
)


def get_headers():
    return {
        "Authorization": f"Bearer {HINDSIGHT_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


def ensure_memory_bank():
    """
    Creates the Hindsight memory bank if it does not already exist.
    The PUT endpoint is safe to call repeatedly because it creates
    or updates the specified bank.
    """

    url = (
        f"{HINDSIGHT_API_URL}/v1/default/banks/"
        f"{HINDSIGHT_BANK_ID}"
    )

    payload = {
        "name": "SRE Incident Response Agent",
        "mission": (
            "Store and retrieve historical SRE incidents, "
            "post-mortems, root causes, resolution steps, "
            "and recommended runbooks for incident response."
        )
    }

    try:
        response = requests.put(
            url,
            json=payload,
            headers=get_headers(),
            timeout=10
        )

        if response.status_code in [200, 201]:
            print(
                f"[OK] Hindsight memory bank ready: "
                f"{HINDSIGHT_BANK_ID}"
            )
            return True

        print(
            f"[ERROR] Could not create/update Hindsight bank: "
            f"{response.status_code} - {response.text}"
        )
        return False

    except requests.RequestException as e:
        print(f"[ERROR] Hindsight bank connection error: {e}")
        return False


def retain_incident(post_mortem: dict):
    """
    Sends one SRE post-mortem to Hindsight memory.
    """

    content_text = f"""
INCIDENT ID: {post_mortem['incident_id']}
SERVICE: {post_mortem['service']}
SEVERITY: {post_mortem['severity']}
SYMPTOM: {post_mortem['symptom']}
ROOT CAUSE: {post_mortem['root_cause']}

RESOLUTION STEPS:
{chr(10).join(f"- {step}" for step in post_mortem['resolution_steps'])}

RECOMMENDED RUNBOOK:
{post_mortem['effective_runbook']}
""".strip()

    payload = {
        "items": [
            {
                "content": content_text,
                "context": (
                    "SRE incident post-mortem for the "
                    "Incident Response Agent. "
                    f"Incident ID: {post_mortem['incident_id']}. "
                    f"Service: {post_mortem['service']}. "
                    f"Severity: {post_mortem['severity']}."
                )
            }
        ]
    }

    if HINDSIGHT_API_KEY in (
        "your-hindsight-api-key",
        "",
        None
    ):
        print(
            "[LOCAL VALIDATION] HINDSIGHT_API_KEY is not configured. "
            f"Validated post-mortem: "
            f"{post_mortem['incident_id']}"
        )
        return False

    url = (
        f"{HINDSIGHT_API_URL}/v1/default/banks/"
        f"{HINDSIGHT_BANK_ID}/memories"
    )

    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_headers(),
            timeout=30
        )

        if response.status_code in [200, 201]:
            print(
                f"[OK] Successfully retained "
                f"{post_mortem['incident_id']} "
                f"({post_mortem['service']})"
            )
            try:
                result = response.json()
                print(f"     Hindsight response: {result}")
            except ValueError:
                pass
            return True

        print(
            f"[ERROR] Failed to retain "
            f"{post_mortem['incident_id']}: "
            f"{response.status_code} - {response.text}"
        )
        return False

    except requests.RequestException as e:
        print(
            f"[ERROR] Connection error retaining "
            f"{post_mortem['incident_id']}: {e}"
        )
        return False


def main():
    print("=" * 70)
    print("SRE INCIDENT RESPONSE AGENT - HINDSIGHT INGESTION")
    print("=" * 70)

    print(f"Hindsight URL : {HINDSIGHT_API_URL}")
    print(f"Memory Bank   : {HINDSIGHT_BANK_ID}")
    print()

    if HINDSIGHT_API_KEY in (
        "your-hindsight-api-key",
        "",
        None
    ):
        print(
            "[ERROR] HINDSIGHT_API_KEY is not configured "
            "in your .env file."
        )
        return

    if not ensure_memory_bank():
        print(
            "\n[STOPPED] Could not prepare the Hindsight "
            "memory bank."
        )
        return

    data_path = os.path.join(
        os.path.dirname(__file__),
        "data",
        "post_mortems.json"
    )

    if not os.path.exists(data_path):
        print(f"[ERROR] File not found: {data_path}")
        return

    try:
        with open(data_path, "r", encoding="utf-8") as f:
            post_mortems = json.load(f)
    except Exception as e:
        print(f"[ERROR] Could not read post_mortems.json: {e}")
        return

    print(f"Starting ingestion of {len(post_mortems)} post-mortems...\n")

    successful = 0
    failed = 0

    for pm in post_mortems:
        if retain_incident(pm):
            successful += 1
        else:
            failed += 1
        print()

    print("=" * 70)
    print("INGESTION COMPLETE")
    print("=" * 70)
    print(f"Total incidents : {len(post_mortems)}")
    print(f"Successful      : {successful}")
    print(f"Failed          : {failed}")
    print(f"Memory bank     : {HINDSIGHT_BANK_ID}")
    print("=" * 70)


if __name__ == "__main__":
    main()
