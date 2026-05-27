import unittest

from app.move_classifier import classify_move


class MoveClassifierTest(unittest.TestCase):
    def test_classifies_centipawn_thresholds(self):
        cases = [
            (0, "Best"),
            (10, "Best"),
            (11, "Excellent"),
            (35, "Excellent"),
            (36, "Good"),
            (75, "Good"),
            (76, "Inaccuracy"),
            (150, "Inaccuracy"),
            (151, "Mistake"),
            (300, "Mistake"),
            (301, "Blunder"),
        ]

        for centipawn_loss, label in cases:
            with self.subTest(centipawn_loss=centipawn_loss):
                self.assertEqual(classify_move({"centipawnLoss": centipawn_loss})["label"], label)

    def test_handles_mate_style_evaluations_without_crashing(self):
        result = classify_move(
            {
                "side": "white",
                "centipawnLoss": None,
                "evaluationBefore": {"type": "mate", "cp": 100000, "mate": 1},
                "evaluationAfter": {"type": "mate", "cp": 99980, "mate": 2},
            }
        )

        self.assertEqual(result["label"], "Excellent")
        self.assertEqual(result["reason"], "mate_or_unavailable")

    def test_defaults_unavailable_evaluations_to_good(self):
        result = classify_move({"centipawnLoss": None})

        self.assertEqual(result["label"], "Good")


if __name__ == "__main__":
    unittest.main()
