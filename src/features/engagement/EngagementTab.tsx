import React from "react";
import * as T from "../squad/types";
import { getStoredSquadName } from "../squad/storageKeys";
import {
  getSectorDisplayName,
  isThreatContent,
} from "../mission/missionUtils";
import type { ThreatContent } from "../mission/missionUtils";

const COVER_EFFECTS: Record<T.MissionCover, string> = {
  Exposed: "Defensive Position Effect: Never Fortified.",
  Normal: "Defensive Position Effect: No more than 2 Troopers Fortified.",
  Dense: "Defensive Position Effect: No limit on Fortified.",
};

const SPACE_EFFECTS: Record<T.MissionSpace, string> = {
  Tight: "Offensive Position Effect: Never Flanking.",
  Transitional: "Offensive Position Effect: No more than 2 Troopers Flanking.",
  Open: "Offensive Position Effect: No limit on Flanking.",
};

const THREAT_LEVEL_LABELS: Record<ThreatContent, string> = {
  "TL 1": "Light",
  "TL 2": "Standard",
  "TL 3": "Heavy",
  "TL 4": "Overwhelming",
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
            threatSectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {getSectorDisplayName(sector)}
              </option>
            ))
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
              <p>{COVER_EFFECTS[selectedSector.cover]}</p>
            </article>
            <article className="dc-engagement-card">
              <header>
                <h4>Space</h4>
                <span className="dc-engagement-value">{selectedSector.space}</span>
              </header>
              <p>{SPACE_EFFECTS[selectedSector.space]}</p>
            </article>
            <article className="dc-engagement-card">
              <header>
                <h4>Threat Level</h4>
                <span className="dc-engagement-value">{selectedSector.content}</span>
              </header>
              <p>{THREAT_LEVEL_LABELS[selectedSector.content]}</p>
            </article>
          </div>
        </div>
      ) : (
        <p className="dc-engagement-empty">Select a Threat Level sector to review engagement intel.</p>
      )}
    </section>
  );
}
