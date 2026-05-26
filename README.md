# CheckMateAI

CheckMateAI is an AI-powered chess game review platform that allows users to upload chess games, analyze moves, classify mistakes, and track improvement over time.

## Planned Features

- Upload or paste PGN chess games
- Analyze games using a chess engine
- Classify moves as best, excellent, good, miss, blunder, etc.
- Store past games and user analysis history
- Track common mistakes and improvement patterns
- Add AI/ML-based personalized coaching over time

## Current Feature

The first implemented slice is PGN upload and basic parsing:

- Paste a PGN in the Game Review page
- Submit it to the FastAPI backend
- Parse headers and moves
- Display a structured game summary in the frontend

No Stockfish, AI, auth, or database is included in this branch yet.

## Local Development

### Server

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

### Client

```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Tech Stack

### Client
- React
- Vite
- Tailwind CSS

### Server
- Python
- FastAPI
- python-chess
- Stockfish

### Database / Auth
- Supabase
- PostgreSQL

### Machine Learning
- scikit-learn
- pandas
- NumPy
