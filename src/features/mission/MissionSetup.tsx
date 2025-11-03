import React, { useState, useEffect } from "react";
import * as T from "../squad/types";
import { getStoredSquadName } from "../squad/storageKeys";

const MISSION_STORAGE_KEY = "danger-close-mission";

const MISSION_OBJECTIVES = [
  // Seize & Secure
  { type: "Seize & Secure", objective: "Assault" },
  { type: "Seize & Secure", objective: "Search & Destroy" },
  { type: "Seize & Secure", objective: "Breach" },
  
  // Hit & Run
  { type: "Hit & Run", objective: "Raid" },
  { type: "Hit & Run", objective: "Recon" },
  { type: "Hit & Run", objective: "Extraction" },
  { type: "Hit & Run", objective: "Recovery" },
  { type: "Hit & Run", objective: "Sabotage" },
  
  // Free Roam
  { type: "Free Roam", objective: "Kill Mission" },
  { type: "Free Roam", objective: "Disruption" },
  
  // Defense
  { type: "Defense", objective: "Siege" },
  { type: "Defense", objective: "Evacuation" },
  { type: "Defense", objective: "Last Stand" },
];

interface MissionSetupProps {
  onAddLog: (text: string, source: T.LogSource) => void;
}

// Helper function to roll 1d6
function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Helper function to pick random objective
function getRandomObjective(): string {
  const randomMission = MISSION_OBJECTIVES[Math.floor(Math.random() * MISSION_OBJECTIVES.length)];
  return `${randomMission.type} // ${randomMission.objective}`;
}

// Helper function to pick difficulty (3-in-6 Routine, 2-in-6 Hazardous, 1-in-6 Desperate)
function getRandomDifficulty(): T.Difficulty {
  const roll = rollD6();
  if (roll <= 3) return "Routine";
  if (roll <= 5) return "Hazardous";
  return "Desperate";
}

// Helper function to pick airspace (3-in-6 Contested, 2-in-6 Clear, 1-in-6 Hostile)
function getRandomAirspace(): T.Airspace {
  const roll = rollD6();
  if (roll <= 3) return "Contested";
  if (roll <= 5) return "Clear";
  return "Hostile";
}

export default function MissionSetup(props: MissionSetupProps) {
  const { onAddLog } = props;

  const [mission, setMission] = useState<T.Mission>(() => {
    const saved = localStorage.getItem(MISSION_STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          id: Date.now().toString(),
          name: "",
          objective: "",
          difficulty: "Hazardous" as T.Difficulty,
          airspace: "Contested" as T.Airspace,
          status: "planning" as const,
        };
  });

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(mission));
  }, [mission]);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMission((prev) => ({ ...prev, name: e.target.value }));
  }

  function handleObjectiveChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMission((prev) => ({ ...prev, objective: e.target.value }));
  }

  function handleDifficultyChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMission((prev) => ({
      ...prev,
      difficulty: e.target.value as T.Difficulty,
    }));
  }

  function handleAirspaceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMission((prev) => ({
      ...prev,
      airspace: e.target.value as T.Airspace,
    }));
  }

  function handleRandomize() {
    setMission((prev) => ({
      ...prev,
      objective: getRandomObjective(),
      difficulty: getRandomDifficulty(),
      airspace: getRandomAirspace(),
    }));
    onAddLog("Mission parameters randomized", "SYSTEM");
  }

  function handleDeploySquad() {
    const storedSquadName = getStoredSquadName().trim();
    const squadName = storedSquadName || "Unnamed Squad";
    const missionName = mission.name.trim() || "Untitled Mission";
    const missionObjective = mission.objective.trim() || "Objective Pending";
    const { difficulty, airspace } = mission;

    setMission((prev) => ({
      ...prev,
      status: "active",
      startTime: prev.startTime ?? Date.now(),
    }));

    const logMessage = `${squadName} ACTIVE ++ ${missionName} ++ ${missionObjective} ++ DIFFICULTY: ${difficulty} ++ AIRSPACE: ${airspace}`;
    onAddLog(logMessage, "SYSTEM");
  }

  return (
    <div className="dc-mission-setup">
      {/* Mission Name */}
      <div className="dc-mission-field">
        <label className="dc-mission-label">Mission Name</label>
        <input
          type="text"
          className="dc-input dc-mission-name-input"
          value={mission.name}
          onChange={handleNameChange}
          placeholder="e.g. Operation Nightfall"
        />
      </div>

      {/* Objective */}
      <div className="dc-mission-field">
        <label className="dc-mission-label">Objective</label>
        <textarea
          className="dc-input dc-mission-objective-input"
          value={mission.objective}
          onChange={handleObjectiveChange}
          placeholder="e.g. Seize & Secure / Assault"
          rows={4}
        />
      </div>

      {/* Difficulty & Airspace Row */}
      <div className="dc-mission-row">
        <div className="dc-mission-field">
          <label className="dc-mission-label">Difficulty</label>
          <select
            className="dc-select dc-mission-select"
            value={mission.difficulty}
            onChange={handleDifficultyChange}
          >
            <option value="Routine">Routine</option>
            <option value="Hazardous">Hazardous</option>
            <option value="Desperate">Desperate</option>
          </select>
        </div>

        <div className="dc-mission-field">
          <label className="dc-mission-label">Airspace</label>
          <select
            className="dc-select dc-mission-select"
            value={mission.airspace}
            onChange={handleAirspaceChange}
          >
            <option value="Clear">Clear</option>
            <option value="Contested">Contested</option>
            <option value="Hostile">Hostile</option>
          </select>
        </div>
      </div>

      {/* Buttons Row */}
      <div className="dc-mission-buttons">
        <button
          className="dc-btn dc-mission-btn dc-mission-btn--randomize"
          onClick={handleRandomize}
        >
          RANDOMIZE
        </button>
        <button
          className="dc-btn dc-mission-btn dc-mission-btn--deploy"
          onClick={handleDeploySquad}
        >
          DEPLOY SQUAD
        </button>
      </div>
    </div>
  );
}