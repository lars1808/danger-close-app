// src/App.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import SquadTable from "./features/squad/SquadTable";
import LogTab from "./features/log/LogTab";
import MissionSetup, {
  MISSION_STORAGE_KEY,
  normalizeMission,
} from "./features/mission/MissionSetup";
import EngagementTab from "./features/engagement/EngagementTab";
import "./styles/danger-close.css";
import * as T from "./features/squad/types";

type TabName = "squad" | "mission" | "engagement" | "log";
type Theme = "default" | "terminal";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("squad");
  const [logEntries, setLogEntries] = useState<T.LogEntry[]>([]);
  const [logAttention, setLogAttention] = useState(false);
  const logAttentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [mission, setMission] = useState<T.Mission>(() => {
    const saved = localStorage.getItem(MISSION_STORAGE_KEY);
    return saved ? normalizeMission(JSON.parse(saved)) : normalizeMission(undefined);
  });
  const [currentSectorId, setCurrentSectorId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("dc-theme");
    return (saved as Theme) || "default";
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "terminal") {
      root.classList.add("theme-terminal");
    } else {
      root.classList.remove("theme-terminal");
    }
    localStorage.setItem("dc-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(mission));
  }, [mission]);

  useEffect(() => {
    if (currentSectorId === null) {
      return;
    }

    if (mission.sectors.some((sector) => sector.id === currentSectorId)) {
      return;
    }

    setCurrentSectorId(null);
  }, [mission.sectors, currentSectorId]);

  const triggerLogAttention = useCallback(() => {
    setLogAttention(true);
    if (logAttentionTimeoutRef.current) {
      clearTimeout(logAttentionTimeoutRef.current);
    }
    logAttentionTimeoutRef.current = setTimeout(() => {
      setLogAttention(false);
      logAttentionTimeoutRef.current = null;
    }, 1400);
  }, []);

  // Function to add a log entry (can be called from any tab)
  function addLogEntry(text: string, source: T.LogSource = "USER") {
    if (!text.trim()) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${hours}:${minutes}:${seconds}`;

    setLogEntries((prevEntries) => {
      const newEntry: T.LogEntry = {
        id: Date.now().toString(),
        timestamp,
        source,
        text,
        order: prevEntries.length,
      };
      return [...prevEntries, newEntry];
    });

    if (activeTab !== "log") {
      triggerLogAttention();
    }
  }

  useEffect(() => {
    if (activeTab === "log") {
      setLogAttention(false);
      if (logAttentionTimeoutRef.current) {
        clearTimeout(logAttentionTimeoutRef.current);
        logAttentionTimeoutRef.current = null;
      }
    }
    return () => {
      if (logAttentionTimeoutRef.current) {
        clearTimeout(logAttentionTimeoutRef.current);
        logAttentionTimeoutRef.current = null;
      }
    };
  }, [activeTab]);

  const handleAdvanceToEngagement = useCallback((sectorId: string) => {
    setCurrentSectorId(sectorId);
    setActiveTab("engagement");
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm("Reset all app data? This will clear everything and reload the page.")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  return (
    <main>
      <div className="dc-container">
        {/* THEME TOGGLE */}
        <div className="dc-theme-toggle">
          <button
            className={`dc-theme-btn ${theme === "default" ? "active" : ""}`}
            onClick={() => setTheme("default")}
            title="Default theme"
          >
            DEFAULT
          </button>
          <button
            className={`dc-theme-btn ${theme === "terminal" ? "active" : ""}`}
            onClick={() => setTheme("terminal")}
            title="Terminal theme"
          >
            TERMINAL
          </button>
        </div>

        {/* RESET BUTTON */}
        <button
          className="dc-reset-btn"
          onClick={handleReset}
          title="Reset all app data"
        >
          ♻
        </button>

        <h1 className="dc-title">DANGER CLOSE OPCON</h1>
        <div className="dc-subtle-rule" />

        {/* TAB NAVIGATION */}
        <nav className="dc-tab-nav">
          <button
            className={`dc-tab-btn ${activeTab === "squad" ? "active" : ""}`}
            onClick={() => setActiveTab("squad")}
          >
            SQUAD
          </button>
          <button
            className={`dc-tab-btn ${activeTab === "mission" ? "active" : ""}`}
            onClick={() => setActiveTab("mission")}
          >
            MISSION
          </button>
          <button
            className={`dc-tab-btn ${activeTab === "engagement" ? "active" : ""}`}
            onClick={() => setActiveTab("engagement")}
          >
            ENGAGEMENT
          </button>
          <button
            className={`dc-tab-btn ${
              activeTab === "log" ? "active" : ""
            } ${logAttention ? "dc-tab-btn--notify" : ""}`}
            onClick={() => setActiveTab("log")}
          >
            LOG
          </button>
        </nav>

        {/* TAB CONTENT */}
        {activeTab === "squad" && (
          <SquadTable
            onAddLog={addLogEntry}
            mission={mission}
            currentSectorId={currentSectorId}
          />
        )}
        {activeTab === "mission" && (
          <MissionSetup
            mission={mission}
            onMissionChange={setMission}
            currentSectorId={currentSectorId}
            onCurrentSectorChange={setCurrentSectorId}
            onAdvanceToEngagement={handleAdvanceToEngagement}
            onAddLog={addLogEntry}
          />
        )}
        {activeTab === "engagement" && (
          <EngagementTab
            mission={mission}
            currentSectorId={currentSectorId}
            onCurrentSectorChange={setCurrentSectorId}
            onMissionChange={setMission}
            onAddLog={addLogEntry}
          />
        )}
        {activeTab === "log" && <LogTab entries={logEntries} onUpdateEntries={setLogEntries} />}
      </div>
    </main>
  );
}