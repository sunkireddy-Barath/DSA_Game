from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from .context import COOKIE, Ctx, client_ip, csrf_guard, ctx_of, current_user
from .security import DUMMY_HASH, hash_password, new_token, token_digest, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"], dependencies=[Depends(csrf_guard)])

FAIL_LIMIT, FAIL_WINDOW = 5, 15 * 60


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class Registration(Credentials):
    displayName: str = Field(default="", max_length=40)


def _start_session(ctx: Ctx, response: Response, user_id: int) -> None:
    token = new_token()
    now = int(time.time())
    with ctx.db.conn() as c:
        c.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
        c.execute("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                  (token_digest(token), user_id, now, now + ctx.settings.session_days * 86400))
    response.set_cookie(COOKIE, token, max_age=ctx.settings.session_days * 86400, httponly=True,
                        samesite="lax", secure=ctx.settings.cookie_secure, path="/")


@router.post("/register", status_code=201)
def register(body: Registration, request: Request, response: Response):
    ctx = ctx_of(request)
    if not ctx.limiter.allow(f"register:{client_ip(request)}", ctx.settings.register_limit, 3600):
        raise HTTPException(429, "too many sign-ups from this address, try again later")
    email = body.email.lower()
    name = body.displayName.strip() or email.split("@")[0][:40]
    with ctx.db.conn() as c:
        if c.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
            raise HTTPException(409, "an account with this e-mail already exists")
        cur = c.execute("INSERT INTO users (email, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?)",
                        (email, name, hash_password(body.password), int(time.time())))
        uid = cur.lastrowid
    _start_session(ctx, response, uid)
    return {"id": uid, "email": email, "displayName": name}


@router.post("/login")
def login(body: Credentials, request: Request, response: Response):
    ctx = ctx_of(request)
    email = body.email.lower()
    ip_key, mail_key = f"login-ip:{client_ip(request)}", f"login-fail:{email}"
    if ctx.limiter.count(mail_key, FAIL_WINDOW) >= FAIL_LIMIT or not ctx.limiter.allow(ip_key, 60, FAIL_WINDOW):
        raise HTTPException(429, "too many attempts, try again in a few minutes", headers={"Retry-After": str(ctx.limiter.retry_after(mail_key, FAIL_WINDOW) or 60)})
    with ctx.db.conn() as c:
        row = c.execute("SELECT id, email, display_name, pw_hash FROM users WHERE email = ?", (email,)).fetchone()
    ok = verify_password(body.password, row["pw_hash"] if row else DUMMY_HASH)  # always one hash check: equal timing for unknown e-mails
    if not row or not ok:
        ctx.limiter.record(mail_key)
        raise HTTPException(401, "incorrect e-mail or password")
    ctx.limiter.reset(mail_key)
    _start_session(ctx, response, row["id"])
    return {"id": row["id"], "email": row["email"], "displayName": row["display_name"]}


@router.post("/logout")
def logout(request: Request, response: Response):
    ctx = ctx_of(request)
    token = request.cookies.get(COOKIE)
    if token:
        with ctx.db.conn() as c:
            c.execute("DELETE FROM sessions WHERE token_hash = ?", (token_digest(token),))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return user
