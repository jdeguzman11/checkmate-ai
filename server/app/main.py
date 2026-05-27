from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .game_storage import (
    GameStorageError,
    GameStorageNotConfiguredError,
    get_game,
    list_games,
    save_game,
)
from .pgn_parser import PgnParseError, parse_pgn
from .stockfish_analyzer import StockfishAnalysisError, analyze_pgn


app = FastAPI(title="CheckMateAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ParsePgnRequest(BaseModel):
    pgn: str = Field(..., min_length=1)


class AnalyzePgnRequest(ParsePgnRequest):
    depth: int = Field(default=8, ge=1, le=20)
    max_moves: int | None = Field(default=None, ge=1, le=300)


class SaveGameRequest(BaseModel):
    pgn: str = Field(..., min_length=1)
    analysis_result: dict = Field(...)


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


@app.post("/api/analyze-pgn")
def analyze_pgn_endpoint(payload: AnalyzePgnRequest):
    if not payload.pgn.strip():
        raise HTTPException(status_code=400, detail="Please paste a PGN game before submitting.")

    try:
        return analyze_pgn(payload.pgn, depth=payload.depth, max_moves=payload.max_moves)
    except PgnParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except StockfishAnalysisError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/games")
def save_game_endpoint(payload: SaveGameRequest):
    if not payload.pgn.strip():
        raise HTTPException(status_code=400, detail="Cannot save a game without PGN text.")

    try:
        return save_game(payload.pgn, payload.analysis_result)
    except GameStorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GameStorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/games")
def list_games_endpoint():
    try:
        return list_games()
    except GameStorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GameStorageError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/games/{game_id}")
def get_game_endpoint(game_id: str):
    try:
        return get_game(game_id)
    except GameStorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GameStorageError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
