import io
import os
from typing import Any

import chess
import chess.engine
import chess.pgn

from .pgn_parser import PgnParseError, parse_pgn


DEFAULT_STOCKFISH_PATH = "stockfish"
MATE_SCORE = 100_000


class StockfishAnalysisError(RuntimeError):
    pass


def analyze_pgn(
    pgn: str,
    *,
    depth: int = 8,
    max_moves: int | None = None,
    engine_path: str | None = None,
) -> dict[str, Any]:
    parsed_game = parse_pgn(pgn)
    game = _read_game(pgn)
    path = engine_path or os.getenv("STOCKFISH_PATH", DEFAULT_STOCKFISH_PATH)

    try:
        engine = chess.engine.SimpleEngine.popen_uci(path)
    except FileNotFoundError as exc:
        raise StockfishAnalysisError(
            "Stockfish was not found. Install Stockfish or set STOCKFISH_PATH to the engine binary."
        ) from exc
    except PermissionError as exc:
        raise StockfishAnalysisError("Stockfish could not be started because the binary is not executable.") from exc
    except chess.engine.EngineError as exc:
        raise StockfishAnalysisError("Stockfish could not be started.") from exc

    engine_name = _engine_name(engine)

    try:
        analysis = _analyze_moves(engine, game, depth=depth, max_moves=max_moves)
    finally:
        engine.quit()

    return {
        "game": parsed_game,
        "engine": {
            "name": engine_name,
            "depth": depth,
        },
        "analysis": analysis,
    }


def _read_game(pgn: str) -> chess.pgn.Game:
    parsed_game = parse_pgn(pgn)
    game = chess.pgn.read_game(io.StringIO(pgn.strip()))

    if game is None:
        raise PgnParseError("No chess game was found in the submitted PGN.")

    if game.errors:
        raise PgnParseError("The submitted PGN contains invalid or unsupported chess moves.")

    legal_moves = list(game.mainline_moves())

    if not legal_moves:
        raise PgnParseError("No chess moves were found in the submitted PGN.")

    if len(legal_moves) != _parsed_ply_count(parsed_game):
        raise PgnParseError("The submitted PGN contains invalid or unsupported chess moves.")

    return game


def _parsed_ply_count(parsed_game: dict[str, Any]) -> int:
    return sum(1 for move in parsed_game["moves"] for side in ("white", "black") if move[side])


def _analyze_moves(
    engine: chess.engine.SimpleEngine,
    game: chess.pgn.Game,
    *,
    depth: int,
    max_moves: int | None,
) -> list[dict[str, Any]]:
    board = game.board()
    limit = chess.engine.Limit(depth=depth)
    rows: list[dict[str, Any]] = []

    for ply_index, move in enumerate(game.mainline_moves()):
        if max_moves is not None and ply_index >= max_moves:
            break

        side_to_move = "white" if board.turn == chess.WHITE else "black"
        move_number = board.fullmove_number
        played_san = board.san(move)
        before_info = engine.analyse(board, limit)
        best_move = _best_move(board, before_info)
        before_eval = _score_to_eval(before_info["score"])

        board.push(move)
        after_info = engine.analyse(board, limit)
        after_eval = _score_to_eval(after_info["score"])

        rows.append(
            {
                "ply": ply_index + 1,
                "moveNumber": move_number,
                "side": side_to_move,
                "move": played_san,
                "uci": move.uci(),
                "bestMove": best_move,
                "evaluationBefore": before_eval,
                "evaluationAfter": after_eval,
                "centipawnLoss": _centipawn_loss(before_eval, after_eval, side_to_move),
            }
        )

    return rows


def _best_move(board: chess.Board, info: dict[str, Any]) -> dict[str, str] | None:
    pv = info.get("pv")
    if not pv:
        return None

    best = pv[0]
    return {
        "san": board.san(best),
        "uci": best.uci(),
    }


def _score_to_eval(score: chess.engine.PovScore) -> dict[str, int | str | None]:
    white_score = score.white()
    mate = white_score.mate()

    return {
        "type": "mate" if mate is not None else "cp",
        "cp": white_score.score(mate_score=MATE_SCORE),
        "mate": mate,
    }


def _centipawn_loss(
    before_eval: dict[str, int | str | None],
    after_eval: dict[str, int | str | None],
    side: str,
) -> int | None:
    before_cp = before_eval.get("cp")
    after_cp = after_eval.get("cp")

    if not isinstance(before_cp, int) or not isinstance(after_cp, int):
        return None

    multiplier = 1 if side == "white" else -1
    loss = (before_cp * multiplier) - (after_cp * multiplier)
    return max(0, loss)


def _engine_name(engine: chess.engine.SimpleEngine) -> str:
    name = engine.id.get("name") if engine.id else None
    return name or "Stockfish"
