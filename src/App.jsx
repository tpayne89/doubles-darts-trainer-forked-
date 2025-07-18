import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import AppSingles from "./AppSingles";
import AppSinglesSkip from "./AppSinglesSkip";
import AppDoubles from "./AppDoubles";
import AppTrebles from "./AppTrebles";
import "./styles.css";

import { analyticsPromise } from "./firebase"; // your firebase.js exports this
import { logEvent } from "firebase/analytics";

const LEADERBOARD_KEYS = {
  "Singles (End)": "leaderboard_singles_end",
  "Singles (Bull)": "leaderboard_singles_bull",
  "Singles (Inner Bull)": "leaderboard_singles_inner",
  "Singles Skip (End)": "leaderboard_singles_skip_end",
  "Singles Skip (Bull)": "leaderboard_singles_skip_bull",
  "Singles Skip (Inner Bull)": "leaderboard_singles_skip_inner",
  "Doubles (End)": "leaderboard_doubles_end",
  "Doubles (Bull)": "leaderboard_doubles_bull",
  "Doubles (Inner Bull)": "leaderboard_doubles_inner",
  "Trebles (End)": "leaderboard_trebles_end",
  "Trebles (Bull)": "leaderboard_trebles_bull",
  "Trebles (Inner Bull)": "leaderboard_trebles_inner",
};

export default function App() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("doubles");
  const [enableSkips, setEnableSkips] = useState(false);
  const [endOption, setEndOption] = useState("end");

  const options = { enableSkips, endOption };

  // MIGRATION: On first load, migrate old "leaderboard" data to new key "leaderboard_doubles_end"
  useEffect(() => {
    const oldKey = "leaderboard";
    const newKey = LEADERBOARD_KEYS["Doubles (End)"];
    if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
      try {
        const oldData = localStorage.getItem(oldKey);
        localStorage.setItem(newKey, oldData);
        localStorage.removeItem(oldKey);
        console.log("Migrated old leaderboard data to new key:", newKey);
      } catch (e) {
        console.error("Error migrating leaderboard data:", e);
      }
    }
  }, []);

  // Leaderboard dropdown state, default to Doubles (End) to show migrated data easily
  const [selectedLeaderboard, setSelectedLeaderboard] =
    useState("Doubles (End)");
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Load leaderboard data when selectedLeaderboard changes
  useEffect(() => {
    const key = LEADERBOARD_KEYS[selectedLeaderboard];
    if (!key) {
      setLeaderboardData([]);
      return;
    }
    const stored = localStorage.getItem(key);
    setLeaderboardData(stored ? JSON.parse(stored) : []);
  }, [selectedLeaderboard]);

  // Log app load event once
  useEffect(() => {
    analyticsPromise.then((analytics) => {
      if (analytics) {
        logEvent(analytics, "app_loaded");
      }
    });
  }, []);

  // Log mode/options change event whenever they change
  useEffect(() => {
    analyticsPromise.then((analytics) => {
      if (analytics) {
        logEvent(analytics, "mode_changed", {
          mode,
          enableSkips,
          endOption,
        });
      }
    });
  }, [mode, enableSkips, endOption]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="setup-page">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                paddingTop: "1rem",
              }}
            >
              <div
                className="app-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  justifyContent: "center",
                }}
              >
                <img
                  src="/favicons/web-app-manifest-512x512.png"
                  alt="Darts Icon"
                  style={{ width: 40, height: 40 }}
                />
                <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>
                  Darts Training
                </h1>
              </div>

              <div className="setup-box">
                <div className="section game-mode-section">
                  <h2 className="section-title">Select Game Mode</h2>
                  <div className="button-group-setup">
                    {["singles", "doubles", "trebles"].map((m) => (
                      <button
                        key={m}
                        className={`classic-button ${
                          mode === m ? "selected" : ""
                        }`}
                        onClick={() => setMode(m)}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === "singles" && (
                  <div className="section enable-skip-section">
                    <h3 className="section-title">Skip for Doubles/Trebles?</h3>
                    <div className="button-group-skipsetup">
                      <button
                        className={`classic-button ${
                          enableSkips ? "selected" : ""
                        }`}
                        onClick={() => setEnableSkips(true)}
                      >
                        Yes
                      </button>
                      <button
                        className={`classic-button ${
                          !enableSkips ? "selected" : ""
                        }`}
                        onClick={() => setEnableSkips(false)}
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}

                <div className="section end-option-section">
                  <h3 className="section-title">What happens after 20?</h3>
                  <div className="button-group-setupend">
                    <button
                      className={`classic-button ${
                        endOption === "end" ? "selected" : ""
                      }`}
                      onClick={() => setEndOption("end")}
                    >
                      End game
                    </button>
                    <button
                      className={`classic-button ${
                        endOption === "bull" ? "selected" : ""
                      }`}
                      onClick={() => setEndOption("bull")}
                    >
                      Outer + Inner Bull
                    </button>
                    <button
                      className={`classic-button ${
                        endOption === "inner" ? "selected" : ""
                      }`}
                      onClick={() => setEndOption("inner")}
                    >
                      Bull only
                    </button>
                  </div>
                </div>

                <div className="section start-button-section">
                  <button
                    className="start-button"
                    onClick={() => {
                      if (mode === "singles") {
                        navigate(enableSkips ? "/singles-skip" : "/singles");
                      } else {
                        navigate(`/${mode}`);
                      }
                    }}
                  >
                    Start Game
                  </button>
                </div>

                <div
                  className="section leaderboard-section"
                  style={{ marginTop: "2rem" }}
                >
                  <label
                    htmlFor="leaderboard-select"
                    style={{ fontWeight: "bold" }}
                  >
                    Select Leaderboard:
                  </label>
                  <select
                    id="leaderboard-select"
                    value={selectedLeaderboard}
                    onChange={(e) => setSelectedLeaderboard(e.target.value)}
                    style={{ marginLeft: "0.5rem", padding: "0.25rem" }}
                  >
                    {Object.keys(LEADERBOARD_KEYS).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <div
                    style={{
                      marginTop: "1rem",
                      maxHeight: "300px",
                      overflowY: "auto",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      padding: "0.5rem",
                      background: "#fafafa",
                    }}
                  >
                    {leaderboardData.length === 0 ? (
                      <p>No scores saved for this leaderboard yet.</p>
                    ) : (
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                        className="leaderboard-table"
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                borderBottom: "1px solid #ccc",
                                padding: "0.25rem",
                              }}
                            >
                              Rank
                            </th>
                            <th
                              style={{
                                borderBottom: "1px solid #ccc",
                                padding: "0.25rem",
                              }}
                            >
                              Name
                            </th>
                            <th
                              style={{
                                borderBottom: "1px solid #ccc",
                                padding: "0.25rem",
                              }}
                            >
                              Darts
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboardData.map((entry, i) => (
                            <tr
                              key={i}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <td style={{ padding: "0.25rem" }}>{i + 1}</td>
                              <td style={{ padding: "0.25rem" }}>
                                {entry.username}
                              </td>
                              <td style={{ padding: "0.25rem" }}>
                                {entry.darts}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <Route path="/singles" element={<AppSingles options={options} />} />
      <Route
        path="/singles-skip"
        element={<AppSinglesSkip options={options} />}
      />
      <Route path="/doubles" element={<AppDoubles options={options} />} />
      <Route path="/trebles" element={<AppTrebles options={options} />} />
    </Routes>
  );
}
