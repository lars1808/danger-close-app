import React, { useState, useEffect } from "react";
import * as T from "../squad/types";

const MISSION_STORAGE_KEY = "danger-close-mission";

interface MissionSetupProps {
  onAddLog: (text: string, source: T.LogSource) => void;
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
    // TODO: Implement randomization logic
    console.log("Randomize clicked");
  }

  function handleDeploySQuad() {
    // TODO: Implement deploy logic
    console.log("Deploy Squad clicked");
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
          onClick={handleDeploySQuad}
        >
          DEPLOY SQUAD
        </button>
      </div>
    </div>
  );
}