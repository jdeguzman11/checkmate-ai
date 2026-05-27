from typing import Any


def classify_move(analysis_row: dict[str, Any]) -> dict[str, str | int | None]:
    centipawn_loss = analysis_row.get("centipawnLoss")

    if isinstance(centipawn_loss, int):
        return {
            "label": _label_for_centipawn_loss(centipawn_loss),
            "reason": "centipawn_loss",
            "centipawnLoss": centipawn_loss,
        }

    return {
        "label": _label_for_mate_change(
            analysis_row.get("evaluationBefore"),
            analysis_row.get("evaluationAfter"),
            analysis_row.get("side"),
        ),
        "reason": "mate_or_unavailable",
        "centipawnLoss": None,
    }


def _label_for_centipawn_loss(centipawn_loss: int) -> str:
    if centipawn_loss <= 10:
        return "Best"
    if centipawn_loss <= 35:
        return "Excellent"
    if centipawn_loss <= 75:
        return "Good"
    if centipawn_loss <= 150:
        return "Inaccuracy"
    if centipawn_loss <= 300:
        return "Mistake"
    return "Blunder"


def _label_for_mate_change(
    before_eval: dict[str, Any] | None,
    after_eval: dict[str, Any] | None,
    side: str | None,
) -> str:
    before_cp = _evaluation_cp(before_eval)
    after_cp = _evaluation_cp(after_eval)

    if before_cp is None or after_cp is None or side not in {"white", "black"}:
        return "Good"

    multiplier = 1 if side == "white" else -1
    loss = (before_cp * multiplier) - (after_cp * multiplier)

    if loss >= 300:
        return "Blunder"
    if loss >= 151:
        return "Mistake"
    if loss >= 76:
        return "Inaccuracy"
    if loss >= 36:
        return "Good"
    if loss >= 11:
        return "Excellent"
    return "Best"


def _evaluation_cp(evaluation: dict[str, Any] | None) -> int | None:
    if not evaluation:
        return None

    cp = evaluation.get("cp")
    return cp if isinstance(cp, int) else None
