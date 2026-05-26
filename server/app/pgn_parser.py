import re
from typing import Any


HEADER_PATTERN = re.compile(r'^\[(\w+)\s+"(.*)"\]\s*$')
RESULT_TOKENS = {"1-0", "0-1", "1/2-1/2", "*"}


class PgnParseError(ValueError):
    pass


def parse_pgn(pgn: str) -> dict[str, Any]:
    cleaned_pgn = pgn.strip()
    if not cleaned_pgn:
        raise PgnParseError("Please paste a PGN game before submitting.")

    headers, move_text = _split_headers_and_moves(cleaned_pgn)
    moves = _parse_moves(move_text)

    if not moves:
        raise PgnParseError("No chess moves were found in the submitted PGN.")

    result = headers.get("Result") or _extract_result(move_text) or "*"
    full_moves = _group_full_moves(moves)

    return {
        "white": headers.get("White", "Unknown"),
        "black": headers.get("Black", "Unknown"),
        "result": result,
        "date": headers.get("Date", "Unknown"),
        "event": headers.get("Event", "Unknown"),
        "site": headers.get("Site", "Unknown"),
        "opening": headers.get("Opening", "Unknown"),
        "totalMoves": len(full_moves),
        "moves": full_moves,
        "headers": headers,
    }


def _split_headers_and_moves(pgn: str) -> tuple[dict[str, str], str]:
    headers: dict[str, str] = {}
    move_lines: list[str] = []

    for line in pgn.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        header_match = HEADER_PATTERN.match(stripped)
        if header_match and not move_lines:
            headers[header_match.group(1)] = header_match.group(2)
            continue

        move_lines.append(stripped)

    return headers, " ".join(move_lines)


def _parse_moves(move_text: str) -> list[str]:
    normalized = _strip_pgn_annotations(move_text)
    tokens = normalized.split()
    moves: list[str] = []

    for token in tokens:
        token = token.strip()
        if not token:
            continue
        if token in RESULT_TOKENS:
            continue
        if re.fullmatch(r"\d+\.(\.\.)?", token):
            continue
        if re.fullmatch(r"\d+\.+", token):
            continue

        token = re.sub(r"^\d+\.(\.\.)?", "", token)
        token = token.strip()

        if token and token not in RESULT_TOKENS:
            moves.append(token)

    return moves


def _strip_pgn_annotations(move_text: str) -> str:
    without_braces = re.sub(r"\{[^}]*\}", " ", move_text)
    without_semicolon_comments = re.sub(r";[^\n\r]*", " ", without_braces)
    without_variations = _remove_parenthesized_text(without_semicolon_comments)
    without_nags = re.sub(r"\$\d+", " ", without_variations)
    return without_nags


def _remove_parenthesized_text(text: str) -> str:
    result: list[str] = []
    depth = 0

    for char in text:
        if char == "(":
            depth += 1
            continue
        if char == ")" and depth:
            depth -= 1
            continue
        if depth == 0:
            result.append(char)

    return "".join(result)


def _extract_result(move_text: str) -> str | None:
    for token in reversed(move_text.split()):
        if token in RESULT_TOKENS:
            return token
    return None


def _group_full_moves(moves: list[str]) -> list[dict[str, str | int | None]]:
    full_moves: list[dict[str, str | int | None]] = []

    for index in range(0, len(moves), 2):
        full_moves.append(
            {
                "moveNumber": index // 2 + 1,
                "white": moves[index],
                "black": moves[index + 1] if index + 1 < len(moves) else None,
            }
        )

    return full_moves
