# Local SMTP server for tests (port 2525, STARTTLS-less, AUTH accepted for user test@example.test / pass "mail-pass-123"). Saves messages as JSON lines.
import asyncio, json, sys
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult, LoginPassword
OUT = sys.argv[1]
class H:
    async def handle_DATA(self, server, session, envelope):
        with open(OUT, "a") as f: f.write(json.dumps({"from": envelope.mail_from, "to": envelope.rcpt_tos, "data": envelope.content.decode("utf8", "replace")[:600000]}) + "\n")
        return "250 OK"
def auth(server, session, envelope, mechanism, auth_data):
    ok = isinstance(auth_data, LoginPassword) and auth_data.login == b"test@example.test" and auth_data.password == b"mail-pass-123"
    return AuthResult(success=ok)
c = Controller(H(), hostname="127.0.0.1", port=2525, authenticator=auth, auth_required=True, auth_require_tls=False)
c.start(); print("smtp sink on 2525", flush=True)
asyncio.get_event_loop().run_forever()
