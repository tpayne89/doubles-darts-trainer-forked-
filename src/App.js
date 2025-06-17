import "./styles.css";
import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const doubles = Array.from({ length: 20 }, (_, i) => i + 1);

export default function App() {
  const [count, setCount] = useState(null);
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
  const [leaderboard, setLeaderboard] = useState(() => {
    const stored = localStorage.getItem("leaderboard");
    return stored ? JSON.parse(stored) : [];
  });

  const currentDouble = doubles[currentIndex];
  const ignoreAutoSubmitRef = useRef(false);
  const dingAudioRef = useRef(new Audio("/ding-126626.mp3"));

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

  // UPDATED visitor count fetch from Netlify function
  useEffect(() => {
    fetch("/.netlify/functions/visitorCount")
      .then((res) => res.json())
      .then((data) => {
        console.log("Visitor count:", data);
        setCount(data.value);
      })
      .catch((err) => console.error("Visitor count error:", err));
  }, []);

  const logThrow = (result) => {
    if (pendingThrows.length >= 3) return;
  
    // Use the current double at time of throw
    const doubleForThisThrow = doubles[currentIndex];
  
    const newThrow = { result, double: doubleForThisThrow };
    setPendingThrows([...pendingThrows, newThrow]);
  
    if (result === "hit" && currentIndex < doubles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const skipCurrentDouble = () => {
    // Add the current double to skippedDoubles
    setSkippedDoubles((prev) => [...prev, doubles[currentIndex]]);
  
    // Move current double forward immediately
    if (currentIndex < doubles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  
    // DO NOT clear pendingThrows here
    // So pendingThrows remain visible for the new double
  };
  
  

  const undo = () => {
    if (pendingThrows.length > 0) {
      const lastThrow = pendingThrows[pendingThrows.length - 1];
      setPendingThrows(pendingThrows.slice(0, -1));
      if (lastThrow.result === "hit" && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
      ignoreAutoSubmitRef.current = true;
    } else if (submittedRounds.length > 0) {
      const lastRound = submittedRounds[submittedRounds.length - 1];
      setSubmittedRounds(submittedRounds.slice(0, -1));
      setThrows(throws.slice(0, -lastRound.length));
      setPendingThrows(lastRound);
      const hitsInLastRound = lastRound.filter(
        (t) => t.result === "hit"
      ).length;
      setCurrentIndex((prev) => Math.max(0, prev - hitsInLastRound));
      ignoreAutoSubmitRef.current = true;
    }
  };

  const submitThrows = () => {
    if (soundOn) dingAudioRef.current.play();
    if (pendingThrows.length === 0) {
      const misses = Array(3).fill({ result: "miss", double: currentDouble });
      setThrows([...throws, ...misses]);
      setSubmittedRounds([...submittedRounds, misses]);
    } else {
      setThrows([...throws, ...pendingThrows]);
      setSubmittedRounds([...submittedRounds, pendingThrows]);
    }
    setPendingThrows([]);

    if (currentDouble === 20 && pendingThrows.some((t) => t.result === "hit")) {
      setShowUsernamePrompt(true);
    }
  };

  const allThrows = [...throws, ...pendingThrows];
  const hits = allThrows.filter((t) => t.result === "hit").length;
  const misses = allThrows.filter((t) => t.result === "miss").length;
  const total = allThrows.length;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "-";

  const statsByDouble = doubles.map((double) => {
    const throwsForDouble = allThrows.filter(
      (t) => t.double === double && t.result !== "skip"
    );
    const attempts = throwsForDouble.length;

    if (skippedDoubles.includes(double)) {
      // Show attempts but no hit rate because it was skipped
      return { double, attempts, rate: "-" };
    }

    const hits = throwsForDouble.filter((t) => t.result === "hit").length;
    const rate = attempts > 0 ? ((hits / attempts) * 100).toFixed(1) : "-";

    return { double, attempts, rate };
  });

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

    const statsHeaders = [["Double", "Attempts", "Hit Rate"]];
    const statsData = statsByDouble.map(({ double, attempts, rate }) => [
      `D${double}`,
      attempts.toString(),
      `${rate}%`,
    ]);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: statsHeaders,
      body: statsData,
    });

    const logHeaders = [["Throw 1", "Throw 2", "Throw 3"]];
    const logData = submittedRounds.map((round) =>
      round.map((t) =>
        t.result === "hit" ? `Hit D${t.double}` : `Miss D${t.double}`
      )
    );
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: logHeaders,
      body: logData,
    });

    doc.save("darts-results.pdf");
  };

  const toggleLabel = (visible) => `${visible ? "▼ Hide" : "▶ Show"}`;

  const handleUsernameSubmit = () => {
    const entry = { username, darts: total };
    const updated = [...leaderboard, entry]
      .sort((a, b) => a.darts - b.darts)
      .slice(0, 10);
    setLeaderboard(updated);
    localStorage.setItem("leaderboard", JSON.stringify(updated));
    setShowUsernamePrompt(false);
    setUsername("");
  };

  return (
    <div className="app-container">
      {/* Visitor counter in top-left */}
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

      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <button onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      <h1 className="title">Darts Doubles Trainer</h1>
      <h2 className="subtitle">
        Target: <strong>D{currentDouble}</strong>
      </h2>

      <div className="toggle-container">
        <button
          onClick={() => setShowTopStats(!showTopStats)}
          className="toggle-button"
        >
          {toggleLabel(showTopStats)} top stats
        </button>
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
          const text = t ? (t.result === "hit" ? "Hit" : "Miss") : "-";
          return (
            <div key={i} className={`throw-box ${bg}`}>
              {text}
            </div>
          );
        })}
      </div>

      <div className="button-group">
        <button
          onClick={() => logThrow("miss")}
          disabled={pendingThrows.length >= 3}
        >
          Miss
        </button>
        <button
          onClick={() => logThrow("hit")}
          disabled={pendingThrows.length >= 3}
        >
          D{currentDouble}
        </button>
        <button onClick={submitThrows}>Submit</button>
      </div>

      <div
        className="undo-group"
        style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}
      >
        <button className="skip-button" onClick={skipCurrentDouble}>Skip</button>
        <button
          onClick={undo}
          disabled={pendingThrows.length === 0 && submittedRounds.length === 0}
        >
          Undo
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <button onClick={printResults} className="print-button">
          Print Results
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="print-button"
        >
          My Scores
        </button>
      </div>

      {showUsernamePrompt && (
        <div className="modal">
          <div className="modal-content">
            <h3>Enter your name for the leaderboard</h3>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button onClick={handleUsernameSubmit}>Submit</button>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div className="modal">
          <div className="modal-content">
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{ float: "right" }}
            >
              X
            </button>
            <h3>My Scores (Fewest Darts)</h3>
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Darts</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i}>
                    <td>{entry.username}</td>
                    <td>{entry.darts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="toggle-container">
        <button
          onClick={() => setShowStatsTable(!showStatsTable)}
          className="toggle-button"
        >
          {toggleLabel(showStatsTable)} stats table
        </button>
        <button
          onClick={() => setShowLogTable(!showLogTable)}
          className="toggle-button"
        >
          {toggleLabel(showLogTable)} log
        </button>
      </div>

      {showStatsTable && (
        <table className="stats-table">
          <thead>
            <tr>
              <th>Double</th>
              <th>Attempts</th>
              <th>Hit Rate</th>
            </tr>
          </thead>
          <tbody>
            {statsByDouble.map(({ double, attempts, rate }) => (
              <tr key={double}>
                <td>D{double}</td>
                <td>{attempts}</td>
                <td style={{ color: getHitRateColor(rate) }}>{rate}%</td>
              </tr>
            ))}
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
            {submittedRounds.map((round, i) => (
              <tr key={i}>
                {round.map((t, j) => (
                  <td
                    key={j}
                    style={{ color: t.result === "hit" ? "green" : "red" }}
                  >
                    {t.result === "hit"
                      ? `Hit D${t.double}`
                      : `Miss D${t.double}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
