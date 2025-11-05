import React from "react";
import * as T from "../squad/types";
import {
  getStoredSquad,
  getStoredSquadName,
  SQUAD_UPDATED_EVENT,
} from "../squad/storageKeys";
import {
  getSectorDisplayName,
  isThreatContent,
  MISSION_WEATHER_OPTIONS,
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

const WOUNDED_STATUSES: readonly T.Status[] = ["Wounded", "Bleeding Out", "Dead"];

const WEATHER_MODIFIERS: Record<T.MissionWeather, number> = {
  Normal: 0,
  Bad: -1,
  Terrible: -2,
};

type AdvanceOutcome = "Ambushed" | "Spotted" | "Advantage" | "Surprise" | "Overwhelm";

const ADVANCE_OUTCOME_DETAILS: Record<AdvanceOutcome, string> = {
  Ambushed: "The Squad starts Flanked + Engaged.",
  Spotted: "The Squad starts In Cover + Engaged.",
  Advantage: "The Squad starts In Cover + Flanking.",
  Surprise: "The Squad starts In Cover + Flanking + 1 Momentum.",
  Overwhelm: "The Squad overwhelms the enemy force, and the enemy is routed.",
};

const ADVANCE_ROLL_TICK_INTERVAL = 120;
const ADVANCE_ROLL_ANIMATION_DURATION = 900;

function determineAdvanceOutcome(total: number, threat: ThreatContent): AdvanceOutcome {
  if (threat === "TL 4") {
    return "Ambushed";
  }

  if (threat === "TL 3") {
    if (total >= 6) {
      return "Advantage";
    }
    if (total <= 3) {
      return "Ambushed";
    }
    return "Spotted";
  }

  if (threat === "TL 2") {
    if (total >= 6) {
      return "Overwhelm";
    }
    if (total <= 2) {
      return "Ambushed";
    }
    return "Spotted";
  }

  // TL 1
  if (total >= 6) {
    return "Overwhelm";
  }
  if (total === 5) {
    return "Surprise";
  }
  if (total === 4) {
    return "Advantage";
  }
  return "Spotted";
}

function formatModifier(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  return value.toString();
}

function clampNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function computeFatigueModifier(advanceRolls: number): number {
  return -Math.floor(advanceRolls / 3);
}

interface EngagementTabProps {
  mission: T.Mission;
  currentSectorId: string | null;
  onCurrentSectorChange: (sectorId: string | null) => void;
  onMissionChange: React.Dispatch<React.SetStateAction<T.Mission>>;
  onAddLog: (text: string, source: T.LogSource) => void;
}

export default function EngagementTab(props: EngagementTabProps) {
  const { mission, currentSectorId, onCurrentSectorChange, onMissionChange, onAddLog } = props;

  const [storedSquad, setStoredSquad] = React.useState<Partial<T.Trooper>[]>(() => getStoredSquad());
  const [advanceRolls, setAdvanceRolls] = React.useState(0);
  const [customModifier, setCustomModifier] = React.useState(0);
  const [diceValues, setDiceValues] = React.useState<{ val1: number | null; val2: number | null }>({
    val1: null,
    val2: null,
  });
  const [isRolling, setIsRolling] = React.useState(false);
  const [lastRoll, setLastRoll] = React.useState<{
    total: number;
    outcome: AdvanceOutcome;
    description: string;
  } | null>(null);
  const [isAdvanceCollapsed, setIsAdvanceCollapsed] = React.useState(false);

  const advanceSectionId = React.useId();

  const rollIntervalRef = React.useRef<number | null>(null);
  const rollTimeoutRef = React.useRef<number | null>(null);
  const previousSectorIdRef = React.useRef<string | null>(null);

  const handleStoredSquadUpdate = React.useCallback(() => {
    setStoredSquad(getStoredSquad());
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener(SQUAD_UPDATED_EVENT, handleStoredSquadUpdate);
    return () => {
      window.removeEventListener(SQUAD_UPDATED_EVENT, handleStoredSquadUpdate);
    };
  }, [handleStoredSquadUpdate]);

  const threatSectors = React.useMemo(
    () =>
      mission.sectors.filter(
        (sector): sector is T.MissionSector & { content: ThreatContent } =>
          isThreatContent(sector.content),
      ),
    [mission.sectors],
  );

  const selectedSector = threatSectors.find((sector) => sector.id === currentSectorId) ?? null;

  const injuriesModifier = React.useMemo(() => {
    const woundedCount = storedSquad.reduce((count, trooper) => {
      const status = trooper.status as T.Status | undefined;
      if (status && WOUNDED_STATUSES.includes(status)) {
        return count + 1;
      }
      return count;
    }, 0);

    if (woundedCount >= 3) {
      return -2;
    }
    if (woundedCount > 0) {
      return -1;
    }
    return 0;
  }, [storedSquad]);

  const mobilityModifier = React.useMemo(() => {
    if (storedSquad.length === 0) {
      return 0;
    }

    const troopersWithArmor = storedSquad.filter((trooper) => typeof trooper.armorId === "string");
    if (troopersWithArmor.length === 0) {
      return 0;
    }

    const allLight = troopersWithArmor.every((trooper) => trooper.armorId === "light");
    if (allLight) {
      return 1;
    }

    const anyHeavy = troopersWithArmor.some((trooper) => trooper.armorId === "heavy");
    if (anyHeavy) {
      return -1;
    }

    return 0;
  }, [storedSquad]);

  const weatherModifier = selectedSector ? WEATHER_MODIFIERS[selectedSector.weather] : 0;
  const fatigueModifier = React.useMemo(
    () => computeFatigueModifier(advanceRolls),
    [advanceRolls],
  );

  const sumModifier = React.useMemo(
    () => injuriesModifier + mobilityModifier + fatigueModifier + weatherModifier + customModifier,
    [injuriesModifier, mobilityModifier, fatigueModifier, weatherModifier, customModifier],
  );

  const injuriesDisplay = React.useMemo(() => formatModifier(injuriesModifier), [injuriesModifier]);
  const mobilityDisplay = React.useMemo(() => formatModifier(mobilityModifier), [mobilityModifier]);
  const fatigueDisplay = React.useMemo(() => formatModifier(fatigueModifier), [fatigueModifier]);
  const weatherDisplay = React.useMemo(() => formatModifier(weatherModifier), [weatherModifier]);
  const sumDisplay = React.useMemo(() => formatModifier(sumModifier), [sumModifier]);
  const diceVal1Display = diceValues.val1 === null ? "-" : String(diceValues.val1);
  const diceVal2Display = diceValues.val2 === null ? "-" : String(diceValues.val2);
  const lastOutcomeDisplay = lastRoll === null ? "-" : String(lastRoll.total);

  React.useEffect(() => {
    return () => {
      if (rollIntervalRef.current !== null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      if (rollTimeoutRef.current !== null) {
        window.clearTimeout(rollTimeoutRef.current);
        rollTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const currentId = selectedSector?.id ?? null;
    const previousId = previousSectorIdRef.current;
    const shouldReset = !selectedSector || (previousId && currentId && previousId !== currentId);

    if (shouldReset) {
      setCustomModifier(0);
      setDiceValues({ val1: null, val2: null });
      setLastRoll(null);
      if (rollIntervalRef.current !== null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      if (rollTimeoutRef.current !== null) {
        window.clearTimeout(rollTimeoutRef.current);
        rollTimeoutRef.current = null;
      }
      setIsRolling(false);
      setIsAdvanceCollapsed(false);
    }

    previousSectorIdRef.current = currentId;
  }, [selectedSector]);

  const handleToggleAdvanceCollapsed = React.useCallback(() => {
    setIsAdvanceCollapsed((prev) => !prev);
  }, []);

  const handleAdvanceRollsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = clampNonNegativeInteger(Number(event.target.value));
    setAdvanceRolls(nextValue);
  };

  const handleCustomModifierChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    setCustomModifier(Number.isFinite(nextValue) ? nextValue : 0);
  };

  const randomDieValue = React.useCallback(() => Math.floor(Math.random() * 3) + 1, []);

  const handleRoll = React.useCallback(() => {
    if (isRolling) {
      return;
    }
    if (!selectedSector) {
      return;
    }

    setIsRolling(true);
    setLastRoll(null);

    const updateRollingValues = () => {
      setDiceValues({ val1: randomDieValue(), val2: randomDieValue() });
    };

    updateRollingValues();
    rollIntervalRef.current = window.setInterval(updateRollingValues, ADVANCE_ROLL_TICK_INTERVAL);

    rollTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current !== null) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }

      const finalVal1 = randomDieValue();
      const finalVal2 = randomDieValue();
      setDiceValues({ val1: finalVal1, val2: finalVal2 });

      const fatigueForRoll = computeFatigueModifier(advanceRolls);
      const modifierForRoll =
        injuriesModifier + mobilityModifier + fatigueForRoll + weatherModifier + customModifier;
      const total = finalVal1 + finalVal2 + modifierForRoll;
      const outcome = determineAdvanceOutcome(total, selectedSector.content);

      setLastRoll({
        total,
        outcome,
        description: ADVANCE_OUTCOME_DETAILS[outcome],
      });

      const storedSquadName = getStoredSquadName().trim();
      const squadName = storedSquadName || "Unnamed Squad";
      const sectorName = selectedSector.name || getSectorDisplayName(selectedSector);
      const logMessage = `${squadName} ADVANCES >> ${sectorName}\nCover: ${selectedSector.cover} ++ Space: ${selectedSector.space} ++ Threat Level: ${selectedSector.content}\nSTATUS: ${outcome}`;
      onAddLog(logMessage, "SYSTEM");

      setAdvanceRolls((prev) => prev + 1);

      setIsRolling(false);
      if (rollTimeoutRef.current !== null) {
        window.clearTimeout(rollTimeoutRef.current);
        rollTimeoutRef.current = null;
      }
    }, ADVANCE_ROLL_ANIMATION_DURATION);
  }, [
    advanceRolls,
    customModifier,
    injuriesModifier,
    isRolling,
    mobilityModifier,
    onAddLog,
    randomDieValue,
    selectedSector,
    weatherModifier,
  ]);

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

  function handleWeatherChange(nextWeather: T.MissionWeather) {
    if (!selectedSector || selectedSector.weather === nextWeather) {
      return;
    }

    onMissionChange((prev) => ({
      ...prev,
      sectors: prev.sectors.map((sector) =>
        sector.id === selectedSector.id
          ? {
              ...sector,
              weather: nextWeather,
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
            <article className="dc-engagement-card dc-engagement-weather">
              <header>
                <h4>Weather</h4>
                <span className="dc-engagement-value">{selectedSector.weather}</span>
              </header>
              <div className="dc-engagement-weather-options" role="radiogroup" aria-label="Sector weather">
                {MISSION_WEATHER_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={`dc-engagement-weather-option ${
                      selectedSector.weather === option ? "is-active" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="dc-engagement-weather"
                      value={option}
                      checked={selectedSector.weather === option}
                      onChange={() => handleWeatherChange(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </article>
          </div>

          <div className="dc-engagement-advance">
            <article
              className={`dc-engagement-card dc-advance-wrapper${
                isAdvanceCollapsed ? " dc-advance-wrapper--collapsed" : ""
              }`}
            >
              <header className="dc-advance-header">
                <h3 className="dc-engagement-advance-title">Advance Roll</h3>
                <button
                  type="button"
                  className="dc-advance-toggle"
                  onClick={handleToggleAdvanceCollapsed}
                  aria-expanded={!isAdvanceCollapsed}
                  aria-controls={advanceSectionId}
                >
                  {isAdvanceCollapsed ? "Expand" : "Collapse"}
                </button>
              </header>
              <div id={advanceSectionId} className="dc-advance-body">
                {isAdvanceCollapsed ? (
                  lastRoll ? (
                    <div className="dc-advance-collapsed-summary">
                      <span className={`dc-result-outcome dc-result-outcome--${lastRoll.outcome.toLowerCase()}`}>
                        {lastRoll.outcome}
                      </span>
                      <p className="dc-result-description">{lastRoll.description}</p>
                    </div>
                  ) : (
                    <p className="dc-advance-collapsed-empty">No advance result yet.</p>
                  )
                ) : (
                  <div className="dc-advance-grid">
                    <section className="dc-advance-panel">
                      <header>
                        <h4>Modifiers</h4>
                      </header>
                      <div className="dc-modifiers-list">
                        <div className="dc-modifier-row">
                          <span className="dc-modifier-label">Injuries:</span>
                          <span className="dc-modifier-value">{injuriesDisplay}</span>
                        </div>
                        <div className="dc-modifier-row">
                          <span className="dc-modifier-label">Mobility:</span>
                          <span className="dc-modifier-value">{mobilityDisplay}</span>
                        </div>
                        <div className="dc-modifier-row">
                          <label className="dc-modifier-label" htmlFor="dc-advance-rolls">
                            Advance Rolls made:
                          </label>
                          <input
                            id="dc-advance-rolls"
                            type="number"
                            className="dc-input dc-modifier-input"
                            min={0}
                            inputMode="numeric"
                            value={advanceRolls}
                            onChange={handleAdvanceRollsChange}
                          />
                        </div>
                        <div className="dc-modifier-row">
                          <span className="dc-modifier-label">Fatigue:</span>
                          <span className="dc-modifier-value">{fatigueDisplay}</span>
                        </div>
                        <div className="dc-modifier-row">
                          <span className="dc-modifier-label">Weather:</span>
                          <span className="dc-modifier-value">{weatherDisplay}</span>
                        </div>
                        <div className="dc-modifier-row">
                          <label className="dc-modifier-label" htmlFor="dc-custom-modifier">
                            Custom:
                          </label>
                          <input
                            id="dc-custom-modifier"
                            type="number"
                            className="dc-input dc-modifier-input"
                            value={customModifier}
                            onChange={handleCustomModifierChange}
                          />
                        </div>
                        <div className="dc-modifier-row dc-modifier-row--total">
                          <span className="dc-modifier-total-label">Modifier:</span>
                          <span className="dc-modifier-total-value">{sumDisplay}</span>
                        </div>
                      </div>
                    </section>

                    <section className="dc-advance-panel">
                      <header>
                        <h4>Dice Roller</h4>
                      </header>
                      <div className="dc-dice-screen">
                        <div className="dc-dice-screen-row">
                          <span className="dc-dice-label">Simulated d3</span>
                          <span className="dc-dice-value">{diceVal1Display}</span>
                        </div>
                        <div className="dc-dice-screen-row">
                          <span className="dc-dice-label">Simulated d3</span>
                          <span className="dc-dice-value">{diceVal2Display}</span>
                        </div>
                        <div className="dc-dice-screen-row">
                          <span className="dc-dice-label">MOD</span>
                          <span className="dc-dice-value">{sumDisplay}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dc-btn dc-btn--accent dc-dice-roll-btn"
                        onClick={handleRoll}
                        disabled={isRolling}
                      >
                        {isRolling ? "Rolling..." : "Roll"}
                      </button>
                      <div className="dc-dice-outcome" aria-live="polite">
                        <span className="dc-dice-outcome-label">Outcome:</span>
                        <span className="dc-dice-outcome-value">{lastOutcomeDisplay}</span>
                      </div>
                    </section>

                    <section className="dc-advance-panel dc-advance-panel--result">
                      <header>
                        <h4>Result</h4>
                      </header>
                      {lastRoll ? (
                        <div className="dc-result-content">
                          <span className={`dc-result-outcome dc-result-outcome--${lastRoll.outcome.toLowerCase()}`}>
                            {lastRoll.outcome}
                          </span>
                          <p className="dc-result-description">{lastRoll.description}</p>
                        </div>
                      ) : (
                        <div className="dc-result-placeholder">
                          <span className="dc-result-placeholder-title">Result Pending</span>
                          <p className="dc-result-placeholder-text">
                            Result details will appear here in a future update.
                          </p>
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : (
        <p className="dc-engagement-empty">Select a Threat Level sector to review engagement intel.</p>
      )}
    </section>
  );
}
