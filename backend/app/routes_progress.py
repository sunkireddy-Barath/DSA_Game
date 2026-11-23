"""Per-user progress: validated, size-capped, and merged on the server so two devices never overwrite each other."""
from __future__ import annotations

import json
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from .context import csrf_guard, ctx_of, current_user

router = APIRouter(prefix="/api/progress", tags=["progress"], dependencies=[Depends(csrf_guard)])

MAX_SOLVED, MAX_QA, MAX_ATTEMPTS, MAX_DRAFTS, MAX_DRAFT_CHARS = 2000, 2000, 2000, 200, 20000
KEY_LEN = 80


class Solved(BaseModel):
    at: int = Field(ge=0)
    attempts: int = Field(ge=0, le=100000)
    hints: int = Field(ge=0, le=1000)


class GameStat(BaseModel):
    stars: int = Field(ge=0, le=3)
    best: int = Field(ge=0, le=1_000_000)
    plays: int = Field(ge=0, le=1_000_000)


class Activity(BaseModel):
    t: int = Field(ge=0)
    text: str = Field(max_length=200)


class Pair(BaseModel):
    correct: int = Field(ge=0, le=10_000_000)
    total: int = Field(ge=0, le=10_000_000)


class Streak(BaseModel):
    last: str = Field(max_length=10, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    count: int = Field(ge=0, le=100000)


class ProgressData(BaseModel):
    xp: int = Field(default=0, ge=0, le=100_000_000)
    solved: dict[str, Solved] = {}
    attempts: dict[str, int] = {}
    drafts: dict[str, str] = {}
    qaDone: dict[str, bool] = {}
    games: dict[str, GameStat] = {}
    predictions: Pair = Pair(correct=0, total=0)
    streak: Streak = Streak(last="", count=0)
    seconds: int = Field(default=0, ge=0, le=10_000_000_000)
    last: str | None = Field(default=None, max_length=KEY_LEN)
    log: list[Activity] = Field(default=[], max_length=30)

    @field_validator("solved")
    @classmethod
    def _solved(cls, v: dict) -> dict:
        if len(v) > MAX_SOLVED or any(len(k) > KEY_LEN for k in v):
            raise ValueError("too many solved entries")
        return v

    @field_validator("attempts")
    @classmethod
    def _attempts(cls, v: dict) -> dict:
        if len(v) > MAX_ATTEMPTS or any(len(k) > KEY_LEN or not (0 <= n <= 100000) for k, n in v.items()):
            raise ValueError("invalid attempts")
        return v

    @field_validator("qaDone")
    @classmethod
    def _qa(cls, v: dict) -> dict:
        if len(v) > MAX_QA or any(len(k) > KEY_LEN for k in v):
            raise ValueError("too many answered questions")
        return v

    @field_validator("games")
    @classmethod
    def _games(cls, v: dict) -> dict:
        if len(v) > 200 or any(len(k) > KEY_LEN for k in v):
            raise ValueError("too many games")
        return v

    @field_validator("drafts")
    @classmethod
    def _drafts(cls, v: dict) -> dict:
        if len(v) > MAX_DRAFTS or any(len(k) > KEY_LEN or len(s) > MAX_DRAFT_CHARS for k, s in v.items()):
            raise ValueError("drafts too large")
        return v


class ProgressIn(BaseModel):
    data: ProgressData


def merge(server: dict[str, Any], client: dict[str, Any]) -> dict[str, Any]:
    """Union/max merge: progress only ever grows, so syncing from an older device cannot lose anything."""
    out: dict[str, Any] = {}
    out["xp"] = max(server.get("xp", 0), client.get("xp", 0))
    solved = dict(server.get("solved", {}))
    for k, v in client.get("solved", {}).items():
        solved[k] = v if k not in solved or v["at"] < solved[k]["at"] else solved[k]
    out["solved"] = solved
    att = dict(server.get("attempts", {}))
    for k, n in client.get("attempts", {}).items():
        att[k] = max(att.get(k, 0), n)
    out["attempts"] = att
    out["qaDone"] = {**server.get("qaDone", {}), **client.get("qaDone", {})}
    games = dict(server.get("games", {}))
    for k, g in client.get("games", {}).items():
        o = games.get(k)
        games[k] = g if o is None else {m: max(o[m], g[m]) for m in ("stars", "best", "plays")}
    out["games"] = games
    sp, cp = server.get("predictions", {"correct": 0, "total": 0}), client.get("predictions", {"correct": 0, "total": 0})
    out["predictions"] = {"correct": max(sp["correct"], cp["correct"]), "total": max(sp["total"], cp["total"])}
    ss, cs = server.get("streak", {"last": "", "count": 0}), client.get("streak", {"last": "", "count": 0})
    out["streak"] = cs if (cs["last"], cs["count"]) >= (ss["last"], ss["count"]) else ss
    out["seconds"] = max(server.get("seconds", 0), client.get("seconds", 0))
    out["last"] = client.get("last") or server.get("last")
    log = {(a["t"], a["text"]): a for a in [*server.get("log", []), *client.get("log", [])]}
    out["log"] = sorted(log.values(), key=lambda a: -a["t"])[:30]
    out["drafts"] = {**server.get("drafts", {}), **client.get("drafts", {})}
    if len(out["drafts"]) > MAX_DRAFTS:
        out["drafts"] = dict(list(out["drafts"].items())[-MAX_DRAFTS:])
    return out


def _load(ctx, uid: int) -> tuple[dict[str, Any], int]:
    with ctx.db.conn() as c:
        row = c.execute("SELECT data, updated_at FROM progress WHERE user_id = ?", (uid,)).fetchone()
    if not row:
        return ProgressData().model_dump(), 0
    return json.loads(row["data"]), row["updated_at"]


@router.get("")
def get_progress(request: Request, user: dict = Depends(current_user)):
    data, updated = _load(ctx_of(request), user["id"])
    return {"data": data, "updatedAt": updated}


@router.put("")
def put_progress(body: ProgressIn, request: Request, user: dict = Depends(current_user)):
    ctx = ctx_of(request)
    if not ctx.limiter.allow(f"progress:{user['id']}", 120, 60):
        raise HTTPException(429, "too many sync requests")
    server, _ = _load(ctx, user["id"])
    merged = ProgressData(**merge(server, body.data.model_dump())).model_dump()
    raw = json.dumps(merged, separators=(",", ":"))
    if len(raw) > 900_000:
        raise HTTPException(413, "progress is too large")
    now = int(time.time())
    with ctx.db.conn() as c:
        c.execute("INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
                  (user["id"], raw, now))
    return {"data": merged, "updatedAt": now}


@router.delete("")
def delete_progress(request: Request, user: dict = Depends(current_user)):
    """Erase this account's saved progress (the 'Reset progress' button). Merging never shrinks progress, so a reset needs this."""
    with ctx_of(request).db.conn() as c:
        c.execute("DELETE FROM progress WHERE user_id = ?", (user["id"],))
    return {"ok": True}
