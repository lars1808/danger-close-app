import React, { useState, useEffect } from "react";
import * as T from "../squad/types";
import { getStoredSquadName } from "../squad/storageKeys";

const MISSION_STORAGE_KEY = "danger-close-mission";

const MISSION_COVER_OPTIONS: T.MissionCover[] = ["Exposed", "Normal", "Dense"];
const MISSION_SPACE_OPTIONS: T.MissionSpace[] = ["Tight", "Transitional", "Open"];
const MISSION_CONTENT_OPTIONS: T.MissionContent[] = [
  "Boon",
  "Nothing",
  "TL 1",
  "TL 2",
  "TL 3",
  "TL 4",
];
const MISSION_DIFFICULTY_OPTIONS: T.Difficulty[] = ["Routine", "Hazardous", "Desperate"];
const MISSION_AIRSPACE_OPTIONS: T.Airspace[] = ["Clear", "Contested", "Hostile"];
const MISSION_STATUS_OPTIONS: Array<T.Mission["status"]> = ["planning", "active", "complete"];

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

function generateSectorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isMissionCover(value: unknown): value is T.MissionCover {
  return typeof value === "string" && MISSION_COVER_OPTIONS.includes(value as T.MissionCover);
}

function isMissionSpace(value: unknown): value is T.MissionSpace {
  return typeof value === "string" && MISSION_SPACE_OPTIONS.includes(value as T.MissionSpace);
}

function isMissionContent(value: unknown): value is T.MissionContent {
  return typeof value === "string" && MISSION_CONTENT_OPTIONS.includes(value as T.MissionContent);
}

function isMissionDifficulty(value: unknown): value is T.Difficulty {
  return typeof value === "string" && MISSION_DIFFICULTY_OPTIONS.includes(value as T.Difficulty);
}

function isMissionAirspace(value: unknown): value is T.Airspace {
  return typeof value === "string" && MISSION_AIRSPACE_OPTIONS.includes(value as T.Airspace);
}

function isMissionStatus(value: unknown): value is T.Mission["status"] {
  return typeof value === "string" && MISSION_STATUS_OPTIONS.includes(value as T.Mission["status"]);
}

function normalizeSector(sector: unknown, index: number): T.MissionSector {
  if (!sector || typeof sector !== "object") {
    return {
      id: generateSectorId(),
      name: "",
      cover: "Normal",
      space: "Transitional",
      content: "Nothing",
    };
  }

  const rawSector = sector as Partial<T.MissionSector>;

  return {
    id:
      typeof rawSector.id === "string" && rawSector.id.trim()
        ? rawSector.id
        : `legacy-sector-${index}-${generateSectorId()}`,
    name: typeof rawSector.name === "string" ? rawSector.name : "",
    cover: isMissionCover(rawSector.cover) ? rawSector.cover : "Normal",
    space: isMissionSpace(rawSector.space) ? rawSector.space : "Transitional",
    content: isMissionContent(rawSector.content) ? rawSector.content : "Nothing",
  };
}

function normalizeMission(raw: unknown): T.Mission {
  const fallback: T.Mission = {
    id: Date.now().toString(),
    name: "",
    objective: "",
    difficulty: "Hazardous",
    airspace: "Contested",
    status: "planning",
    sectors: [],
  };

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Partial<T.Mission> & { sectors?: unknown };
  const sectors = Array.isArray(source.sectors)
    ? source.sectors.map((sector, index) => normalizeSector(sector, index))
    : [];

  return {
    ...fallback,
    ...source,
    id: typeof source.id === "string" && source.id.trim() ? source.id : fallback.id,
    name: typeof source.name === "string" ? source.name : fallback.name,
    objective: typeof source.objective === "string" ? source.objective : fallback.objective,
    difficulty: isMissionDifficulty(source.difficulty) ? source.difficulty : fallback.difficulty,
    airspace: isMissionAirspace(source.airspace) ? source.airspace : fallback.airspace,
    status: isMissionStatus(source.status) ? source.status : fallback.status,
    startTime: typeof source.startTime === "number" ? source.startTime : undefined,
    sectors,
  };
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
    return saved ? normalizeMission(JSON.parse(saved)) : normalizeMission(undefined);
  });
  const [draggedSectorId, setDraggedSectorId] = useState<string | null>(null);
  const [dragOverSectorId, setDragOverSectorId] = useState<string | null>(null);

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

  function handleClearMission() {
    setMission((prev) => ({
      ...prev,
      name: "",
      objective: "",
      status: "planning",
      startTime: undefined,
      sectors: [],
    }));
  }

  function handleEditMission() {
    setMission((prev) => ({
      ...prev,
      status: "planning",
      startTime: undefined,
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
    if (!mission.name.trim()) {
      return;
    }

    const storedSquadName = getStoredSquadName().trim();
    const squadName = storedSquadName || "Unnamed Squad";
    const missionName = mission.name.trim();
    const missionObjective = mission.objective.trim() || "Objective Pending";
    const { difficulty, airspace } = mission;

    setMission((prev) => ({
      ...prev,
      name: prev.name.trim(),
      objective: prev.objective.trim(),
      status: "active",
      startTime: prev.startTime ?? Date.now(),
    }));

    const logMessage = `${squadName} ACTIVE ++ ${missionName} ++ ${missionObjective} ++ DIFFICULTY: ${difficulty} ++ AIRSPACE: ${airspace}`;
    onAddLog(logMessage, "SYSTEM");
  }

  function handleAddSector() {
    setMission((prev) => ({
      ...prev,
      sectors: [
        ...prev.sectors,
        {
          id: generateSectorId(),
          name: "",
          cover: "Normal",
          space: "Transitional",
          content: "Nothing",
        },
      ],
    }));
  }

  function handleSectorFieldChange<TKey extends keyof T.MissionSector>(
    id: string,
    key: TKey,
    value: T.MissionSector[TKey],
  ) {
    setMission((prev) => ({
      ...prev,
      sectors: prev.sectors.map((sector) =>
        sector.id === id
          ? {
              ...sector,
              [key]: value,
            }
          : sector,
      ),
    }));
  }

  function handleDeleteSector(id: string) {
    setMission((prev) => ({
      ...prev,
      sectors: prev.sectors.filter((sector) => sector.id !== id),
    }));
  }

  function handleSectorDragStart(event: React.DragEvent<HTMLElement>, id: string) {
    const target = event.target as HTMLElement | null;
    if (!target || !target.closest(".dc-mission-sector-drag-handle")) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);

    setDraggedSectorId(id);
    setDragOverSectorId(null);
  }

  function handleSectorDragOver(event: React.DragEvent<HTMLElement>, id: string) {
    if (!draggedSectorId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggedSectorId === id) {
      if (dragOverSectorId !== null) {
        setDragOverSectorId(null);
      }
      return;
    }

    setDragOverSectorId((prev) => (prev === id ? prev : id));
  }

  function handleSectorDrop(event: React.DragEvent<HTMLElement>, targetId: string) {
    if (!draggedSectorId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (draggedSectorId === targetId) {
      handleSectorDragEnd();
      return;
    }

    setMission((prev) => {
      const fromIndex = prev.sectors.findIndex((sector) => sector.id === draggedSectorId);
      const toIndex = prev.sectors.findIndex((sector) => sector.id === targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }

      const updated = [...prev.sectors];
      const [draggedSector] = updated.splice(fromIndex, 1);
      const insertionIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
      updated.splice(insertionIndex, 0, draggedSector);

      return {
        ...prev,
        sectors: updated,
      };
    });

    handleSectorDragEnd();
  }

  function handleSectorListDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!draggedSectorId) {
      return;
    }

    if ((event.target as HTMLElement | null)?.closest(".dc-mission-sector-card")) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragOverSectorId((prev) => (prev === null ? prev : null));
  }

  function handleSectorListDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!draggedSectorId) {
      return;
    }

    if ((event.target as HTMLElement | null)?.closest(".dc-mission-sector-card")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setMission((prev) => {
      const fromIndex = prev.sectors.findIndex((sector) => sector.id === draggedSectorId);

      if (fromIndex === -1 || fromIndex === prev.sectors.length - 1) {
        return prev;
      }

      const updated = [...prev.sectors];
      const [draggedSector] = updated.splice(fromIndex, 1);
      updated.push(draggedSector);

      return {
        ...prev,
        sectors: updated,
      };
    });

    handleSectorDragEnd();
  }

  function handleSectorDragEnd() {
    setDraggedSectorId(null);
    setDragOverSectorId(null);
  }

  const isMissionLocked = mission.status === "active";
  const trimmedMissionName = mission.name.trim();
  const trimmedMissionObjective = mission.objective.trim();
  const deployDisabled = !trimmedMissionName;

  return (
    <div className="dc-mission-setup">
      {isMissionLocked ? (
        <>
          <div className="dc-mission-summary" aria-live="polite">
            <div className="dc-mission-summary-main">
              <span className="dc-mission-summary-heading">Mission Locked</span>
              <h3 className="dc-mission-summary-title">
                {trimmedMissionName || "Untitled Mission"}
              </h3>
            </div>
            <dl className="dc-mission-summary-details">
              <div>
                <dt>Objective</dt>
                <dd>{trimmedMissionObjective || "Objective Pending"}</dd>
              </div>
              <div>
                <dt>Difficulty</dt>
                <dd>{mission.difficulty}</dd>
              </div>
              <div>
                <dt>Airspace</dt>
                <dd>{mission.airspace}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="dc-btn dc-mission-summary-edit"
              onClick={handleEditMission}
            >
              EDIT MISSION
            </button>
          </div>

          <section className="dc-mission-sectors" aria-label="Mission Sectors">
            <header className="dc-mission-sectors-header">
              <h4>Mission Sectors</h4>
              <p>Define the terrain and threats for each sector of engagement.</p>
            </header>

            <div
              className="dc-mission-sector-list"
              onDragOver={handleSectorListDragOver}
              onDrop={handleSectorListDrop}
            >
              {mission.sectors.length === 0 ? (
                <p className="dc-mission-sectors-empty">
                  No sectors assigned yet. Add sectors to break down the battlefield.
                </p>
              ) : (
                mission.sectors.map((sector) => {
                  const sectorCardClassName = [
                    "dc-mission-sector-card",
                    draggedSectorId === sector.id ? "is-dragging" : "",
                    dragOverSectorId === sector.id ? "is-drag-over" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <article
                      key={sector.id}
                      className={sectorCardClassName}
                      data-sector-id={sector.id}
                      draggable
                      onDragStart={(event) => handleSectorDragStart(event, sector.id)}
                      onDragOver={(event) => handleSectorDragOver(event, sector.id)}
                      onDrop={(event) => handleSectorDrop(event, sector.id)}
                      onDragEnd={handleSectorDragEnd}
                    >
                    <div className="dc-mission-sector-card-top">
                        <div className="dc-mission-sector-card-title">
                          <button
                            type="button"
                            className="dc-mission-sector-drag-handle"
                            tabIndex={-1}
                            aria-hidden="true"
                          >
                            <span className="dc-mission-sector-drag-icon" aria-hidden="true" />
                          </button>
                          <input
                            type="text"
                            className="dc-input dc-mission-sector-name"
                            value={sector.name}
                            onChange={(event) =>
                              handleSectorFieldChange(sector.id, "name", event.target.value)
                            }
                            placeholder="Sector name"
                          />
                        </div>
                      <div className="dc-mission-sector-card-actions">
                        <button
                          type="button"
                          className="dc-btn dc-btn--sm dc-mission-sector-randomize"
                          onClick={() => {}}
                        >
                          Randomize
                        </button>
                        <button
                          type="button"
                          className="dc-mission-sector-delete"
                          onClick={() => handleDeleteSector(sector.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="dc-mission-sector-controls">
                      <label className="dc-mission-sector-field">
                        <span>Cover</span>
                        <select
                          className="dc-select"
                          value={sector.cover}
                          onChange={(event) =>
                            handleSectorFieldChange(
                              sector.id,
                              "cover",
                              event.target.value as T.MissionCover,
                            )
                          }
                        >
                          {MISSION_COVER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="dc-mission-sector-field">
                        <span>Space</span>
                        <select
                          className="dc-select"
                          value={sector.space}
                          onChange={(event) =>
                            handleSectorFieldChange(
                              sector.id,
                              "space",
                              event.target.value as T.MissionSpace,
                            )
                          }
                        >
                          {MISSION_SPACE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="dc-mission-sector-field">
                        <span>Content</span>
                        <select
                          className="dc-select"
                          value={sector.content}
                          onChange={(event) =>
                            handleSectorFieldChange(
                              sector.id,
                              "content",
                              event.target.value as T.MissionContent,
                            )
                          }
                        >
                          {MISSION_CONTENT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    </article>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className="dc-btn dc-mission-sector-add"
              onClick={handleAddSector}
            >
              Add New Sector
            </button>
          </section>
        </>
      ) : (
        <>
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
              type="button"
              className="dc-btn dc-mission-btn dc-mission-btn--clear"
              onClick={handleClearMission}
            >
              CLEAR
            </button>
            <button
              type="button"
              className="dc-btn dc-mission-btn dc-mission-btn--randomize"
              onClick={handleRandomize}
            >
              RANDOMIZE
            </button>
            <button
              type="button"
              className="dc-btn dc-mission-btn dc-mission-btn--deploy"
              onClick={handleDeploySquad}
              disabled={deployDisabled}
            >
              DEPLOY SQUAD
            </button>
          </div>
        </>
      )}
    </div>
  );
}
