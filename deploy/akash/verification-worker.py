"""Public-safe Akash digest worker. No files, credentials, models or tool execution."""
import hashlib
import json
import os
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LIMIT = 8192
lock = threading.Lock()
requests = {}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, data):
        body = json.dumps(data, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/", "/health"):
            self.reply(200, {"service": "Ghost Ops / Akash verification worker", "version": "1", "scope": "Public sanitized receipt digests only; no privileged backend", "at": datetime.now(timezone.utc).isoformat()})
        else:
            self.reply(404, {"error": "Unknown route"})

    def do_POST(self):
        if self.path != "/verify":
            self.reply(404, {"error": "Unknown route"})
            return
        now = time.monotonic()
        with lock:
            for key in list(requests):
                if now - requests[key][0] > 60:
                    del requests[key]
            key = self.client_address[0]
            previous, count = requests.get(key, (now, 0))
            if count >= 20 or key not in requests and len(requests) >= 64:
                self.reply(429, {"error": "Bounded request limit"})
                return
            requests[key] = (previous, count + 1)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= LIMIT or self.headers.get("Content-Type") != "application/json":
                raise ValueError()
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict) or set(value) != {"nonce", "expectedSha256", "artifact"}:
                raise ValueError()
            uuid.UUID(value["nonce"])
            if not re.fullmatch(r"[0-9a-f]{64}", value["expectedSha256"]):
                raise ValueError()
            artifact = value["artifact"]
            if not isinstance(artifact, dict) or set(artifact) != {"investigationId", "guildSessionId", "clickhouseReceiptId", "eventCount", "serverVersion"}:
                raise ValueError()
            for field in ("investigationId", "guildSessionId", "clickhouseReceiptId"):
                uuid.UUID(artifact[field])
            if type(artifact["eventCount"]) is not int or not 0 < artifact["eventCount"] <= 200 or not re.fullmatch(r"[0-9.]{1,32}", artifact["serverVersion"]):
                raise ValueError()
            digest = hashlib.sha256(json.dumps(artifact, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()).hexdigest()
            verified = digest == value["expectedSha256"]
            self.reply(200 if verified else 422, {"verified": verified, "sha256": digest, "nonce": value["nonce"], "investigationId": artifact["investigationId"], "verificationId": str(uuid.uuid4()), "executedAt": datetime.now(timezone.utc).isoformat(), "runtime": "python / Akash worker", "scope": "Digest consistency only; not signer authenticity"})
        except (ValueError, TypeError, KeyError, AttributeError):
            self.reply(400, {"error": "Strict bounded receipt schema required"})

ThreadingHTTPServer((os.environ.get("HOST", "0.0.0.0"), int(os.environ.get("PORT", "3000"))), Handler).serve_forever()
