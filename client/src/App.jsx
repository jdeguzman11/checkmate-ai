import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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
  const [storageMessage, setStorageMessage] = useState("");
  const [savedGames, setSavedGames] = useState([]);
  const [isLoadingSavedGames, setIsLoadingSavedGames] = useState(false);
  const [isSavingGame, setIsSavingGame] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const canSubmit = useMemo(() => pgn.trim().length > 0 && !isSubmitting, [pgn, isSubmitting]);
  const currentUser = session?.user ?? null;

  useEffect(() => {
    if (!supabase) {
      setStorageMessage("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable saved games.");
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSavedGames([]);
      setStorageMessage("");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadSavedGames(session);
    }
  }, [session]);

  async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        ...(options.headers ?? {}),
      },
      ...options,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail ?? "Request failed.");
    }

    return data;
  }

  async function loadSavedGames() {
    if (!session) {
      setSavedGames([]);
      setStorageMessage("Sign in to load your saved games.");
      return;
    }

    setIsLoadingSavedGames(true);
    setStorageMessage("");

    try {
      const data = await requestJson("/api/games", {
        accessToken: session.access_token,
      });
      setSavedGames(data);
    } catch (requestError) {
      setStorageMessage(requestError.message);
    } finally {
      setIsLoadingSavedGames(false);
    }
  }

  async function handleSaveGame() {
    if (!analysisResult) {
      return;
    }
    if (!session) {
      setStorageMessage("Sign in to save reviewed games.");
      return;
    }

    setIsSavingGame(true);
    setStorageMessage("");

    try {
      await requestJson("/api/games", {
        method: "POST",
        accessToken: session.access_token,
        body: JSON.stringify({
          pgn,
          analysis_result: analysisResult,
        }),
      });
      await loadSavedGames(session);
      setStorageMessage("Game saved.");
    } catch (requestError) {
      setStorageMessage(requestError.message);
    } finally {
      setIsSavingGame(false);
    }
  }

  async function handleLoadSavedGame(gameId) {
    if (!session) {
      setStorageMessage("Sign in to load saved games.");
      return;
    }

    setError("");
    setStorageMessage("");

    try {
      const savedGame = await requestJson(`/api/games/${gameId}`, {
        accessToken: session.access_token,
      });
      setPgn(savedGame.pgn);
      setParsedGame(savedGame.analysis_json.game);
      setAnalysisResult(savedGame.analysis_json);
      setStorageMessage("Saved review loaded.");
    } catch (requestError) {
      setStorageMessage(requestError.message);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!supabase) {
      setAuthMessage("Supabase auth is not configured in the frontend.");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthMessage("");

    try {
      const authAction =
        authMode === "signup"
          ? supabase.auth.signUp({ email, password })
          : supabase.auth.signInWithPassword({ email, password });
      const { data, error: authError } = await authAction;

      if (authError) {
        throw authError;
      }

      setSession(data.session);
      setAuthMessage(authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in.");
      setPassword("");
    } catch (requestError) {
      setAuthMessage(requestError.message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setSavedGames([]);
    setStorageMessage("Signed out.");
  }

  async function handleSubmit(event, mode = "parse") {
    event.preventDefault();
    setError("");
    setStorageMessage("");
    setParsedGame(null);
    setAnalysisResult(null);

    if (!pgn.trim()) {
      setError("Please paste a PGN game before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "analyze" ? "/api/analyze-pgn" : "/api/parse-pgn";
      const data = await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify({ pgn }),
      });

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

        <SavedGamesPanel
          games={savedGames}
          isLoading={isLoadingSavedGames}
          message={storageMessage}
          currentUser={currentUser}
          authConfigured={Boolean(supabase)}
          authMode={authMode}
          email={email}
          password={password}
          authMessage={authMessage}
          isAuthSubmitting={isAuthSubmitting}
          onAuthModeChange={setAuthMode}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onAuthSubmit={handleAuthSubmit}
          onSignOut={handleSignOut}
          onRefresh={() => loadSavedGames(session)}
          onSelect={handleLoadSavedGame}
        />
      </section>

      <section className="result-section" aria-live="polite">
        {parsedGame ? (
          <ParsedGameSummary
            game={parsedGame}
            analysisResult={analysisResult}
            isSavingGame={isSavingGame}
            currentUser={currentUser}
            onSaveGame={handleSaveGame}
          />
        ) : (
          <EmptyResult />
        )}
      </section>
    </main>
  );
}

function SavedGamesPanel({
  games,
  isLoading,
  message,
  currentUser,
  authConfigured,
  authMode,
  email,
  password,
  authMessage,
  isAuthSubmitting,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onAuthSubmit,
  onSignOut,
  onRefresh,
  onSelect,
}) {
  return (
    <aside className="saved-panel" aria-label="Saved games">
      <div className="field-header">
        <h2>Saved games</h2>
        <button type="button" className="text-button" onClick={onRefresh} disabled={!currentUser}>
          Refresh
        </button>
      </div>

      <AuthPanel
        authConfigured={authConfigured}
        currentUser={currentUser}
        authMode={authMode}
        email={email}
        password={password}
        authMessage={authMessage}
        isAuthSubmitting={isAuthSubmitting}
        onAuthModeChange={onAuthModeChange}
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onAuthSubmit={onAuthSubmit}
        onSignOut={onSignOut}
      />

      {message ? <p className="storage-message">{message}</p> : null}

      {isLoading ? <p className="saved-empty">Loading saved games...</p> : null}

      {!isLoading && currentUser && games.length === 0 ? (
        <p className="saved-empty">Your saved reviews will appear here.</p>
      ) : null}

      <div className="saved-list">
        {games.map((game) => (
          <button type="button" className="saved-game" key={game.id} onClick={() => onSelect(game.id)}>
            <span>
              {game.white_player} vs {game.black_player}
            </span>
            <small>
              {game.result} · {game.game_date ?? "Unknown date"}
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function AuthPanel({
  authConfigured,
  currentUser,
  authMode,
  email,
  password,
  authMessage,
  isAuthSubmitting,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onAuthSubmit,
  onSignOut,
}) {
  if (!authConfigured) {
    return <p className="saved-empty">Set frontend Supabase env vars to sign in.</p>;
  }

  if (currentUser) {
    return (
      <div className="auth-status">
        <div>
          <span>Signed in</span>
          <strong>{currentUser.email}</strong>
        </div>
        <button type="button" className="text-button" onClick={onSignOut}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={onAuthSubmit}>
      <div className="auth-tabs">
        <button
          type="button"
          className={authMode === "login" ? "active" : ""}
          onClick={() => onAuthModeChange("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={authMode === "signup" ? "active" : ""}
          onClick={() => onAuthModeChange("signup")}
        >
          Sign up
        </button>
      </div>
      <input
        type="email"
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        placeholder="Password"
        required
      />
      {authMessage ? <p className="auth-message">{authMessage}</p> : null}
      <button className="primary-button" type="submit" disabled={isAuthSubmitting}>
        {isAuthSubmitting ? "Working..." : authMode === "signup" ? "Create account" : "Log in"}
      </button>
    </form>
  );
}

function EmptyResult() {
  return (
    <div className="empty-result">
      <h2>Game review</h2>
      <p>Analyze a PGN to see game details, move quality counts, and a move-by-move review.</p>
    </div>
  );
}

function ParsedGameSummary({ game, analysisResult, isSavingGame, currentUser, onSaveGame }) {
  if (analysisResult) {
    return (
      <GameReview
        game={game}
        analysisResult={analysisResult}
        isSavingGame={isSavingGame}
        currentUser={currentUser}
        onSaveGame={onSaveGame}
      />
    );
  }

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

function GameReview({ game, analysisResult, isSavingGame, currentUser, onSaveGame }) {
  const labelCounts = getLabelCounts(analysisResult.analysis);

  return (
    <div className="review-panel">
      <header className="review-header">
        <div>
          <p className="eyebrow">Game Review</p>
          <h2>
            {game.white} vs {game.black}
          </h2>
          <p className="review-meta">
            {game.result} · {game.date} · {game.event}
          </p>
        </div>
        <div className="engine-pill">
          {analysisResult.engine.name} · Depth {analysisResult.engine.depth}
        </div>
        <button type="button" className="save-button" onClick={onSaveGame} disabled={isSavingGame || !currentUser}>
          {currentUser ? (isSavingGame ? "Saving..." : "Save review") : "Sign in to save"}
        </button>
      </header>

      <section className="scoreboard" aria-label="Move summary">
        {LABEL_ORDER.map((label) => (
          <div className={`score-card score-card-${slugify(label)}`} key={label}>
            <span>{label}</span>
            <strong>{labelCounts[label] ?? 0}</strong>
          </div>
        ))}
      </section>

      <section className="review-list-section" aria-labelledby="move-review-heading">
        <div className="section-heading">
          <h3 id="move-review-heading">Move List</h3>
          <span>{analysisResult.analysis.length} analyzed moves</span>
        </div>

        <div className="move-review-list">
          {analysisResult.analysis.map((move) => (
            <MoveReviewItem move={move} key={move.ply} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MoveReviewItem({ move }) {
  const label = move.classification?.label ?? "Good";
  const isBlackMove = move.side === "black";

  return (
    <article className={`move-review-item move-tone-${toneForLabel(label)}`}>
      <div className="move-main">
        <div className="move-index">
          {move.moveNumber}
          {isBlackMove ? "..." : "."}
        </div>
        <div className="move-played">
          <strong>{move.move}</strong>
          <span>{move.side}</span>
        </div>
        <span className={`move-label move-label-${slugify(label)}`}>{label}</span>
      </div>

      <div className="move-details">
        <div>
          <span>Before</span>
          <strong>{formatEvaluation(move.evaluationBefore)}</strong>
        </div>
        <div>
          <span>After</span>
          <strong>{formatEvaluation(move.evaluationAfter)}</strong>
        </div>
        <div>
          <span>Best</span>
          <strong>{move.bestMove?.san ?? "N/A"}</strong>
        </div>
        <div>
          <span>CP loss</span>
          <strong>{move.centipawnLoss ?? "N/A"}</strong>
        </div>
      </div>
    </article>
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

const LABEL_ORDER = ["Best", "Excellent", "Good", "Inaccuracy", "Mistake", "Blunder"];

function getLabelCounts(analysis) {
  return analysis.reduce(
    (counts, move) => {
      const label = move.classification?.label ?? "Good";
      return {
        ...counts,
        [label]: (counts[label] ?? 0) + 1,
      };
    },
    Object.fromEntries(LABEL_ORDER.map((label) => [label, 0])),
  );
}

function toneForLabel(label) {
  if (label === "Inaccuracy" || label === "Mistake" || label === "Blunder") {
    return "warning";
  }

  return "positive";
}

export default App;
