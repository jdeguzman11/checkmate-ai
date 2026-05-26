import unittest

from app.stockfish_analyzer import _centipawn_loss, _read_game, _score_to_eval
from chess.engine import Cp, Mate, PovScore


class StockfishAnalyzerTest(unittest.TestCase):
    def test_read_game_rejects_invalid_moves(self):
        with self.assertRaisesRegex(Exception, "invalid or unsupported"):
            _read_game("1. e4 e5 2. DefinitelyNotAMove")

    def test_score_to_eval_returns_white_centipawns(self):
        result = _score_to_eval(PovScore(Cp(34), True))

        self.assertEqual(result, {"type": "cp", "cp": 34, "mate": None})

    def test_score_to_eval_returns_mate(self):
        result = _score_to_eval(PovScore(Mate(2), True))

        self.assertEqual(result["type"], "mate")
        self.assertEqual(result["mate"], 2)

    def test_centipawn_loss_is_from_player_perspective(self):
        before = {"type": "cp", "cp": 50, "mate": None}
        after = {"type": "cp", "cp": 20, "mate": None}

        self.assertEqual(_centipawn_loss(before, after, "white"), 30)
        self.assertEqual(_centipawn_loss(before, after, "black"), 0)


if __name__ == "__main__":
    unittest.main()
