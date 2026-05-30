import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class ContactIntegrationError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def list_contacts(*, owner_username, search="", visibility=""):
    query = {"owner_username": owner_username}
    if search:
        query["search"] = search
    if visibility:
        query["visibility"] = visibility

    return _request("GET", f"/integrations/contacts/?{urlencode(query)}")


def _request(method, path, payload=None):
    base_url = (os.getenv("CONTACT_API_BASE") or "").rstrip("/")
    token = (os.getenv("CONTACT_API_TOKEN") or "").strip()
    timeout = float(os.getenv("CONTACT_API_TIMEOUT") or "5")

    if not base_url:
        raise ContactIntegrationError("CONTACT_API_BASE est manquant côté Calendrier.", 503)

    if not token:
        raise ContactIntegrationError("CONTACT_API_TOKEN est manquant côté Calendrier.", 503)

    body = None
    headers = {
        "Accept": "application/json",
        "X-Internal-Api-Token": token,
    }

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = Request(f"{base_url}{path}", data=body, headers=headers, method=method)

    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = _read_error_detail(exc)
        raise ContactIntegrationError(detail, exc.code) from exc
    except URLError as exc:
        raise ContactIntegrationError(f"Contact est indisponible: {exc.reason}", 502) from exc


def _read_error_detail(exc):
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return "Contact a refusé la requête."

    return payload.get("detail") or payload.get("non_field_errors", ["Contact a refusé la requête."])[0]
