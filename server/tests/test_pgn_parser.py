import unittest

from app.pgn_parser import PgnParseError, parse_pgn


class PgnParserTest(unittest.TestCase):
    def test_parses_headers_and_moves(self):
        result = parse_pgn(
            """
            [Event "Live Chess"]
            [Site "Chess.com"]
            [Date "2026.05.26"]
            [White "Ada"]
            [Black "Mikhail"]
            [Result "1-0"]

            1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0
            """
        )

        self.assertEqual(result["white"], "Ada")
        self.assertEqual(result["black"], "Mikhail")
        self.assertEqual(result["result"], "1-0")
        self.assertEqual(result["date"], "2026.05.26")
        self.assertEqual(result["event"], "Live Chess")
        self.assertEqual(result["site"], "Chess.com")
        self.assertEqual(result["totalMoves"], 3)
        self.assertEqual(result["moves"][0], {"moveNumber": 1, "white": "e4", "black": "e5"})

    def test_rejects_empty_pgn(self):
        with self.assertRaises(PgnParseError):
            parse_pgn("   ")

    def test_rejects_pgn_without_moves(self):
        with self.assertRaises(PgnParseError):
            parse_pgn('[White "Ada"]')

    def test_ignores_comments_nags_and_variations(self):
        result = parse_pgn(
            """
            [White "Ada"]
            [Black "Mikhail"]
            [Result "0-1"]

            1. d4 {Queen pawn} Nf6 $1 2. c4 (2. Nf3 e6) g6 0-1
            """
        )

        self.assertEqual(result["totalMoves"], 2)
        self.assertEqual(result["moves"][1], {"moveNumber": 2, "white": "c4", "black": "g6"})


if __name__ == "__main__":
    unittest.main()
