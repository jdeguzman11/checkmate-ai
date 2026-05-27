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
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => pgn.trim().length > 0 && !isSubmitting, [pgn, isSubmitting]);

  async function handleSubmit(event, mode = "parse") {
    event.preventDefault();
    setError("");
    setParsedGame(null);
    setAnalysisResult(null);

    if (!pgn.trim()) {
      setError("Please paste a PGN game before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "analyze" ? "/api/analyze-pgn" : "/api/parse-pgn";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

      if (mode === "analyze") {
        setParsedGame(data.game);
        setAnalysisResult(data);
      } else {
        setParsedGame(data);
      }
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
          <p className="intro">Paste a PGN to extract the game details or run raw Stockfish analysis.</p>
        </div>

        <form className="pgn-panel" onSubmit={(event) => handleSubmit(event, "parse")}>
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
          <div className="action-row">
            <button className="secondary-button" type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Working..." : "Parse PGN"}
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={!canSubmit}
              onClick={(event) => handleSubmit(event, "analyze")}
            >
              {isSubmitting ? "Analyzing..." : "Analyze with Stockfish"}
            </button>
          </div>
        </form>
      </section>

      <section className="result-section" aria-live="polite">
        {parsedGame ? (
          <ParsedGameSummary game={parsedGame} analysisResult={analysisResult} />
        ) : (
          <EmptyResult />
        )}
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

function ParsedGameSummary({ game, analysisResult }) {
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

      {analysisResult ? <EngineAnalysisTable analysisResult={analysisResult} /> : null}
    </div>
  );
}

function EngineAnalysisTable({ analysisResult }) {
  return (
    <div className="analysis-section">
      <div className="summary-heading">
        <h2>Stockfish analysis</h2>
        <span>Depth {analysisResult.engine.depth}</span>
      </div>
      <div className="moves-table-wrap">
        <table className="moves-table">
          <thead>
            <tr>
              <th>Move</th>
              <th>Played</th>
              <th>Label</th>
              <th>Eval before</th>
              <th>Eval after</th>
              <th>Best move</th>
              <th>CP loss</th>
            </tr>
          </thead>
          <tbody>
            {analysisResult.analysis.map((move) => (
              <tr key={move.ply}>
                <td>
                  {move.moveNumber}
                  {move.side === "black" ? "..." : "."}
                </td>
                <td>{move.move}</td>
                <td>
                  <span className={`move-label move-label-${slugify(move.classification?.label)}`}>
                    {move.classification?.label ?? "Good"}
                  </span>
                </td>
                <td>{formatEvaluation(move.evaluationBefore)}</td>
                <td>{formatEvaluation(move.evaluationAfter)}</td>
                <td>{move.bestMove?.san ?? ""}</td>
                <td>{move.centipawnLoss ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatEvaluation(evaluation) {
  if (evaluation.type === "mate") {
    return `M${evaluation.mate}`;
  }

  const pawns = evaluation.cp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function slugify(value = "") {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export default App;
