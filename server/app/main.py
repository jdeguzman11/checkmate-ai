from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .pgn_parser import PgnParseError, parse_pgn


app = FastAPI(title="CheckMateAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParsePgnRequest(BaseModel):
    pgn: str = Field(..., min_length=1)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/parse-pgn")
def parse_pgn_endpoint(payload: ParsePgnRequest):
    if not payload.pgn.strip():
        raise HTTPException(status_code=400, detail="Please paste a PGN game before submitting.")

    try:
        return parse_pgn(payload.pgn)
    except PgnParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
