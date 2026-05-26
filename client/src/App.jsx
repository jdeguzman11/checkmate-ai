import React, { useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const SAMPLE_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.05.26"]
[White "Ada Lovelace"]
[Black "Mikhail Tal"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

function App() {
  const [pgn, setPgn] = useState("");
  const [parsedGame, setParsedGame] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => pgn.trim().length > 0 && !isSubmitting, [pgn, isSubmitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setParsedGame(null);

    if (!pgn.trim()) {
      setError("Please paste a PGN game before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/parse-pgn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pgn }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Unable to parse that PGN.");
      }

      setParsedGame(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="review-layout" aria-labelledby="game-review-title">
        <div className="review-copy">
          <p className="eyebrow">Game Review</p>
          <h1 id="game-review-title">Upload a Chess Game</h1>
          <p className="intro">
            Paste a PGN to extract the basic game details and move list. Engine analysis comes later.
          </p>
        </div>

        <form className="pgn-panel" onSubmit={handleSubmit}>
          <div className="field-header">
            <label htmlFor="pgn-input">PGN</label>
            <button type="button" className="text-button" onClick={() => setPgn(SAMPLE_PGN)}>
              Use sample
            </button>
          </div>
          <textarea
            id="pgn-input"
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            placeholder='[Event "Live Chess"]&#10;[White "Player 1"]&#10;[Black "Player 2"]&#10;&#10;1. e4 e5 2. Nf3 Nc6'
            rows="14"
          />
          {error ? <p className="error-message">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Parsing..." : "Review PGN"}
          </button>
        </form>
      </section>

      <section className="result-section" aria-live="polite">
        {parsedGame ? <ParsedGameSummary game={parsedGame} /> : <EmptyResult />}
      </section>
    </main>
  );
}

function EmptyResult() {
  return (
    <div className="empty-result">
      <h2>Parsed game summary</h2>
      <p>Submit a PGN to see player names, result, date, event, site, and moves.</p>
    </div>
  );
}

function ParsedGameSummary({ game }) {
  const details = [
    ["White", game.white],
    ["Black", game.black],
    ["Result", game.result],
    ["Date", game.date],
    ["Event", game.event],
    ["Site", game.site],
    ["Opening", game.opening],
    ["Total moves", game.totalMoves],
  ];

  return (
    <div className="summary-panel">
      <div className="summary-heading">
        <h2>Parsed game summary</h2>
        <span>{game.totalMoves} moves</span>
      </div>

      <dl className="detail-grid">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? "Unknown"}</dd>
          </div>
        ))}
      </dl>

      <div className="moves-table-wrap">
        <table className="moves-table">
          <thead>
            <tr>
              <th>Move</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {game.moves.map((move) => (
              <tr key={move.moveNumber}>
                <td>{move.moveNumber}</td>
                <td>{move.white}</td>
                <td>{move.black ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
