import React from "react";
import * as T from "../squad/types";
import { getStoredSquadName } from "../squad/storageKeys";
import {
  getSectorDisplayName,
  isThreatContent,
} from "../mission/missionUtils";
import type { ThreatContent } from "../mission/missionUtils";

const COVER_EFFECTS: Record<T.MissionCover, { label: string; detail: string }> = {
  Exposed: {
    label: "Defensive Position Effect",
    detail: "Never Fortified.",
  },
  Normal: {
    label: "Defensive Position Effect",
    detail: "No more than 2 Troopers Fortified.",
  },
  Dense: {
    label: "Defensive Position Effect",
    detail: "No limit on Fortified.",
  },
};

const SPACE_EFFECTS: Record<T.MissionSpace, { label: string; detail: string }> = {
  Tight: {
    label: "Offensive Position Effect",
    detail: "Never Flanking.",
  },
  Transitional: {
    label: "Offensive Position Effect",
    detail: "No more than 2 Troopers Flanking.",
  },
  Open: {
    label: "Offensive Position Effect",
    detail: "No limit on Flanking.",
  },
};

const THREAT_LEVEL_DETAILS: Record<ThreatContent, { label: string; tone: string }> = {
  "TL 1": { label: "Light", tone: "tl1" },
  "TL 2": { label: "Standard", tone: "tl2" },
  "TL 3": { label: "Heavy", tone: "tl3" },
  "TL 4": { label: "Overwhelming", tone: "tl4" },
};

interface EngagementTabProps {
  mission: T.Mission;
  currentSectorId: string | null;
  onCurrentSectorChange: (sectorId: string | null) => void;
  onMissionChange: React.Dispatch<React.SetStateAction<T.Mission>>;
  onAddLog: (text: string, source: T.LogSource) => void;
}

export default function EngagementTab(props: EngagementTabProps) {
  const { mission, currentSectorId, onCurrentSectorChange, onMissionChange, onAddLog } = props;

  const threatSectors = React.useMemo(
    () =>
      mission.sectors.filter(
        (sector): sector is T.MissionSector & { content: ThreatContent } =>
          isThreatContent(sector.content),
      ),
    [mission.sectors],
  );

  const selectedSector = threatSectors.find((sector) => sector.id === currentSectorId) ?? null;

  function handleSectorSelect(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value || null;

    if (!nextId) {
      onCurrentSectorChange(null);
      return;
    }

    if (currentSectorId === nextId) {
      return;
    }

    const previousSector = mission.sectors.find((sector) => sector.id === currentSectorId) ?? null;
    const nextSector = mission.sectors.find((sector) => sector.id === nextId);

    if (!nextSector) {
      return;
    }

    const storedSquadName = getStoredSquadName().trim();
    const squadName = storedSquadName || "Unnamed Squad";
    const previousName = previousSector ? getSectorDisplayName(previousSector) : "Staging Area";
    const nextName = getSectorDisplayName(nextSector);

    onAddLog(`${squadName} MOVEMENT: ${previousName} >> ${nextName}`, "SYSTEM");
    onCurrentSectorChange(nextId);
  }

  function handleSectorNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedSector) {
      return;
    }

    const { value } = event.target;
    onMissionChange((prev) => ({
      ...prev,
      sectors: prev.sectors.map((sector) =>
        sector.id === selectedSector.id
          ? {
              ...sector,
              name: value,
            }
          : sector,
      ),
    }));
  }

  return (
    <section className="dc-engagement" aria-label="Engagement Overview">
      <div className="dc-engagement-field">
        <label className="dc-engagement-label" htmlFor="dc-engagement-sector-select">
          Engagement Sector
        </label>
        <select
          id="dc-engagement-sector-select"
          className="dc-select"
          value={selectedSector?.id ?? ""}
          onChange={handleSectorSelect}
        >
          {threatSectors.length === 0 ? (
            <option value="" disabled>
              No Threat Level sectors available
            </option>
          ) : (
            <>
              <option value="" disabled>
                Select a Threat Sector
              </option>
              {threatSectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {getSectorDisplayName(sector)}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {selectedSector ? (
        <div className="dc-engagement-details">
          <div className="dc-engagement-name">
            <label className="dc-engagement-label" htmlFor="dc-engagement-sector-name">
              Sector Name
            </label>
            <input
              id="dc-engagement-sector-name"
              className="dc-input"
              type="text"
              value={selectedSector.name}
              onChange={handleSectorNameChange}
              placeholder="Sector name"
            />
          </div>

          <div className="dc-engagement-grid">
            <article className="dc-engagement-card">
              <header>
                <h4>Cover</h4>
                <span className="dc-engagement-value">{selectedSector.cover}</span>
              </header>
              <p>
                <span className="dc-engagement-effect-label">
                  {COVER_EFFECTS[selectedSector.cover].label}
                </span>
                <span className="dc-engagement-effect-detail">
                  {COVER_EFFECTS[selectedSector.cover].detail}
                </span>
              </p>
            </article>
            <article className="dc-engagement-card">
              <header>
                <h4>Space</h4>
                <span className="dc-engagement-value">{selectedSector.space}</span>
              </header>
              <p>
                <span className="dc-engagement-effect-label">
                  {SPACE_EFFECTS[selectedSector.space].label}
                </span>
                <span className="dc-engagement-effect-detail">
                  {SPACE_EFFECTS[selectedSector.space].detail}
                </span>
              </p>
            </article>
            <article className="dc-engagement-card">
              <header>
                <h4>Threat Level</h4>
                <span
                  className={`dc-engagement-value dc-engagement-value--${
                    THREAT_LEVEL_DETAILS[selectedSector.content].tone
                  }`}
                >
                  {selectedSector.content}
                </span>
              </header>
              <p>
                <span className="dc-engagement-effect-label">Threat Assessment</span>
                <span
                  className={`dc-engagement-effect-detail dc-engagement-threat-detail dc-engagement-threat-detail--${
                    THREAT_LEVEL_DETAILS[selectedSector.content].tone
                  }`}
                >
                  {THREAT_LEVEL_DETAILS[selectedSector.content].label}
                </span>
              </p>
            </article>
          </div>
        </div>
      ) : (
        <p className="dc-engagement-empty">Select a Threat Level sector to review engagement intel.</p>
      )}
    </section>
  );
}
