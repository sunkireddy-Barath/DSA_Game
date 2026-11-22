from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import routes_auth, routes_progress, routes_run, routes_tutor
from .config import Settings, load_settings
from .context import Ctx
from .db import Database

MAX_BODY = 1_000_000


def create_app(settings: Settings | None = None, runner=None, http_client=None, trust_proxy: bool | None = None, batch_runner=None) -> FastAPI:
    settings = settings or load_settings()
    app = FastAPI(title="CS Quest API", version="1.0.0", docs_url="/api/docs" if settings.env != "prod" else None, redoc_url=None,
                  openapi_url="/api/openapi.json" if settings.env != "prod" else None)
    app.state.ctx = Ctx(settings=settings, db=Database(settings.db_path), runner=runner, batch_runner=batch_runner, http_client=http_client,
                        trust_proxy=os.environ.get("TRUST_PROXY", "0") == "1" if trust_proxy is None else trust_proxy)

    app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type", "X-Requested-With"], max_age=600)

    @app.middleware("http")
    async def guards(request: Request, call_next):
        try:
            if int(request.headers.get("content-length", "0")) > MAX_BODY:
                return JSONResponse({"detail": "request body too large"}, status_code=413)
        except ValueError:
            return JSONResponse({"detail": "bad content-length"}, status_code=400)
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        if request.url.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        return resp

    @app.exception_handler(RequestValidationError)
    async def validation(_: Request, exc: RequestValidationError):
        errs = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return JSONResponse({"detail": "invalid request", "errors": errs[:10]}, status_code=422)

    @app.get("/api/health")
    def health():
        ctx = app.state.ctx
        ok, detail = routes_run._available(ctx)
        return {"status": "ok", "version": "1.0.0", "sandbox": {"available": ok, "detail": detail},
                "tutor": {"configured": bool(ctx.settings.anthropic_api_key)}}

    for r in (routes_auth.router, routes_progress.router, routes_run.router, routes_tutor.router):
        app.include_router(r)
    logging.getLogger("csquest").info("CS Quest API ready (env=%s)", settings.env)
    return app

