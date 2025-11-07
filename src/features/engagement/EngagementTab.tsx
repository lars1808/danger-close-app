import React from "react";
import * as T from "../squad/types";
import {
  getStoredSquad,
  getStoredSquadName,
  getStoredArmory,
  SQUAD_STORAGE_KEY,
  SQUAD_UPDATED_EVENT,
} from "../squad/storageKeys";
import {
  getSectorDisplayName,
  isThreatContent,
  MISSION_WEATHER_OPTIONS,
} from "../mission/missionUtils";
import {
  MOMENTUM_DEFAULT,
  MOMENTUM_MAX,
  MOMENTUM_MIN,
  MOMENTUM_VALUES,
} from "./momentumUtils";
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

const STATUS_DETAILS: Record<T.Status, { label: string; tone: "ok" | "grazed" | "wounded" | "bleeding" | "dead" }> = {
  OK: { label: "OK", tone: "ok" },
  Grazed: { label: "Grazed", tone: "grazed" },
  Wounded: { label: "Wounded", tone: "wounded" },
  "Bleeding Out": { label: "Bleeding Out", tone: "bleeding" },
  Dead: { label: "Dead", tone: "dead" },
};

type PositionTone = "positive" | "caution" | "negative";

type PositionOption<TPosition> = {
  value: TPosition;
  tone: PositionTone;
  detail: string;
};

const OFFENSIVE_POSITIONS: PositionOption<T.OffensivePosition>[] = [
  { value: "Flanking", tone: "positive", detail: "+1d6 when Firing" },
  { value: "Engaged", tone: "caution", detail: "No bonus when Firing" },
  { value: "Limited", tone: "negative", detail: "-1d6 when Firing" },
];

const DEFENSIVE_POSITIONS: PositionOption<T.DefensivePosition>[] = [
  { value: "Fortified", tone: "positive", detail: "Injury on 1" },
  { value: "In Cover", tone: "caution", detail: "Injury on 1-2" },
  { value: "Flanked", tone: "negative", detail: "Injury on 1-3" },
];

type AdvanceOutcome = "Ambushed" | "Spotted" | "Advantage" | "Surprise" | "Overwhelm";

const ADVANCE_OUTCOME_DETAILS: Record<AdvanceOutcome, string> = {
  Ambushed: "The Squad starts Flanked + Engaged.",
  Spotted: "The Squad starts In Cover + Engaged.",
  Advantage: "The Squad starts In Cover + Flanking.",
  Surprise: "The Squad starts In Cover + Flanking + 1 Momentum.",
  Overwhelm: "The Squad overwhelms the enemy force, and the enemy is routed.",
};

const ADVANCE_OUTCOME_POSITIONS: Partial<
  Record<AdvanceOutcome, { offensive: T.OffensivePosition; defensive: T.DefensivePosition }>
> = {
  Ambushed: { offensive: "Engaged", defensive: "Flanked" },
  Spotted: { offensive: "Engaged", defensive: "In Cover" },
  Advantage: { offensive: "Flanking", defensive: "In Cover" },
  Surprise: { offensive: "Flanking", defensive: "In Cover" },
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

function parseThreatLevel(threat: ThreatContent): number {
  const match = threat.match(/\d+/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[0], 10);
}

function getMomentumToneClass(value: number): string {
  if (value <= -3) {
    return "dc-momentum-cell--critical";
  }
  if (value === -2) {
    return "dc-momentum-cell--negative";
  }
  if (value === -1) {
    return "dc-momentum-cell--caution";
  }
  if (value === 0) {
    return "dc-momentum-cell--neutral";
  }
  if (value === 1) {
    return "dc-momentum-cell--boost";
  }
  if (value >= 4) {
    return "dc-momentum-cell--peak";
  }
  return "dc-momentum-cell--positive";
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

interface NormalizedTrooper {
  storageIndex: number;
  storedId: number | null;
  displayId: number;
  name: string;
  status: T.Status;
  grit: number;
  ammo: number;
  weaponId: T.WeaponId;
  armorId: T.ArmorId;
  specialGear: string[];
  offensivePosition: T.OffensivePosition;
  defensivePosition: T.DefensivePosition;
}

export default function EngagementTab(props: EngagementTabProps) {
  const { mission, currentSectorId, onCurrentSectorChange, onMissionChange, onAddLog } = props;

  const [storedSquad, setStoredSquad] = React.useState<Partial<T.Trooper>[]>(() => getStoredSquad());
  const [storedArmory, setStoredArmory] = React.useState<T.SquadArmoryState>(() => getStoredArmory());
  const [openStatusIndex, setOpenStatusIndex] = React.useState<number | null>(null);
  const statusMenuRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  const persistSquad = React.useCallback(
    (updater: (prev: Partial<T.Trooper>[]) => Partial<T.Trooper>[]) => {
      setStoredSquad((prev) => {
        const next = updater(prev);
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new Event(SQUAD_UPDATED_EVENT));
          }
        } catch {
          // Ignore storage errors in engagement view; squad screen will remain authoritative.
        }
        return next;
      });
    },
    [],
  );

  const clampZeroToThree = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(3, Math.round(value)));
  }, []);

  const normalizedSquad = React.useMemo<NormalizedTrooper[]>(() => {
    return storedSquad.map((trooper, index) => {
      const storedId = typeof trooper?.id === "number" ? trooper.id : null;
      const displayId = storedId ?? index + 1;
      const name = typeof trooper?.name === "string" ? trooper.name : "";
      const status = (trooper?.status as T.Status) ?? "OK";
      const rawGrit = Number(trooper?.grit ?? Number.NaN);
      const grit = Number.isFinite(rawGrit) ? clampZeroToThree(rawGrit) : 3;
      const rawAmmo = Number(trooper?.ammo ?? Number.NaN);
      const ammo = Number.isFinite(rawAmmo) ? clampZeroToThree(rawAmmo) : 3;
      const weaponId = (trooper?.weaponId as T.WeaponId) ?? "assault_rifle";
      const armorId = (trooper?.armorId as T.ArmorId) ?? "medium";
      const specialGear = Array.isArray(trooper?.specialGear)
        ? (trooper.specialGear as string[])
        : [];
      const offensivePosition = (trooper?.offensivePosition as T.OffensivePosition) ?? "Engaged";
      const defensivePosition = (trooper?.defensivePosition as T.DefensivePosition) ?? "In Cover";

      return {
        storageIndex: index,
        storedId,
        displayId,
        name,
        status,
        grit,
        ammo,
        weaponId,
        armorId,
        specialGear,
        offensivePosition,
        defensivePosition,
      };
    });
  }, [clampZeroToThree, storedSquad]);

  const armoryIndex = React.useMemo(() => {
    const map = new Map<string, T.SquadInventoryItem>();
    storedArmory.items.forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [storedArmory.items]);

  const deployedSquad = React.useMemo(() => normalizedSquad.slice(0, 5), [normalizedSquad]);

  const hasSquadEntries = deployedSquad.length > 0;

  const threatSectors = React.useMemo(
    () =>
      mission.sectors.filter(
        (sector): sector is T.MissionSector & { content: ThreatContent } =>
          isThreatContent(sector.content),
      ),
    [mission.sectors],
  );

  const selectedSector = threatSectors.find((sector) => sector.id === currentSectorId) ?? null;
  const currentMomentum = selectedSector?.momentum ?? MOMENTUM_DEFAULT;
  const victoryThreshold = React.useMemo(() => {
    if (!selectedSector) {
      return null;
    }
    return Math.min(MOMENTUM_MAX, parseThreatLevel(selectedSector.content) + 1);
  }, [selectedSector]);
  const momentumStatus = React.useMemo(() => {
    if (victoryThreshold === null) {
      return null;
    }
    if (currentMomentum <= MOMENTUM_MIN) {
      return { label: "Defeat", tone: "defeat" as const };
    }
    if (currentMomentum >= victoryThreshold) {
      return { label: "Victory", tone: "victory" as const };
    }
    return null;
  }, [currentMomentum, victoryThreshold]);
  const momentumDecreaseDisabled = currentMomentum <= MOMENTUM_MIN;
  const momentumIncreaseDisabled = currentMomentum >= MOMENTUM_MAX;

  const squadAlerts = React.useMemo(() => {
    if (!selectedSector) {
      return [] as string[];
    }

    let fortifiedCount = 0;
    let flankingCount = 0;

    deployedSquad.forEach((trooper) => {
      if (trooper.defensivePosition === "Fortified") {
        fortifiedCount += 1;
      }
      if (trooper.offensivePosition === "Flanking") {
        flankingCount += 1;
      }
    });

    const messages: string[] = [];

    if (selectedSector.cover === "Exposed" && fortifiedCount > 0) {
      messages.push("Exposed - No Troopers can be Fortified.");
    }

    if (selectedSector.cover === "Normal" && fortifiedCount > 2) {
      messages.push("Normal Cover - No more than 2 Troopers can be Fortified.");
    }

    if (selectedSector.space === "Tight" && flankingCount > 0) {
      messages.push("Tight Quarters - No Troopers can be Flanking.");
    }

    if (selectedSector.space === "Transitional" && flankingCount > 2) {
      messages.push("Transitional Space - No more than 2 Troopers can be Flanking.");
    }

    return messages;
  }, [deployedSquad, selectedSector]);

  React.useEffect(() => {
    setOpenStatusIndex(null);
  }, [storedSquad]);

  React.useEffect(() => {
    if (openStatusIndex === null) {
      return undefined;
    }
    if (typeof document === "undefined") {
      return undefined;
    }

    const activeIndex = openStatusIndex as number;

    function handleDocumentClick(event: MouseEvent) {
      const container = statusMenuRefs.current.get(activeIndex);
      if (container && !container.contains(event.target as Node)) {
        setOpenStatusIndex(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenStatusIndex(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openStatusIndex]);

  const handleToggleStatusMenu = React.useCallback((index: number) => {
    setOpenStatusIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleStatusSelect = React.useCallback(
    (trooper: NormalizedTrooper, nextStatus: T.Status) => {
      if (trooper.status === nextStatus) {
        setOpenStatusIndex(null);
        return;
      }

      const displayName = trooper.name.trim() || `Trooper ${trooper.displayId}`;

      persistSquad((prev) =>
        prev.map((entry, index) => {
          if (index !== trooper.storageIndex) {
            return entry;
          }

          const base: Partial<T.Trooper> = entry ? { ...entry } : {};
          const next: Partial<T.Trooper> = {
            ...base,
            status: nextStatus,
          };
          if (trooper.storedId !== null) {
            next.id = trooper.storedId;
          }
          return next;
        }),
      );

      // Special KIA message format when status is Dead
      if (nextStatus === "Dead") {
        const sectorName = selectedSector ? getSectorDisplayName(selectedSector) : "Unknown Sector";
        const missionName = mission.name.trim() || "Unknown Mission";
        onAddLog(`++ ${displayName} down - status: KIA - ${sectorName} - Mission: ${missionName} ++`, "SYSTEM");
      } else {
        onAddLog(`${displayName} status changed to ${nextStatus}`, "SYSTEM");
      }
      setOpenStatusIndex(null);
    },
    [mission.name, onAddLog, persistSquad, selectedSector],
  );

  const handleResourceBump = React.useCallback(
    (trooper: NormalizedTrooper, key: "grit" | "ammo", delta: 1 | -1) => {
      persistSquad((prev) =>
        prev.map((entry, index) => {
          if (index !== trooper.storageIndex) {
            return entry;
          }

          const base: Partial<T.Trooper> = entry ? { ...entry } : {};
          const existing = Number.isFinite(base[key] as number)
            ? (base[key] as number)
            : trooper[key];
          const nextValue = clampZeroToThree(existing + delta);
          if (nextValue === existing) {
            return entry;
          }

          const next: Partial<T.Trooper> = {
            ...base,
            [key]: nextValue,
          };
          if (trooper.storedId !== null) {
            next.id = trooper.storedId;
          }
          return next;
        }),
      );
    },
    [clampZeroToThree, persistSquad],
  );

  const handleOffensivePositionChange = React.useCallback(
    (trooper: NormalizedTrooper, nextPosition: T.OffensivePosition) => {
      if (trooper.offensivePosition === nextPosition) {
        return;
      }

      persistSquad((prev) =>
        prev.map((entry, index) => {
          if (index !== trooper.storageIndex) {
            return entry;
          }

          const base: Partial<T.Trooper> = entry ? { ...entry } : {};
          const next: Partial<T.Trooper> = {
            ...base,
            offensivePosition: nextPosition,
          };
          if (trooper.storedId !== null) {
            next.id = trooper.storedId;
          }
          return next;
        }),
      );
    },
    [persistSquad],
  );

  const handleDefensivePositionChange = React.useCallback(
    (trooper: NormalizedTrooper, nextPosition: T.DefensivePosition) => {
      if (trooper.defensivePosition === nextPosition) {
        return;
      }

      persistSquad((prev) =>
        prev.map((entry, index) => {
          if (index !== trooper.storageIndex) {
            return entry;
          }

          const base: Partial<T.Trooper> = entry ? { ...entry } : {};
          const next: Partial<T.Trooper> = {
            ...base,
            defensivePosition: nextPosition,
          };
          if (trooper.storedId !== null) {
            next.id = trooper.storedId;
          }
          return next;
        }),
      );
    },
    [persistSquad],
  );

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

  const handleApplyAdvanceOutcome = React.useCallback(() => {
    if (!lastRoll) {
      return;
    }

    const positions = ADVANCE_OUTCOME_POSITIONS[lastRoll.outcome];
    if (!positions) {
      return;
    }

    persistSquad((prev) =>
      prev.map((entry) => {
        const base: Partial<T.Trooper> = entry ? { ...entry } : {};
        return {
          ...base,
          offensivePosition: positions.offensive,
          defensivePosition: positions.defensive,
        };
      }),
    );
  }, [lastRoll, persistSquad]);

  const advanceSectionId = React.useId();

  const rollIntervalRef = React.useRef<number | null>(null);
  const rollTimeoutRef = React.useRef<number | null>(null);
  const previousSectorIdRef = React.useRef<string | null>(null);

  const handleStoredSquadUpdate = React.useCallback(() => {
    setStoredSquad(getStoredSquad());
    setStoredArmory(getStoredArmory());
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

  const handleMomentumChange = React.useCallback(
    (delta: 1 | -1) => {
      if (!selectedSector) {
        return;
      }

      const existingMomentum = selectedSector.momentum ?? MOMENTUM_DEFAULT;
      const nextMomentum = Math.max(
        MOMENTUM_MIN,
        Math.min(MOMENTUM_MAX, existingMomentum + delta),
      );

      if (nextMomentum === existingMomentum) {
        return;
      }

      const storedSquadName = getStoredSquadName().trim();
      const squadName = storedSquadName || "Unnamed Squad";
      const sectorName = getSectorDisplayName(selectedSector);
      const threshold = Math.min(
        MOMENTUM_MAX,
        parseThreatLevel(selectedSector.content) + 1,
      );

      onMissionChange((prev) => ({
        ...prev,
        sectors: prev.sectors.map((sector) =>
          sector.id === selectedSector.id
            ? {
                ...sector,
                momentum: nextMomentum,
              }
            : sector,
        ),
      }));

      const logMessage =
        delta > 0
          ? `${squadName} gained Momentum (${formatModifier(nextMomentum)}) in ${sectorName}`
          : `${squadName} lost Momentum (${formatModifier(nextMomentum)}) in ${sectorName}`;
      onAddLog(logMessage, "SYSTEM");

      if (nextMomentum === MOMENTUM_MIN) {
        onAddLog(`${squadName} lost engagement in ${sectorName}`, "SYSTEM");
      } else if (nextMomentum === threshold) {
        onAddLog(`${squadName} won engagement in ${sectorName}`, "SYSTEM");
      }
    },
    [onAddLog, onMissionChange, selectedSector],
  );

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
                          {ADVANCE_OUTCOME_POSITIONS[lastRoll.outcome] ? (
                            <button
                              type="button"
                              className="dc-btn dc-btn--sm dc-advance-apply-button"
                              onClick={handleApplyAdvanceOutcome}
                            >
                              Apply
                            </button>
                          ) : null}
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

      <article className="dc-engagement-card dc-momentum-card">
        <header className="dc-momentum-header">
          <h3 className="dc-momentum-title">Momentum</h3>
          {victoryThreshold !== null ? (
            <span className="dc-momentum-target">
              Victory at {formatModifier(victoryThreshold)}
            </span>
          ) : null}
        </header>
        <div className="dc-momentum-controls">
          <button
            type="button"
            className="dc-btn dc-btn--sm dc-momentum-btn"
            onClick={() => handleMomentumChange(-1)}
            disabled={momentumDecreaseDisabled}
            aria-label="Decrease engagement momentum"
          >
            -
          </button>
          <div className="dc-momentum-scale" role="group" aria-label="Engagement momentum">
            {MOMENTUM_VALUES.map((value) => {
              const isActive = value === currentMomentum;
              const isTarget = victoryThreshold !== null && value === victoryThreshold;
              const toneClass = getMomentumToneClass(value);
              return (
                <div
                  key={value}
                  className={`dc-momentum-cell ${toneClass}${
                    isActive ? " is-active" : ""
                  }${isTarget ? " is-target" : ""}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="dc-momentum-cell-value">{formatModifier(value)}</span>
                  {isActive ? <span className="dc-momentum-cell-indicator" aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="dc-btn dc-btn--sm dc-momentum-btn"
            onClick={() => handleMomentumChange(1)}
            disabled={momentumIncreaseDisabled}
            aria-label="Increase engagement momentum"
          >
            +
          </button>
          {momentumStatus ? (
            <span
              className={`dc-momentum-status dc-momentum-status--${momentumStatus.tone}`}
              role="status"
              aria-live="polite"
            >
              {momentumStatus.label}
            </span>
          ) : null}
        </div>
      </article>

      <div className="dc-engagement-squad">
        <h3 className="dc-engagement-squad-title">Squad Status</h3>
            {selectedSector && squadAlerts.length > 0 ? (
              <div className="dc-engagement-squad-alerts" aria-live="polite">
                {squadAlerts.map((message) => (
                  <div key={message} className="dc-engagement-squad-alert" role="alert">
                    <span className="dc-engagement-squad-alert-icon" aria-hidden="true">
                      !
                    </span>
                    <span className="dc-engagement-squad-alert-text">{message}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {hasSquadEntries ? (
              <div className="dc-engagement-squad-list">
                {deployedSquad.map((trooper) => {
                  const statusDetail = STATUS_DETAILS[trooper.status];
                  const weapon = T.WEAPON_INDEX[trooper.weaponId];
                  const armor = T.ARMOR_INDEX[trooper.armorId];
                  const specialGearItems = trooper.specialGear.reduce<T.SpecialGear[]>((acc, itemId) => {
                    const inventoryItem = armoryIndex.get(itemId);
                    if (inventoryItem) {
                      const gear = T.SPECIAL_GEAR_INDEX[inventoryItem.gearId];
                      if (gear) {
                        acc.push(gear);
                      }
                      return acc;
                    }
                    const legacyGear = T.SPECIAL_GEAR_INDEX[itemId];
                    if (legacyGear) {
                      acc.push(legacyGear);
                    }
                    return acc;
                  }, []);
                  const specialGearNames = specialGearItems.length > 0
                    ? specialGearItems.map((gear) => gear.name).join(", ")
                    : "None";
                  const displayName = trooper.name.trim() || `Trooper ${trooper.displayId}`;
                  const cardKey = trooper.storedId ?? `idx-${trooper.storageIndex}`;
                  const baseId = `dc-engagement-squad-${trooper.displayId}-${trooper.storageIndex}`;
                  const weaponTooltipId = `${baseId}-weapon`;
                  const armorTooltipId = `${baseId}-armor`;
                  const gearTooltipId = `${baseId}-gear`;
                  const activeOffensiveOption = OFFENSIVE_POSITIONS.find(
                    (option) => option.value === trooper.offensivePosition,
                  );
                  const activeDefensiveOption = DEFENSIVE_POSITIONS.find(
                    (option) => option.value === trooper.defensivePosition,
                  );

                  return (
                    <article key={cardKey} className="dc-engagement-squad-card">
                      <div className="dc-engagement-squad-layout">
                        <div className="dc-engagement-squad-main">
                          <div className="dc-engagement-squad-row dc-engagement-squad-row--primary">
                            <div className="dc-engagement-squad-name" title={displayName}>
                              <span className="dc-engagement-squad-name-text">{displayName}</span>
                            </div>
                            <div
                              className="dc-engagement-squad-status"
                              ref={(element) => {
                                const map = statusMenuRefs.current;
                                if (element) {
                                  map.set(trooper.storageIndex, element);
                                } else {
                                  map.delete(trooper.storageIndex);
                                }
                              }}
                            >

                              <button
                                type="button"
                                className={`dc-status-indicator dc-status-indicator--${statusDetail.tone}`}
                                onClick={() => handleToggleStatusMenu(trooper.storageIndex)}
                                aria-haspopup="true"
                                aria-expanded={openStatusIndex === trooper.storageIndex}
                                aria-label={`Status: ${statusDetail.label}`}
                              >
                                <span className="dc-status-indicator__icon" aria-hidden="true" />
                              </button>
                               <span className="dc-engagement-squad-status-text">{statusDetail.label}</span>
                              {openStatusIndex === trooper.storageIndex ? (
                                <div className="dc-status-menu" role="menu">
                                  {T.STATUS_ORDER.map((statusOption) => {
                                    const optionDetail = STATUS_DETAILS[statusOption];
                                    const isActive = trooper.status === statusOption;
                                    return (
                                      <button
                                        type="button"
                                        key={statusOption}
                                        className={`dc-status-menu-option dc-status-menu-option--${optionDetail.tone}${
                                          isActive ? " is-active" : ""
                                        }`}
                                        onClick={() => handleStatusSelect(trooper, statusOption)}
                                        role="menuitemradio"
                                        aria-checked={isActive}
                                      >
                                        <span className="dc-status-menu-option-dot" aria-hidden="true" />
                                        <span>{optionDetail.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                            <div className="dc-engagement-squad-resource">
                              <span className="dc-engagement-squad-resource-label">Grit</span>
                              <div className="dc-inline-group">
                                <button
                                  type="button"
                                  className="dc-btn dc-btn--sm"
                                  onClick={() => handleResourceBump(trooper, "grit", -1)}
                                  aria-label={`Decrease ${displayName} grit`}
                                >
                                  -
                                </button>
                                <span className="dc-valbox">{trooper.grit}</span>
                                <button
                                  type="button"
                                  className="dc-btn dc-btn--sm"
                                  onClick={() => handleResourceBump(trooper, "grit", 1)}
                                  aria-label={`Increase ${displayName} grit`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div className="dc-engagement-squad-resource">
                              <span className="dc-engagement-squad-resource-label">Ammo</span>
                              <div className="dc-inline-group">
                                <button
                                  type="button"
                                  className="dc-btn dc-btn--sm"
                                  onClick={() => handleResourceBump(trooper, "ammo", -1)}
                                  aria-label={`Decrease ${displayName} ammo`}
                                >
                                  -
                                </button>
                                <span className="dc-valbox">{trooper.ammo}</span>
                                <button
                                  type="button"
                                  className="dc-btn dc-btn--sm"
                                  onClick={() => handleResourceBump(trooper, "ammo", 1)}
                                  aria-label={`Increase ${displayName} ammo`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="dc-engagement-squad-row dc-engagement-squad-row--positions">
                            <div className="dc-engagement-position-group">
                              <span className="dc-engagement-position-heading">Offensive Position</span>
                              <div className="dc-engagement-position-buttons">
                                {OFFENSIVE_POSITIONS.map((option) => {
                                  const isActive = trooper.offensivePosition === option.value;
                                  return (
                                    <button
                                      type="button"
                                      key={option.value}
                                      className={`dc-engagement-position-btn dc-engagement-position-btn--${option.tone}${
                                        isActive ? " is-active" : ""
                                      }`}
                                      onClick={() => handleOffensivePositionChange(trooper, option.value)}
                                      aria-pressed={isActive}
                                    >
                                      <span className="dc-engagement-position-btn__label">{option.value}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {activeOffensiveOption ? (
                                <div className="dc-engagement-position-detail" aria-live="polite">
                                  <span className="dc-engagement-position-detail__label">
                                    {activeOffensiveOption.value}:
                                  </span>
                                  <span className="dc-engagement-position-detail__text">
                                    {activeOffensiveOption.detail}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <div className="dc-engagement-position-group">
                              <span className="dc-engagement-position-heading">Defensive Position</span>
                              <div className="dc-engagement-position-buttons">
                                {DEFENSIVE_POSITIONS.map((option) => {
                                  const isActive = trooper.defensivePosition === option.value;
                                  return (
                                    <button
                                      type="button"
                                      key={option.value}
                                      className={`dc-engagement-position-btn dc-engagement-position-btn--${option.tone}${
                                        isActive ? " is-active" : ""
                                      }`}
                                      onClick={() => handleDefensivePositionChange(trooper, option.value)}
                                      aria-pressed={isActive}
                                    >
                                      <span className="dc-engagement-position-btn__label">{option.value}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {activeDefensiveOption ? (
                                <div className="dc-engagement-position-detail" aria-live="polite">
                                  <span className="dc-engagement-position-detail__label">
                                    {activeDefensiveOption.value}:
                                  </span>
                                  <span className="dc-engagement-position-detail__text">
                                    {activeDefensiveOption.detail}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="dc-engagement-squad-gear-column">
                          <div className="dc-engagement-gear-item">
                            <span className="dc-engagement-gear-label">Weapon</span>
                            <span className="dc-engagement-gear-value">
                              {weapon?.name ?? "Unknown"}
                              <span className="dc-tip dc-tip--icon">
                                <button
                                  type="button"
                                  className="dc-tip-icon"
                                  aria-label={`View ${weapon?.name ?? "weapon"} details`}
                                  aria-describedby={weaponTooltipId}
                                >
                                  i
                                </button>
                                <div id={weaponTooltipId} role="tooltip" className="dc-tip__bubble">
                                  <strong>{weapon?.name ?? "Unknown Weapon"}</strong>
                                  <p>{weapon?.info ?? "No additional weapon information available."}</p>
                                </div>
                              </span>
                            </span>
                          </div>
                          <div className="dc-engagement-gear-item">
                            <span className="dc-engagement-gear-label">Armor</span>
                            <span className="dc-engagement-gear-value">
                              {armor?.name ?? "Unknown"}
                              <span className="dc-tip dc-tip--icon">
                                <button
                                  type="button"
                                  className="dc-tip-icon"
                                  aria-label={`View ${armor?.name ?? "armor"} details`}
                                  aria-describedby={armorTooltipId}
                                >
                                  i
                                </button>
                                <div id={armorTooltipId} role="tooltip" className="dc-tip__bubble">
                                  <strong>{armor?.name ?? "Unknown Armor"}</strong>
                                  <p>{armor?.info ?? "No additional armor information available."}</p>
                                </div>
                              </span>
                            </span>
                          </div>
                          <div className="dc-engagement-gear-item">
                            <span className="dc-engagement-gear-label">Special Gear</span>
                            <span className="dc-engagement-gear-value">
                              {specialGearNames}
                              <span className="dc-tip dc-tip--icon">
                                <button
                                  type="button"
                                  className="dc-tip-icon"
                                  aria-label={`View special gear details for ${displayName}`}
                                  aria-describedby={gearTooltipId}
                                >
                                  i
                                </button>
                                <div id={gearTooltipId} role="tooltip" className="dc-tip__bubble">
                                  {specialGearItems.length > 0 ? (
                                    specialGearItems.map((gear) => (
                                      <div key={gear.id} className="dc-engagement-gear-tip">
                                        <strong>{gear.name}</strong>
                                        <p className="dc-engagement-gear-tip-description">{gear.description}</p>
                                        <p className="dc-engagement-gear-tip-function">{gear.function}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <p>No special gear assigned.</p>
                                  )}
                                </div>
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="dc-engagement-squad-empty">No squad information stored.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="dc-engagement-empty">Select a Threat Level sector to review engagement intel.</p>
      )}
    </section>
  );
}
