import "./styles.css";
import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import DartboardHighlight from "./DartboardHighlight";
import DartboardHeatmap from "./DartboardHeatmap";
import { useNavigate } from "react-router-dom";

export default function AppSinglesSkip({ options }) {
  const navigate = useNavigate();
  const { endOption = "end" } = options || {};
  const formatLabel = (s) => (s === 50 ? "Bull" : s === 25 ? "25" : `S${s}`);
  const formatSingleLabel = formatLabel;

  const singles = Array.from({ length: 20 }, (_, i) => i + 1);
  const bulls = { outer: 25, inner: 50 };
  let targets = [...singles];
  if (endOption === "bull") {
    targets = [...targets, bulls.outer, bulls.inner];
  } else if (endOption === "inner") {
    targets = [...targets, bulls.inner];
  }

  const [count, setCount] = useState(null);
  const [flash, setFlash] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const heatmapRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [throws, setThrows] = useState([]);
  const [pendingThrows, setPendingThrows] = useState([]);
  const [submittedRounds, setSubmittedRounds] = useState([]);
  const [showTopStats, setShowTopStats] = useState(true);
  const [showStatsTable, setShowStatsTable] = useState(true);
  const [showLogTable, setShowLogTable] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [username, setUsername] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [skippedSingles, setSkippedSingles] = useState([]);
  const leaderboardKey = `leaderboard_singles_skip_${endOption}`;
  const [leaderboard, setLeaderboard] = useState(() => {
    const stored = localStorage.getItem(leaderboardKey);
    return stored ? JSON.parse(stored) : [];
  });

  const currentTarget = targets[currentIndex];
  const multiplierPrefix = (m) => (m === 2 ? "D" : m === 3 ? "T" : "S");
  const ignoreAutoSubmitRef = useRef(false);
  const dingAudioRef = useRef(new Audio("/ding-126626.mp3"));

  const getEndOptionLabel = (endOption) => {
    switch (endOption) {
      case "end":
        return "to S20";
      case "bull":
        return "25 + Bull";
      case "inner":
        return "Bull";
      default:
        return endOption;
    }
  };

  // Auto-submit after 3 throws
  useEffect(() => {
    if (pendingThrows.length === 3) {
      if (ignoreAutoSubmitRef.current) {
        ignoreAutoSubmitRef.current = false;
        return;
      }
      if (soundOn) dingAudioRef.current.play();
      submitThrows();
    }
  }, [pendingThrows]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showUsernamePrompt || showLeaderboard) return;
      if (pendingThrows.length >= 3) return;

      switch (e.key.toLowerCase()) {
        case "m":
          logThrow("miss");
          break;
        case "s":
          logThrow("single");
          break;
        case "d":
          logThrow("double");
          break;
        case "t":
          logThrow("treble");
          break;
        case "enter":
          submitThrows();
          break;
        case "backspace":
          e.preventDefault();
          undo();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingThrows, currentIndex, showLeaderboard]);

  useEffect(() => {
    fetch("/.netlify/functions/visitorCount")
      .then((res) => res.json())
      .then((data) => setCount(data.value))
      .catch((err) => console.error("Visitor count error:", err));
  }, []);

  const logThrow = (type) => {
    if (
      isGameOver ||
      pendingThrows.length >= 3 ||
      currentIndex >= targets.length
    )
      return;

    let result;
    let skips = 0;
    if (type === "miss") {
      // For miss, do not advance currentIndex
      result = { result: "miss", single: currentTarget };
      // currentIndex stays the same
    } else {
      // For hits, advance by multiplier skips
      const multiplier = type === "single" ? 1 : type === "double" ? 2 : 3;
      result = { result: "hit", single: currentTarget, multiplier };
      skips = multiplier - 1;
    }

    setPendingThrows([...pendingThrows, result]);

    if (type !== "miss") {
      // Add skipped targets only on hits
      const skipped = [];
      for (let i = 1; i <= skips; i++) {
        const idx = currentIndex + i;
        if (idx < targets.length) {
          skipped.push(targets[idx]);
        }
      }
      setSkippedSingles((prev) => [...prev, ...skipped]);

      // Advance currentIndex by skips + 1
      const nextIndex = currentIndex + skips + 1;

      // Trigger username prompt if this throw finishes the game
      if (nextIndex >= targets.length) {
        setShowUsernamePrompt(true);
      }

      if (nextIndex < targets.length) {
        setCurrentIndex(nextIndex);
      } else {
        setCurrentIndex(targets.length); // Advance past the end
      }
    }
    // No index update on miss, so current target remains the same
  };

  // Function to skip current target
  const skipCurrentTarget = () => {
    setFlash("#800080"); // purple flash
    setTimeout(() => setFlash(null), 300);
    setSkippedSingles((prev) => [...prev, currentTarget]);
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const undo = () => {
    if (pendingThrows.length > 0) {
      const last = pendingThrows[pendingThrows.length - 1];
      setPendingThrows(pendingThrows.slice(0, -1));
      if (last.result === "hit") {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
      ignoreAutoSubmitRef.current = true;
    } else if (submittedRounds.length > 0) {
      const lastRound = submittedRounds[submittedRounds.length - 1];
      const newSubmitted = submittedRounds.slice(0, -1);
      const newThrows = throws.slice(0, -lastRound.length);
      setSubmittedRounds(newSubmitted);
      setThrows(newThrows);
      setPendingThrows(lastRound);
      ignoreAutoSubmitRef.current = true;
    }
  };

  const submitThrows = () => {
    if (pendingThrows.length === 0) {
      const misses = Array(3).fill({ result: "miss", single: currentTarget });
      setThrows([...throws, ...misses]);
      setSubmittedRounds([...submittedRounds, misses]);
    } else {
      setThrows([...throws, ...pendingThrows]);
      setSubmittedRounds([...submittedRounds, pendingThrows]);
    }

    if (soundOn) dingAudioRef.current.play();
    setFlash("#2196f3");
    setTimeout(() => setFlash(null), 300);
    setPendingThrows([]);

    if (
      currentIndex >= targets.length - 1 &&
      pendingThrows.some((t) => t.result === "hit")
    ) {
      setShowUsernamePrompt(true);
    }
  };

  const allThrows = [...throws, ...pendingThrows];
  const hits = allThrows.filter((t) => t.result === "hit").length;
  const misses = allThrows.filter((t) => t.result === "miss").length;
  const total = allThrows.length;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "-";

  const statsByTarget = targets.map((target) => {
    const throwsForTarget = allThrows.filter((t) => t.single === target);
    const attempts = throwsForTarget.length;

    if (skippedSingles.includes(target)) {
      return { single: target, attempts, rate: "-" };
    }

    const hits = throwsForTarget.filter((t) => t.result === "hit").length;
    const rate = attempts > 0 ? ((hits / attempts) * 100).toFixed(1) : "-";
    return { single: target, attempts, rate };
  });

  const highestTargetWithAttempts = (() => {
    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i];
      const throwsForTarget = allThrows.filter((t) => t.single === target);
      if (throwsForTarget.length > 0) return target;
    }
    return 0;
  })();

  const statsWithCumulative = statsByTarget.map(
    ({ single, attempts, rate }, i) => {
      if (single > highestTargetWithAttempts) {
        return { single, attempts: 0, rate: "-", cumulative: 0 };
      }
      const cumulative = statsByTarget
        .slice(0, i + 1)
        .reduce((sum, item) => sum + item.attempts, 0);
      return { single, attempts, rate, cumulative };
    }
  );

  const getHitRateColor = (rateStr) => {
    if (rateStr === "-") return "#ccc";
    const rate = parseFloat(rateStr);
    if (rate >= 10) return `rgb(0, ${100 + ((rate - 10) / 90) * 100}, 0)`;
    if (rate >= 5) return `rgb(255, ${120 + ((rate - 5) / 5) * 80}, 0)`;
    return `rgb(${150 + (rate / 5) * 105}, 0, 0)`;
  };

  const printResults = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text("Darts Singles Trainer (Skip Mode)", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${dateStr}`, 14, 30);

    const headlineStats = [
      ["Hits", hits.toString()],
      ["Misses", misses.toString()],
      ["Darts Thrown", total.toString()],
      ["Hit Rate", `${hitRate}%`],
      [
        "Singles Skipped",
        `${skippedSingles.length} (${skippedSingles
          .map(formatSingleLabel)
          .join(", ")})`,
      ],
    ];

    const roundLengths = submittedRounds.map((r) => r.length);
    const sorted = [...roundLengths].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length > 0
        ? sorted.length % 2 === 0
          ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1)
          : sorted[mid].toString()
        : "-";
    headlineStats.push(["Median Darts per Round", median]);

    autoTable(doc, {
      startY: 40,
      head: [["Stat", "Value"]],
      body: headlineStats,
    });

    const statsTable = statsWithCumulative.map(
      ({ single, attempts, cumulative, rate }) => [
        formatSingleLabel(single),
        `${attempts} (${cumulative})`,
        `${rate}%`,
      ]
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Single", "Attempts (Cumulative)", "Hit Rate"]],
      body: statsTable,
    });

    const logData = submittedRounds.map((round) =>
      round.map((t) =>
        t.result === "hit"
          ? `Hit ${formatSingleLabel(t.single)}`
          : `Miss ${formatSingleLabel(t.single)}`
      )
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Throw 1", "Throw 2", "Throw 3"]],
      body: logData,
    });

    if (heatmapRef.current) {
      const svg = heatmapRef.current.querySelector("svg");
      const svgData = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(
        new Blob([svgData], { type: "image/svg+xml" })
      );
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 430;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngData = canvas.toDataURL("image/png");
        const x = (doc.internal.pageSize.getWidth() - 100) / 2;
        const y = doc.lastAutoTable.finalY + 10;
        doc.addImage(pngData, "PNG", x, y, 100, 70);
        doc.save("darts-skip-results.pdf");
        URL.revokeObjectURL(url);
      };
      img.onerror = () => doc.save("darts-skip-results.pdf");
      img.src = url;
    } else {
      doc.save("darts-skip-results.pdf");
    }
  };

  const handleUsernameSubmit = () => {
    const entry = { username, darts: total };
    const updated = [...leaderboard, entry]
      .sort((a, b) => a.darts - b.darts)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem(leaderboardKey, JSON.stringify(updated));
    setShowUsernamePrompt(false);
    setUsername("");
  };

  // Toggle label helper for top stats button
  const toggleLabel = (show) => (show ? "▼ Hide" : "▶ Show");

  const isGameOver = currentIndex >= targets.length;

  return (
    <div className="app-container">
      {/* Visitors count top-left */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          fontSize: "0.9rem",
          color: "#666",
        }}
      >
        Visitors: {count === null ? "Loading..." : count}
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          display: "flex",
          gap: "0.25rem",
        }}
      >
        <button
          className="home-button"
          onClick={() => navigate("/")}
          title="Home"
          style={{ fontWeight: "bold", fontSize: "1.1rem" }}
        >
          🏠
        </button>

        <button
          className="sound-toggle-button"
          onClick={() => setSoundOn(!soundOn)}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      <h1 className="title">Darts Singles Trainer (Skip Mode)</h1>
      {/* Header row with DartboardHighlight and top stats toggle button */}
      <div
        className="header-row"
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "0rem",
          paddingBottom: "0",
        }}
      >
        {/* DartboardHighlight component */}
        <div style={{ width: "100px", height: "60px" }}>
          <DartboardHighlight
            currentDouble={currentTarget}
            flashColor={flash}
            mode="singles"
          />
        </div>

        {/* Toggle top stats button on right */}
        <div
          className="toggle-container"
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            backgroundColor: "white",
            padding: "0.2rem 0.5rem",
            borderRadius: "0.3rem",
            boxShadow: "0 0 5px rgba(0,0,0,0.1)",
          }}
        >
          <button
            onClick={() => setShowTopStats(!showTopStats)}
            className="toggle-button"
          >
            {toggleLabel(showTopStats)} top stats
          </button>
        </div>
      </div>
      {/* Conditionally show top stats if toggled */}
      {showTopStats && (
        <div className="stats-grid">
          <div>
            <strong>Misses:</strong> {misses}
          </div>
          <div>
            <strong>Hits:</strong> {hits}
          </div>
          <div>
            <strong>Darts Thrown:</strong> {total}
          </div>
          <div>
            <strong>Hit Rate:</strong> {hitRate}%
          </div>
        </div>
      )}
      <div className="pending-throws">
        {[0, 1, 2].map((i) => {
          const t = pendingThrows[i];
          const bg = t ? (t.result === "hit" ? "green" : "red") : "gray";
          const text = t
            ? t.result === "hit"
              ? t.single === 50
                ? "Bull"
                : t.single === 25
                ? "25"
                : `${multiplierPrefix(t.multiplier)}${t.single}`
              : "Miss"
            : "-";

          return (
            <div key={i} className={`throw-box ${bg}`}>
              {text}
            </div>
          );
        })}
      </div>

      {/* Row 1: Singles, Doubles, Trebles */}
      <div
        className="button-row main-target-buttons"
        style={{ marginBottom: "0.5rem" }}
      >
        <button
          onClick={() => logThrow("single")}
          disabled={pendingThrows.length >= 3 || isGameOver}
        >
          {currentTarget !== undefined ? formatSingleLabel(currentTarget) : ""}
        </button>

        <button
          onClick={() => logThrow("double")}
          disabled={
            pendingThrows.length >= 3 ||
            isGameOver ||
            currentTarget === 25 ||
            currentTarget === 50 ||
            currentTarget === undefined
          }
        >
          {currentTarget !== undefined &&
          currentTarget !== 25 &&
          currentTarget !== 50
            ? `D${currentTarget}`
            : ""}
        </button>

        <button
          onClick={() => logThrow("treble")}
          disabled={
            pendingThrows.length >= 3 ||
            isGameOver ||
            currentTarget === 25 ||
            currentTarget === 50 ||
            currentTarget === undefined
          }
        >
          {currentTarget !== undefined &&
          currentTarget !== 25 &&
          currentTarget !== 50
            ? `T${currentTarget}`
            : ""}
        </button>
      </div>

      {/* Row 2: Miss and Submit */}
      <div
        className="button-row miss-submit-buttons"
        style={{ marginBottom: "0.5rem" }}
      >
        <button
          className="singleskip-miss-button"
          onClick={() => logThrow("miss")}
          disabled={pendingThrows.length >= 3}
        >
          Miss
        </button>
        <button className="singleskip-submit-button" onClick={submitThrows}>
          Submit
        </button>
      </div>
      {/* Row 3: Skip and Undo */}
      <div
        className="button-row skip-undo-buttons"
        style={{ marginBottom: "0.5rem" }}
      >
        <button className="singleskip-skip-button" onClick={skipCurrentTarget}>
          Skip
        </button>
        <button className="singleskip-undo-button" onClick={undo}>
          Undo
        </button>
      </div>
      {/* Row 4: Print Results and My Scores */}
      <div
        className="button-row print-scores-buttons"
        style={{ marginBottom: "0.5rem" }}
      >
        <button className="singleskip-print-button" onClick={printResults}>
          Print Results
        </button>
        <button
          className="singleskip-scores-button"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          My Scores
        </button>
      </div>
      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Leaderboard – Singles Skip</h2>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Darts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No entries yet</td>
                  </tr>
                ) : (
                  leaderboard.map((entry, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{entry.username}</td>
                      <td>{entry.darts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showUsernamePrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Enter your name</h2>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              autoFocus
            />
            <button
              onClick={handleUsernameSubmit}
              disabled={username.trim().length === 0}
            >
              Submit
            </button>
            <button onClick={() => setShowUsernamePrompt(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="button-group-toggles">
        <button onClick={() => setShowStatsTable(!showStatsTable)}>
          {showStatsTable ? "▼ Hide" : "▶ Show"} stats table
        </button>
        <button onClick={() => setShowLogTable(!showLogTable)}>
          {showLogTable ? "▼ Hide" : "▶ Show"} log
        </button>
        <button onClick={() => setShowHeatmap(!showHeatmap)}>
          {showHeatmap ? "▼ Hide" : "▶ Show"} heat map
        </button>
      </div>
      {showStatsTable && (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Target</th>
              <th>Attempts (Cumulative)</th>
              <th>Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            {statsWithCumulative.map(
              ({ single, attempts, cumulative, rate }) => (
                <tr key={single} style={{ color: getHitRateColor(rate) }}>
                  <td>{single === 50 ? "Bull" : single}</td>
                  <td>{`${attempts} (${cumulative})`}</td>
                  <td>{rate === "-" ? "-" : `${rate}%`}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      {showLogTable && (
        <table className="log-table">
          <thead>
            <tr>
              <th>Throw 1</th>
              <th>Throw 2</th>
              <th>Throw 3</th>
            </tr>
          </thead>
          <tbody>
            {submittedRounds.map((round, idx) => (
              <tr key={idx}>
                {round.map((t, i) => (
                  <td
                    key={i}
                    style={{
                      color: t.result === "hit" ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {t.result === "hit"
                      ? `Hit ${multiplierPrefix(t.multiplier)}${t.single}`
                      : `Miss ${formatSingleLabel(t.single)}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        ref={heatmapRef}
        className="heatmap-container"
        style={{ marginTop: "0rem", maxWidth: "300px", margin: "auto" }}
      >
        {showHeatmap && (
          <DartboardHeatmap
            stats={statsByTarget.map(({ single, attempts }) => ({
              double: single,
              attempts,
            }))}
          />
        )}
      </div>
    </div>
  );
}
