import unittest
from unittest.mock import patch

from app.game_storage import (
    GameStorageNotConfiguredError,
    _normalize_supabase_url,
    build_game_record,
    list_games,
)


class GameStorageTest(unittest.TestCase):
    def test_build_game_record_extracts_summary_fields(self):
        analysis_result = {
            "game": {
                "white": "Ada",
                "black": "Mikhail",
                "result": "1-0",
                "date": "2026.05.26",
            },
            "analysis": [{"move": "e4"}],
        }

        record = build_game_record("1. e4", analysis_result)

        self.assertEqual(record["white_player"], "Ada")
        self.assertEqual(record["black_player"], "Mikhail")
        self.assertEqual(record["result"], "1-0")
        self.assertEqual(record["game_date"], "2026-05-26")
        self.assertEqual(record["pgn"], "1. e4")
        self.assertEqual(record["analysis_json"], analysis_result)

    def test_build_game_record_handles_unknown_date(self):
        analysis_result = {"game": {"date": "????.??.??"}}

        record = build_game_record("1. e4", analysis_result)

        self.assertIsNone(record["game_date"])

    def test_list_games_requires_supabase_configuration(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaisesRegex(GameStorageNotConfiguredError, "Saved games are not configured"):
                list_games()

    def test_normalize_supabase_url_accepts_base_or_rest_url(self):
        self.assertEqual(
            _normalize_supabase_url("https://example.supabase.co/rest/v1/"),
            "https://example.supabase.co",
        )
        self.assertEqual(
            _normalize_supabase_url("https://example.supabase.co"),
            "https://example.supabase.co",
        )


if __name__ == "__main__":
    unittest.main()
