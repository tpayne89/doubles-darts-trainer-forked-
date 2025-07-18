import "./styles.css";
import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import DartboardHighlight from "./DartboardHighlight";
import DartboardHeatmap from "./DartboardHeatmap";
import { useNavigate } from "react-router-dom";

export default function AppDoubles({ options }) {
  const navigate = useNavigate();
  const { endOption = "end", enableSkips = false } = options || {};
  const formatDoubleLabel = (d) => {
    if (d === undefined || d === null) return "";
    if (d === 50) return "Bull";
    if (d === 25) return "25";
    return `D${d}`;
  };

  // Base doubles 1-20
  const doubles = Array.from({ length: 20 }, (_, i) => i + 1);

  // Bulls (standard scoring)
  const bulls = { outer: 25, inner: 50 };

  // Compose targets based on endOption
  let targets = [...doubles];
  if (endOption === "bull") {
    targets = [...targets, bulls.outer, bulls.inner];
  } else if (endOption === "inner") {
    targets = [...targets, bulls.inner];
  }

  const [count, setCount] = useState(null);
  const [flash, setFlash] = useState(null); // null or color string
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
  const [skippedDoubles, setSkippedDoubles] = useState([]);
  const leaderboardKey = `leaderboard_doubles_${endOption}`;
  const [leaderboard, setLeaderboard] = useState(() => {
    const stored = localStorage.getItem(leaderboardKey);
    return stored ? JSON.parse(stored) : [];
  });

  const currentTarget = targets[currentIndex];
  const finalTarget = targets[targets.length - 1];
  const isGameOver = showUsernamePrompt || currentIndex >= targets.length;
  const ignoreAutoSubmitRef = useRef(false);
  const dingAudioRef = useRef(new Audio("/ding-126626.mp3"));

  const getEndOptionLabel = (endOption) => {
    switch (endOption) {
      case "end":
        return "to D20";
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showUsernamePrompt || showLeaderboard) return;

      switch (e.key) {
        case "Enter":
          submitThrows();
          break;
        case "s":
        case "S":
          skipCurrentTarget();
          break;
        case "h":
        case "H":
          if (pendingThrows.length < 3) logThrow("hit");
          break;
        case "m":
        case "M":
          if (pendingThrows.length < 3) logThrow("miss");
          break;
        case "Backspace":
          e.preventDefault();
          undo();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingThrows, currentIndex, showUsernamePrompt, showLeaderboard]);

  // Visitor count fetch
  useEffect(() => {
    fetch("/.netlify/functions/visitorCount")
      .then((res) => res.json())
      .then((data) => {
        setCount(data.value);
      })
      .catch((err) => console.error("Visitor count error:", err));
  }, []);

  const logThrow = (result) => {
    if (pendingThrows.length >= 3) return;
    if (isGameOver) return;

    const newThrow = { result, double: currentTarget };
    const newPending = [...pendingThrows, newThrow];
    setPendingThrows(newPending);

    if (result === "hit") {
      setCurrentIndex(currentIndex + 1);

      if (currentTarget === finalTarget) {
        setShowUsernamePrompt(true);
      }
    }
  };

  const skipCurrentTarget = () => {
    setFlash("#800080");
    setTimeout(() => setFlash(null), 300);
    setSkippedDoubles((prev) => [...prev, currentTarget]);
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const undo = () => {
    if (pendingThrows.length > 0) {
      const lastThrow = pendingThrows[pendingThrows.length - 1];
      const updatedThrows = pendingThrows.slice(0, -1);

      if (lastThrow.result === "hit" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }

      setPendingThrows(updatedThrows);
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
      const misses = Array(3).fill({ result: "miss", double: currentTarget });
      setThrows([...throws, ...misses]);
      setSubmittedRounds([...submittedRounds, misses]);
    } else {
      setThrows([...throws, ...pendingThrows]);
      setSubmittedRounds([...submittedRounds, pendingThrows]);
    }

    if (soundOn) dingAudioRef.current.play();
    setFlash("#2196f3");
    setTimeout(() => setFlash(null), 300);

    // Determine if any hit in this round
    const hitThisRound = pendingThrows.some((t) => t.result === "hit");
    // Find last hit throw, if any
    const lastHitThrow = [...pendingThrows]
      .reverse()
      .find((t) => t.result === "hit");

    setPendingThrows([]);

    // Show username prompt only if last hit throw corresponds to last target
    if (
      hitThisRound &&
      lastHitThrow &&
      lastHitThrow.double === targets[targets.length - 1]
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
    const throwsForTarget = allThrows.filter(
      (t) => t.double === target && t.result !== "skip"
    );
    const attempts = throwsForTarget.length;

    if (skippedDoubles.includes(target)) {
      return { double: target, attempts, rate: "-" };
    }

    const hits = throwsForTarget.filter((t) => t.result === "hit").length;
    const rate = attempts > 0 ? ((hits / attempts) * 100).toFixed(1) : "-";

    return { double: target, attempts, rate };
  });

  // Determine highest target with any attempts
  const highestTargetWithAttempts = (() => {
    for (let i = targets.length - 1; i >= 0; i--) {
      const target = targets[i];
      const attemptsForTarget = allThrows.filter(
        (t) => t.double === target && t.result !== "skip"
      ).length;
      if (attemptsForTarget > 0) {
        return target;
      }
    }
    return 0;
  })();

  // Add cumulative attempts conditionally
  const statsWithCumulative = statsByTarget.map(
    ({ double, attempts, rate }, i) => {
      if (double > highestTargetWithAttempts) {
        return { double, attempts: 0, rate: "-", cumulative: 0 };
      }
      const cumulative = statsByTarget
        .slice(0, i + 1)
        .reduce((sum, item) => sum + item.attempts, 0);
      return { double, attempts, rate, cumulative };
    }
  );

  const getHitRateColor = (rateStr) => {
    if (rateStr === "-") return "#ccc";
    const rate = parseFloat(rateStr);
    if (rate >= 10) {
      const g = Math.min(255, Math.round(100 + ((rate - 10) / 90) * 100));
      return `rgb(0,${g},0)`;
    } else if (rate >= 5) {
      const ratio = (rate - 5) / 5;
      const g = Math.round(120 + ratio * 80);
      return `rgb(255,${g},0)`;
    } else if (rate >= 0) {
      const r = Math.round(150 + (rate / 5) * 105);
      return `rgb(${r},0,0)`;
    } else {
      return "#ccc";
    }
  };

  const printResults = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text("Darts Doubles Trainer Results", 14, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${dateStr}`, 14, 30);

    const headlineStats = [
      ["Hits", hits.toString()],
      ["Misses", misses.toString()],
      ["Darts Thrown", total.toString()],
      ["Hit Rate", `${hitRate}%`],
    ];

    headlineStats.push([
      "Doubles Skipped",
      `${skippedDoubles.length} (${skippedDoubles
        .map((d) => formatDoubleLabel(d))
        .join(", ")})`,
    ]);

    const roundLengths = submittedRounds.map((r) => r.length);
    const sorted = [...roundLengths].sort((a, b) => a - b);
    let median = "-";
    if (sorted.length > 0) {
      const mid = Math.floor(sorted.length / 2);
      median =
        sorted.length % 2 === 0
          ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1)
          : sorted[mid].toString();
      headlineStats.push(["Median Darts per Round", median]);
    }

    autoTable(doc, {
      startY: 40,
      head: [["Stat", "Value"]],
      body: headlineStats,
    });

    const statsHeaders = [["Double", "Attempts (Cumulative)", "Hit Rate"]];
    const statsData = statsWithCumulative.map(
      ({ double, attempts, cumulative, rate }) => [
        formatDoubleLabel(double), // ✅ USE THIS
        `${attempts} (${cumulative})`,
        `${rate}%`,
      ]
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: statsHeaders,
      body: statsData,
    });

    const logHeaders = [["Throw 1", "Throw 2", "Throw 3"]];
    const logData = submittedRounds.map((round) =>
      round.map((t) =>
        t.result === "hit"
          ? `Hit ${formatDoubleLabel(t.double)}`
          : `Miss ${formatDoubleLabel(t.double)}`
      )
    );

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: logHeaders,
      body: logData,
    });

    // Add heatmap image converted from SVG to high-res PNG using canvas
    if (heatmapRef.current) {
      const svgElement = heatmapRef.current.querySelector("svg");
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const svgWidth = 300;
        const svgHeight = 215;
        const aspectRatio = svgWidth / svgHeight;

        const canvasHeight = 600;
        const canvasWidth = canvasHeight * aspectRatio;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        const pngDataUrl = canvas.toDataURL("image/png");

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgDisplayHeight = 100;
        const imgDisplayWidth = imgDisplayHeight * aspectRatio;
        const x = (pageWidth - imgDisplayWidth) / 2;
        const y = doc.lastAutoTable.finalY + 10;

        if (y + imgDisplayHeight > pageHeight) {
          doc.addPage();
          doc.addImage(
            pngDataUrl,
            "PNG",
            x,
            10,
            imgDisplayWidth,
            imgDisplayHeight
          );
        } else {
          doc.addImage(
            pngDataUrl,
            "PNG",
            x,
            y,
            imgDisplayWidth,
            imgDisplayHeight
          );
        }
        doc.save("darts-results.pdf");
        URL.revokeObjectURL(url);
      };

      img.onerror = (err) => {
        console.error("Image load error:", err);
        doc.save("darts-results.pdf"); // fallback
      };

      img.src = url;
    } else {
      doc.save("darts-results.pdf");
    }
  };

  const toggleLabel = (visible) => `${visible ? "▼ Hide" : "▶ Show"}`;

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

  return (
    <div className="app-container">
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
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

      <h1 className="title">Darts Doubles Trainer</h1>

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
        <div style={{ width: "100px", height: "60px" }}>
          <DartboardHighlight
            currentDouble={currentTarget}
            flashColor={flash}
          />
        </div>

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
              ? formatDoubleLabel(t.double)
              : "Miss"
            : "-";

          return (
            <div key={i} className={`throw-box ${bg}`}>
              {text}
            </div>
          );
        })}
      </div>

      <div className="button-group-container">
        <div className="button-group-doubles">
          <button
            className="miss-button"
            onClick={() => logThrow("miss")}
            disabled={pendingThrows.length >= 3 || isGameOver}
          >
            Miss
          </button>
          <button
            className="hit-button"
            onClick={() => logThrow("hit")}
            disabled={pendingThrows.length >= 3 || isGameOver}
          >
            {formatDoubleLabel(currentTarget)}
          </button>
          <button
            className="submit-button"
            onClick={submitThrows}
            disabled={isGameOver && pendingThrows.length === 0}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="undo-group-container">
        <div className="undo-group-doubles">
          <button
            className="skip-button"
            onClick={skipCurrentTarget}
            disabled={isGameOver}
          >
            Skip
          </button>
          <button
            onClick={undo}
            disabled={
              pendingThrows.length === 0 && submittedRounds.length === 0
            }
          >
            Undo
          </button>
        </div>
      </div>

      <div className="print-buttons-container">
        <div className="button-group-utility">
          <button className="print-button" onClick={printResults}>
            Print Results
          </button>
          <button
            className="print-button"
            onClick={() => setShowLeaderboard((prev) => !prev)}
          >
            My Scores
          </button>
        </div>
      </div>

      {/* Username Prompt Modal */}
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

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Leaderboard – Doubles ({getEndOptionLabel(endOption)})</h2>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Darts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={3}>No entries yet</td>
                  </tr>
                )}
                {leaderboard.map((entry, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{entry.username}</td>
                    <td>{entry.darts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Stats Table */}
      {showStatsTable && (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Double</th>
              <th>Attempts (Cumulative)</th>
              <th>Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            {statsWithCumulative.map(
              ({ double, attempts, cumulative, rate }) => (
                <tr key={double} style={{ color: getHitRateColor(rate) }}>
                  <td>{formatDoubleLabel(double)}</td>
                  <td>{`${attempts} (${cumulative})`}</td>
                  <td>{rate === "-" ? "-" : `${rate}%`}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {/* Log Table */}
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
                      ? `Hit ${formatDoubleLabel(t.double)}`
                      : `Miss ${formatDoubleLabel(t.double)}`}
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
        style={{
          marginTop: "0rem",
          maxWidth: "300px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {showHeatmap && (
          <DartboardHeatmap
            stats={statsByTarget} // or statsWithCumulative
            mode="D"
          />
        )}
      </div>
    </div>
  );
}
