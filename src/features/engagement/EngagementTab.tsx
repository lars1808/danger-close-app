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
  injuryThreshold?: number;
};

type MomentumStatus = { label: string; tone: "victory" | "defeat" };

type TrooperDefenseRow = {
  id: string;
  name: string;
  modifiers: string;
  resultLabel: string;
  resultTone:
    | "shielded"
    | "injury"
    | "status-ok"
    | "status-grazed"
    | "status-wounded"
    | "status-bleeding"
    | "status-dead";
  appearance?: "fortified" | "in-cover" | "flanked";
  coveringFireBy?: string | null;
  atRisk?: boolean;
};

const OFFENSIVE_POSITIONS: PositionOption<T.OffensivePosition>[] = [
  { value: "Flanking", tone: "positive", detail: "+1d6 when Firing" },
  { value: "Engaged", tone: "caution", detail: "No bonus when Firing" },
  { value: "Limited", tone: "negative", detail: "-1d6 when Firing" },
];

const DEFENSIVE_POSITIONS: PositionOption<T.DefensivePosition>[] = [
  { value: "Fortified", tone: "positive", detail: "Injury on 1", injuryThreshold: 1 },
  { value: "In Cover", tone: "caution", detail: "Injury on 1-2", injuryThreshold: 2 },
  { value: "Flanked", tone: "negative", detail: "Injury on 1-3", injuryThreshold: 3 },
];

type TacticTableEntry = {
  id: string;
  effect: React.ReactNode;
  description: string;
};

const TACTIC_TABLE: readonly TacticTableEntry[] = [
  {
    id: "quick-flank",
    effect: (
      <>
        <strong>Quick Flank:</strong> One random <strong>Fortified</strong> Trooper is now {""}
        <strong>Flanked</strong>.
      </>
    ),
    description:
      "An enemy unit slips past defenses to threaten a fortified position.",
  },
  {
    id: "encircle",
    effect: (
      <>
        <strong>Encircle:</strong> All <strong>Fortified</strong> Troopers are now <strong>In Cover</strong>.
      </>
    ),
    description: "The squad’s positions are compromised by encroaching enemies.",
  },
  {
    id: "push-forward",
    effect: (
      <>
        <strong>Push Forward:</strong> All Troopers reduce their <strong>Defensive Position by 1 step</strong>.
      </>
    ),
    description: "The enemy presses the attack, forcing everyone to adjust or take fire.",
  },
  {
    id: "reposition",
    effect: (
      <>
        <strong>Reposition:</strong> One <strong>Flanking</strong> Trooper is now <strong>Engaged</strong>.
      </>
    ),
    description: "An enemy maneuver cuts off their advance route.",
  },
  {
    id: "fall-back",
    effect: (
      <>
        <strong>Fall Back:</strong> All <strong>Flanking</strong> Troopers are now <strong>Engaged</strong>.
      </>
    ),
    description: "The squad’s flanking efforts collapse under enemy counter-pressure.",
  },
  {
    id: "scatter",
    effect: (
      <>
        <strong>Scatter:</strong> A grenade lands at the feet of a random Trooper. They must {""}
        <strong>Move</strong> during the next Exchange or take <strong>+1 Injury</strong>.
      </>
    ),
    description: "The battlefield erupts in chaos - act fast or pay the price.",
  },
];

const TROOPER_INTENTS: { value: T.TrooperIntent; label: string }[] = [
  { value: "Fire", label: "Fire" },
  { value: "Move Up", label: "Move Up" },
  { value: "Fall Back", label: "Fall Back" },
  { value: "Covering Fire", label: "Covering Fire" },
  { value: "Use Special Gear", label: "Use Special Gear" },
  { value: "Interact", label: "Interact" },
  { value: "Disengage", label: "Disengage" },
];

const TROOPER_INTENT_VALUES = TROOPER_INTENTS.map((option) => option.value);

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

const TACTIC_ROLL_TICK_INTERVAL = 120;
const TACTIC_ROLL_ANIMATION_DURATION = 1200;

function determineAdvanceOutcome(total: number, threat: ThreatContent): AdvanceOutcome {
  if (threat === "TL 4") {
    if (total <= 3) {
      return "Ambushed";
    }
    return "Spotted";
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
    if (total === 5) {
      return "Advantage";
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

function generateHardTargetId(): string {
  return `hard-target-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  intent: T.TrooperIntent | null;
  coveringFireTargetId: number | null;
  atRisk: boolean;
}

interface TrooperOffenseContribution {
  trooperId: string;
  name: string;
  value: number;
  detail: string;
}

function formatSignedValue(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }
  if (value < 0) {
    return `${value}`;
  }
  return "0";
}

export default function EngagementTab(props: EngagementTabProps) {
  const { mission, currentSectorId, onCurrentSectorChange, onMissionChange, onAddLog } = props;

  const [storedSquad, setStoredSquad] = React.useState<Partial<T.Trooper>[]>(() => getStoredSquad());
  const [storedArmory, setStoredArmory] = React.useState<T.SquadArmoryState>(() => getStoredArmory());
  const [openStatusIndex, setOpenStatusIndex] = React.useState<number | null>(null);
  const statusMenuRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  const isSelfPersistingSquadRef = React.useRef(false);

  const persistSquad = React.useCallback(
    (updater: (prev: Partial<T.Trooper>[]) => Partial<T.Trooper>[]) => {
      setStoredSquad((prev) => {
        const next = updater(prev);
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(next));
            isSelfPersistingSquadRef.current = true;
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
      const intent = TROOPER_INTENT_VALUES.includes(trooper?.intent as T.TrooperIntent)
        ? (trooper?.intent as T.TrooperIntent)
        : null;
      const coveringFireTargetId = typeof trooper?.coveringFireTargetId === "number"
        ? trooper.coveringFireTargetId
        : null;
      const atRisk = trooper?.atRisk === true;

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
        intent,
        coveringFireTargetId,
        atRisk,
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

  const hasIntentAssignments = React.useMemo(
    () => normalizedSquad.some((trooper) => trooper.intent !== null),
    [normalizedSquad],
  );

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
  const selectedSectorId = selectedSector?.id ?? null;
  const hardTargets = selectedSector?.hardTargets ?? [];
  const threatLevel = React.useMemo(() => {
    if (!selectedSector) {
      return null;
    }
    return parseThreatLevel(selectedSector.content);
  }, [selectedSector]);
  const victoryThreshold = React.useMemo(() => {
    if (threatLevel === null) {
      return null;
    }
    return Math.min(MOMENTUM_MAX, threatLevel + 1);
  }, [threatLevel]);
  const baseMomentumStatus = React.useMemo<MomentumStatus | null>(() => {
    if (victoryThreshold === null) {
      return null;
    }
    if (currentMomentum <= MOMENTUM_MIN) {
      return { label: "Defeat", tone: "defeat" };
    }
    if (currentMomentum >= victoryThreshold) {
      return { label: "Victory", tone: "victory" };
    }
    return null;
  }, [currentMomentum, victoryThreshold]);
  const defenseOutcome = React.useMemo<
    | {
        status: MomentumStatus;
        message?: string;
      }
    | null
  >(() => {
    if (!isDefenseObjectiveEnabled || defenseExchangeGoal === null || defenseExchangeGoal > 0) {
      return null;
    }

    if (currentMomentum >= 1) {
      return { status: { label: "Victory", tone: "victory" } };
    }

    return {
      status: { label: "Defeat", tone: "defeat" },
      message: "The Sector has fallen.",
    };
  }, [currentMomentum, defenseExchangeGoal, isDefenseObjectiveEnabled]);
  const momentumStatus = defenseOutcome?.status ?? baseMomentumStatus;
  const momentumDecreaseDisabled = currentMomentum <= MOMENTUM_MIN;
  const momentumIncreaseDisabled = currentMomentum >= MOMENTUM_MAX;

  const handleAddHardTarget = React.useCallback(() => {
    if (!selectedSectorId) {
      return;
    }

    const newTarget: T.HardTarget = {
      id: generateHardTargetId(),
      name: "",
      hits: 3,
    };

    onMissionChange((prev) => ({
      ...prev,
      sectors: prev.sectors.map((sector) =>
        sector.id === selectedSectorId
          ? {
              ...sector,
              hardTargets: [...sector.hardTargets, newTarget],
            }
          : sector,
      ),
    }));
  }, [onMissionChange, selectedSectorId]);

  const handleHardTargetNameChange = React.useCallback(
    (targetId: string, value: string) => {
      if (!selectedSectorId) {
        return;
      }

      const existingTarget = hardTargets.find((target) => target.id === targetId);
      if (existingTarget && existingTarget.name === value) {
        return;
      }

      onMissionChange((prev) => ({
        ...prev,
        sectors: prev.sectors.map((sector) =>
          sector.id === selectedSectorId
            ? {
                ...sector,
                hardTargets: sector.hardTargets.map((target) =>
                  target.id === targetId ? { ...target, name: value } : target,
                ),
              }
            : sector,
        ),
      }));
    },
    [hardTargets, onMissionChange, selectedSectorId],
  );

  const handleDeleteHardTarget = React.useCallback(
    (targetId: string) => {
      if (!selectedSectorId) {
        return;
      }

      onMissionChange((prev) => ({
        ...prev,
        sectors: prev.sectors.map((sector) =>
          sector.id === selectedSectorId
            ? {
                ...sector,
                hardTargets: sector.hardTargets.filter((target) => target.id !== targetId),
              }
            : sector,
        ),
      }));
    },
    [onMissionChange, selectedSectorId],
  );

  const handleHardTargetHitsUpdate = React.useCallback(
    (targetId: string, rawNextHits: number) => {
      if (!selectedSectorId) {
        return;
      }

      const target = hardTargets.find((item) => item.id === targetId);
      if (!target) {
        return;
      }

      const parsedHits = Number(rawNextHits);
      const nextHits = Number.isFinite(parsedHits) ? Math.max(0, Math.round(parsedHits)) : 0;

      if (nextHits === target.hits) {
        return;
      }

      onMissionChange((prev) => ({
        ...prev,
        sectors: prev.sectors.map((sector) =>
          sector.id === selectedSectorId
            ? {
                ...sector,
                hardTargets: sector.hardTargets.map((item) =>
                  item.id === targetId ? { ...item, hits: nextHits } : item,
                ),
              }
            : sector,
        ),
      }));

      if (target.hits > 0 && nextHits <= 0) {
        const storedSquadName = getStoredSquadName().trim();
        const squadName = storedSquadName || "Unnamed Squad";
        const targetName = target.name.trim() || "Hard Target";
        onAddLog(`++ ${squadName} has neutralized ${targetName} ++`, "SYSTEM");
      }
    },
    [hardTargets, onAddLog, onMissionChange, selectedSectorId],
  );

  const handleHardTargetHitsInputChange = React.useCallback(
    (targetId: string, value: string) => {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        handleHardTargetHitsUpdate(targetId, 0);
      } else {
        handleHardTargetHitsUpdate(targetId, parsed);
      }
    },
    [handleHardTargetHitsUpdate],
  );

  const [isDefenseObjectiveEnabled, setIsDefenseObjectiveEnabled] = React.useState(false);
  const [defenseExchangeGoal, setDefenseExchangeGoal] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (threatLevel === null) {
      setIsDefenseObjectiveEnabled(false);
      setDefenseExchangeGoal(null);
      return;
    }

    setIsDefenseObjectiveEnabled(false);
    const randomOffset = Math.random() < 0.5 ? 1 : 2;
    setDefenseExchangeGoal(threatLevel + randomOffset);
  }, [threatLevel]);

  const handleDefenseExchangeGoalChange = React.useCallback((delta: 1 | -1) => {
    setDefenseExchangeGoal((previous) => {
      if (previous === null) {
        return previous;
      }

      const nextValue = Math.max(0, clampNonNegativeInteger(previous + delta));
      return nextValue;
    });
  }, []);

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
          const rawExisting = Number.isFinite(base[key] as number)
            ? (base[key] as number)
            : trooper[key];
          const existing = clampZeroToThree(rawExisting);
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

  const handleIntentChange = React.useCallback(
    (trooper: NormalizedTrooper, nextIntent: T.TrooperIntent | null, coveringFireTargetId?: number | null) => {
      if (trooper.intent === nextIntent && trooper.coveringFireTargetId === (coveringFireTargetId ?? null)) {
        return;
      }

      persistSquad((prev) =>
        prev.map((entry, index) => {
          if (index !== trooper.storageIndex) {
            return entry;
          }

          const base: Partial<T.Trooper> = entry ? { ...entry } : {};

          if (nextIntent === null) {
            if (!('intent' in base)) {
              return entry;
            }

            const next = { ...base };
            delete next.intent;
            delete next.coveringFireTargetId;
            if (trooper.storedId !== null) {
              next.id = trooper.storedId;
            }
            return next;
          }

          const next: Partial<T.Trooper> = {
            ...base,
            intent: nextIntent,
          };

          // Handle covering fire target
          if (nextIntent === "Covering Fire" && coveringFireTargetId !== undefined) {
            next.coveringFireTargetId = coveringFireTargetId;
          } else {
            // Clear covering fire target for non-covering fire intents
            delete next.coveringFireTargetId;
          }

          if (trooper.storedId !== null) {
            next.id = trooper.storedId;
          }
          return next;
        }),
      );
    },
    [persistSquad],
  );

  const handleClearAllIntents = React.useCallback(() => {
    if (!hasIntentAssignments) {
      return;
    }

    persistSquad((prev) =>
      prev.map((entry, index) => {
        const trooper = normalizedSquad[index];
        const entryHasIntent = Boolean(entry && 'intent' in entry);
        const trooperHasIntent = Boolean(trooper && trooper.intent !== null);
        const entryHasAtRisk = Boolean(entry && 'atRisk' in entry);
        const trooperHasAtRisk = Boolean(trooper && trooper.atRisk);

        if (!entryHasIntent && !trooperHasIntent && !entryHasAtRisk && !trooperHasAtRisk) {
          return entry;
        }

        const next: Partial<T.Trooper> = entry ? { ...entry } : {};
        if ('intent' in next) {
          delete next.intent;
        }
        if ('atRisk' in next) {
          delete next.atRisk;
        }

        if (trooper?.storedId !== null) {
          next.id = trooper.storedId;
        }

        return next;
      }),
    );
  }, [hasIntentAssignments, normalizedSquad, persistSquad]);

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
    if (isSelfPersistingSquadRef.current) {
      isSelfPersistingSquadRef.current = false;
      return;
    }
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

  type PlanningTab = "intent" | "offense" | "defense" | "momentum" | "tactics";

  const PLANNING_TABS: { id: PlanningTab; label: string }[] = [
    { id: "intent", label: "Intent" },
    { id: "offense", label: "Offense" },
    { id: "defense", label: "Defense" },
    { id: "momentum", label: "Momentum" },
    { id: "tactics", label: "Tactics" },
  ];

  const [activePlanningTab, setActivePlanningTab] = React.useState<PlanningTab>("intent");

  // Intent selection modal state
  const [intentModalTrooper, setIntentModalTrooper] = React.useState<NormalizedTrooper | null>(null);
  const [coveringFireModalTrooper, setCoveringFireModalTrooper] = React.useState<NormalizedTrooper | null>(null);
  const [showAtRiskModal, setShowAtRiskModal] = React.useState(false);

  const [offenseDiceBySector, setOffenseDiceBySector] = React.useState<
    Map<string, { value: number; isManual: boolean }>
  >(() => new Map());

  const [highlightedTacticId, setHighlightedTacticId] = React.useState<string | null>(null);
  const [isRollingTactic, setIsRollingTactic] = React.useState(false);
  const tacticRollIntervalRef = React.useRef<ReturnType<typeof window.setInterval> | null>(null);
  const tacticRollTimeoutRef = React.useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const pickRandomTactic = React.useCallback(() => {
    const index = Math.floor(Math.random() * TACTIC_TABLE.length);
    return TACTIC_TABLE[index];
  }, []);

  const clearTacticRollTimers = React.useCallback(() => {
    if (tacticRollIntervalRef.current !== null) {
      window.clearInterval(tacticRollIntervalRef.current);
      tacticRollIntervalRef.current = null;
    }

    if (tacticRollTimeoutRef.current !== null) {
      window.clearTimeout(tacticRollTimeoutRef.current);
      tacticRollTimeoutRef.current = null;
    }
  }, []);

  const handleTacticRoll = React.useCallback(() => {
    if (threatLevel === null || isRollingTactic) {
      return;
    }

    setIsRollingTactic(true);

    const initialSelection = pickRandomTactic();
    setHighlightedTacticId(initialSelection.id);

    tacticRollIntervalRef.current = window.setInterval(() => {
      const nextSelection = pickRandomTactic();
      setHighlightedTacticId(nextSelection.id);
    }, TACTIC_ROLL_TICK_INTERVAL);

    tacticRollTimeoutRef.current = window.setTimeout(() => {
      clearTacticRollTimers();
      const finalSelection = pickRandomTactic();
      setHighlightedTacticId(finalSelection.id);
      setIsRollingTactic(false);
    }, TACTIC_ROLL_ANIMATION_DURATION);
  }, [
    clearTacticRollTimers,
    isRollingTactic,
    pickRandomTactic,
    threatLevel,
  ]);

  React.useEffect(() => {
    if (activePlanningTab !== "tactics" && isRollingTactic) {
      clearTacticRollTimers();
      setIsRollingTactic(false);
    }
  }, [activePlanningTab, clearTacticRollTimers, isRollingTactic]);

  React.useEffect(() => () => clearTacticRollTimers(), [clearTacticRollTimers]);

  React.useEffect(() => {
    if (threatLevel === null) {
      setHighlightedTacticId(null);
    }
  }, [threatLevel]);

  const activeTrooperIntents = React.useMemo(
    () =>
      deployedSquad.map((trooper) => {
        const displayName = trooper.name.trim() || `Trooper ${trooper.displayId}`;
        const isBleedingOutOrDead = trooper.status === "Bleeding Out" || trooper.status === "Dead";

        return {
          id: `trooper-${trooper.storageIndex}`,
          trooper,
          displayName,
          isUnavailable: isBleedingOutOrDead,
          statusDetail: isBleedingOutOrDead ? STATUS_DETAILS[trooper.status].label : null,
        };
      }),
    [deployedSquad],
  );

  const activeTrooperDefenses = React.useMemo<TrooperDefenseRow[]>(() => {
    const fallbackOption =
      DEFENSIVE_POSITIONS.find((option) => option.value === "In Cover") ??
      ({ value: "In Cover", tone: "caution", detail: "Injury on 1-2", injuryThreshold: 2 } as const);

    return deployedSquad.map((trooper) => {
      const displayName = trooper.name.trim() || `Trooper ${trooper.displayId}`;
      const isBleedingOutOrDead = trooper.status === "Bleeding Out" || trooper.status === "Dead";
      if (isBleedingOutOrDead) {
        const statusDetail = STATUS_DETAILS[trooper.status];
        const resultTone = `status-${statusDetail.tone}` as TrooperDefenseRow["resultTone"];
        return {
          id: `trooper-${trooper.storageIndex}`,
          name: displayName,
          modifiers: "—",
          resultLabel: statusDetail.label,
          resultTone,
          atRisk: trooper.atRisk,
        };
      }

      // Check if intent overrides defensive position
      let baseInjuryThreshold: number;
      let positionLabel: string;
      let appearance: "fortified" | "in-cover" | "flanked" | undefined;

      if (trooper.intent === "Move Up") {
        // Moving Up: counts as Flanked (Injury on 3)
        baseInjuryThreshold = 3;
        positionLabel = "Moving Up";
        appearance = "flanked";
      } else if (trooper.intent === "Fall Back") {
        // Falling Back: counts as In Cover (Injury on 2)
        baseInjuryThreshold = 2;
        positionLabel = "Falling Back";
        appearance = "in-cover";
      } else {
        // Use the defensive position normally
        const defensiveOption =
          DEFENSIVE_POSITIONS.find((option) => option.value === trooper.defensivePosition) ??
          fallbackOption;
        baseInjuryThreshold = defensiveOption.injuryThreshold ?? 2;
        positionLabel = defensiveOption.value;
        appearance =
          defensiveOption.value === "Fortified"
            ? "fortified"
            : defensiveOption.value === "In Cover"
              ? "in-cover"
              : defensiveOption.value === "Flanked"
                ? "flanked"
                : undefined;
      }

      // Apply heavy armor modifier
      const heavyArmorModifier = trooper.armorId === "heavy" ? -1 : 0;
      const activeThreshold = Math.max(baseInjuryThreshold + heavyArmorModifier, 0);

      const activeThresholdLabel = (() => {
        if (activeThreshold <= 0) {
          return "Fully shielded";
        }
        if (activeThreshold === 1) {
          return "Injury on 1";
        }
        return `Injury on ${activeThreshold} or lower`;
      })();

      const modifiers = [
        positionLabel,
        trooper.armorId === "heavy" ? "Heavy Armor" : null,
      ]
        .filter(Boolean)
        .join(" + ");

      // Find who is providing covering fire for this trooper
      const coveringFireProvider = deployedSquad.find(
        (t) => t.intent === "Covering Fire" && t.coveringFireTargetId === trooper.storedId
      );
      const coveringFireBy = coveringFireProvider
        ? coveringFireProvider.name.trim() || `Trooper ${coveringFireProvider.displayId}`
        : null;

      return {
        id: `trooper-${trooper.storageIndex}`,
        name: displayName,
        modifiers,
        resultLabel: activeThresholdLabel,
        resultTone: (activeThreshold <= 0 ? "shielded" : "injury") as TrooperDefenseRow["resultTone"],
        appearance,
        coveringFireBy,
        atRisk: trooper.atRisk,
      };
    });
  }, [deployedSquad]);

  const activeTroopers = React.useMemo(
    () =>
      deployedSquad.filter(
        (trooper) => trooper.status !== "Bleeding Out" && trooper.status !== "Dead",
      ),
    [deployedSquad],
  );

  const offensiveFlankingTroopers = React.useMemo(
    () =>
      activeTroopers
        .filter((trooper) => trooper.offensivePosition === "Flanking")
        .map((trooper) => trooper.name.trim() || `Trooper ${trooper.displayId}`),
    [activeTroopers],
  );

  const defensiveFortifiedTroopers = React.useMemo(
    () =>
      activeTroopers
        .filter((trooper) => trooper.defensivePosition === "Fortified")
        .map((trooper) => trooper.name.trim() || `Trooper ${trooper.displayId}`),
    [activeTroopers],
  );

  const defensiveFlankedTroopers = React.useMemo(
    () =>
      activeTroopers
        .filter((trooper) => trooper.defensivePosition === "Flanked")
        .map((trooper) => trooper.name.trim() || `Trooper ${trooper.displayId}`),
    [activeTroopers],
  );

  const formatTrooperSummary = React.useCallback((trooperNames: string[]) => {
    if (trooperNames.length === 0) {
      return "None";
    }
    return trooperNames.join(", ");
  }, []);

  const flankingTrooperSummary = React.useMemo(
    () => formatTrooperSummary(offensiveFlankingTroopers),
    [formatTrooperSummary, offensiveFlankingTroopers],
  );

  const fortifiedTrooperSummary = React.useMemo(
    () => formatTrooperSummary(defensiveFortifiedTroopers),
    [defensiveFortifiedTroopers, formatTrooperSummary],
  );

  const flankedTrooperSummary = React.useMemo(
    () => formatTrooperSummary(defensiveFlankedTroopers),
    [defensiveFlankedTroopers, formatTrooperSummary],
  );

  const sectorSpace = selectedSector?.space ?? null;

  const offenseContributions = React.useMemo<TrooperOffenseContribution[]>(() => {
    if (activeTroopers.length === 0) {
      return [];
    }

    return activeTroopers.map((trooper) => {
      const trooperId = `trooper-${trooper.storageIndex}`;
      const displayName = trooper.name.trim() || `Trooper ${trooper.displayId}`;
      const assignedGearIds = new Set<string>();

      trooper.specialGear.forEach((gearRef) => {
        const inventoryItem = armoryIndex.get(gearRef);
        if (inventoryItem) {
          assignedGearIds.add(inventoryItem.gearId);
        } else if (T.SPECIAL_GEAR_INDEX[gearRef]) {
          assignedGearIds.add(gearRef);
        }
      });

      if (trooper.intent !== "Fire") {
        const detail =
          trooper.intent === null
            ? "No intent selected. Not firing."
            : `Intent: ${trooper.intent}. Not firing.`;

        return {
          trooperId,
          name: displayName,
          value: 0,
          detail,
        };
      }

      let total = 1;
      const detailParts = ["Fire (+1)"];

      if (trooper.offensivePosition === "Flanking") {
        total += 1;
        detailParts.push("Flanking (+1)");
      }

      if (trooper.offensivePosition === "Limited") {
        total -= 1;
        detailParts.push("Limited (-1)");
      }

      if (
        trooper.weaponId === "marksman_rifle" &&
        trooper.offensivePosition === "Limited" &&
        (sectorSpace === "Transitional" || sectorSpace === "Open")
      ) {
        total += 1;
        detailParts.push("Marksman Rifle (+1)");
      }

      if (
        trooper.weaponId === "carbine" &&
        trooper.offensivePosition === "Engaged" &&
        sectorSpace === "Tight"
      ) {
        total += 1;
        detailParts.push("Carbine (+1)");
      }

      if (trooper.defensivePosition === "Fortified") {
        if (assignedGearIds.has("sniper_rifle")) {
          total += 1;
          detailParts.push("Sniper Rifle (+1)");
        }

        if (assignedGearIds.has("hmg")) {
          total += 1;
          detailParts.push("HMG (+1)");
        }
      }

      return {
        trooperId,
        name: displayName,
        value: total,
        detail: detailParts.join(", "),
      };
    });
  }, [activeTroopers, armoryIndex, sectorSpace]);

  const offenseComputedTotal = React.useMemo(() => {
    return offenseContributions.reduce((sum, contribution) => sum + contribution.value, 0);
  }, [offenseContributions]);

  // Helper functions for intent selection
  const getValidCoveringFireTargets = React.useCallback((currentTrooper: NormalizedTrooper) => {
    return activeTroopers.filter(
      (t) =>
        t.storageIndex !== currentTrooper.storageIndex &&
        (t.intent === "Move Up" || t.intent === "Fall Back" || t.intent === "Interact")
    );
  }, [activeTroopers]);

  const getIntentDisplayText = React.useCallback((trooper: NormalizedTrooper) => {
    if (!trooper.intent) {
      return "Select Intent";
    }

    if (trooper.intent === "Covering Fire" && trooper.coveringFireTargetId !== null) {
      const target = normalizedSquad.find((t) => t.storedId === trooper.coveringFireTargetId);
      if (target) {
        const targetName = target.name.trim() || `Trooper ${target.displayId}`;
        return `Covering Fire: ${targetName}`;
      }
    }

    return trooper.intent;
  }, [normalizedSquad]);

  const handleSelectIntent = React.useCallback((trooper: NormalizedTrooper, intent: T.TrooperIntent) => {
    if (intent === "Covering Fire") {
      // Check if there are valid targets
      const validTargets = activeTroopers.filter(
        (t) =>
          t.storageIndex !== trooper.storageIndex &&
          (t.intent === "Move Up" || t.intent === "Fall Back" || t.intent === "Interact")
      );

      if (validTargets.length > 0) {
        // Open covering fire modal
        setCoveringFireModalTrooper(trooper);
        setIntentModalTrooper(null);
      } else {
        // No valid targets, just set the intent without a target
        handleIntentChange(trooper, intent, null);
        setIntentModalTrooper(null);
      }
    } else {
      // For other intents, just set the intent
      handleIntentChange(trooper, intent);
      setIntentModalTrooper(null);
    }
  }, [activeTroopers, handleIntentChange]);

  const handleSelectCoveringFireTarget = React.useCallback((trooper: NormalizedTrooper, targetId: number) => {
    handleIntentChange(trooper, "Covering Fire", targetId);
    setCoveringFireModalTrooper(null);
  }, [handleIntentChange]);

  const getOffenseContributionForTrooper = React.useCallback((trooper: NormalizedTrooper) => {
    return offenseContributions.find((c) => c.trooperId === `trooper-${trooper.storageIndex}`);
  }, [offenseContributions]);

  const defenseThreatMessage = React.useMemo(() => {
    if (threatLevel === null) {
      return null;
    }

    if (threatLevel === 1 || threatLevel === 2) {
      return "Troopers take 1 Injury if hit";
    }

    if (threatLevel === 3) {
      return "Troopers have 2-in-6 odds of 2 Injuries if hit (otherwise 1 Injury)";
    }

    if (threatLevel === 4) {
      return "Troopers have 3-in-6 odds of 2 Injuries if hit (otherwise 1 Injury)";
    }

    return null;
  }, [threatLevel]);

  const offenseDiceCount = React.useMemo(() => {
    if (!selectedSectorId) {
      return offenseComputedTotal;
    }

    const entry = offenseDiceBySector.get(selectedSectorId);
    return entry?.value ?? offenseComputedTotal;
  }, [offenseComputedTotal, offenseDiceBySector, selectedSectorId]);

  const handlePlanningTabSelect = React.useCallback((tab: PlanningTab) => {
    setActivePlanningTab(tab);
  }, []);

  const handleOffenseDiceAdjust = React.useCallback(
    (delta: 1 | -1) => {
      if (!selectedSectorId) {
        return;
      }

      setOffenseDiceBySector((prev) => {
        const next = new Map(prev);
        const existing = next.get(selectedSectorId);
        const baseValue = offenseComputedTotal;
        const currentValue = existing?.value ?? baseValue;
        const updatedValue = Math.max(0, currentValue + delta);
        next.set(selectedSectorId, {
          value: updatedValue,
          isManual: updatedValue !== offenseComputedTotal,
        });
        return next;
      });
    },
    [offenseComputedTotal, selectedSectorId],
  );

  React.useEffect(() => {
    if (!selectedSectorId) {
      return;
    }

    setOffenseDiceBySector((prev) => {
      const existing = prev.get(selectedSectorId);
      if (existing && !existing.isManual && existing.value === offenseComputedTotal) {
        return prev;
      }

      if (!existing || existing.isManual || existing.value !== offenseComputedTotal) {
        const next = new Map(prev);
        next.set(selectedSectorId, { value: offenseComputedTotal, isManual: false });
        return next;
      }

      return prev;
    });
  }, [offenseComputedTotal, selectedSectorId]);

  const offenseDiceLabel = React.useMemo(() => {
    return offenseDiceCount <= 0 ? "0d6" : `${offenseDiceCount}d6`;
  }, [offenseDiceCount]);

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
      const threshold = Math.min(MOMENTUM_MAX, (threatLevel ?? 0) + 1);

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
    [onAddLog, onMissionChange, selectedSector, threatLevel],
  );

  // Engagement outcome handlers
  const handlePushedBack = React.useCallback(() => {
    handleMomentumChange(-1);
  }, [handleMomentumChange]);

  const handleHoldPosition = React.useCallback(() => {
    const storedSquadName = getStoredSquadName().trim();
    const squadName = storedSquadName || "Unnamed Squad";
    onAddLog(`${squadName} stands their ground.`, "SYSTEM");
  }, [onAddLog]);

  const handleSuccessAtCost = React.useCallback(() => {
    handleMomentumChange(1);
    const storedSquadName = getStoredSquadName().trim();
    const squadName = storedSquadName || "Unnamed Squad";
    onAddLog(`${squadName} manages to push forward, but not without risk.`, "SYSTEM");
    setShowAtRiskModal(true);
  }, [handleMomentumChange, onAddLog]);

  const handleSelectTrooperAtRisk = React.useCallback((trooper: NormalizedTrooper) => {
    persistSquad((prev) =>
      prev.map((entry, index) => {
        if (index !== trooper.storageIndex) {
          return entry;
        }

        const next: Partial<T.Trooper> = entry ? { ...entry } : {};
        next.atRisk = true;

        if (trooper.storedId !== null) {
          next.id = trooper.storedId;
        }

        return next;
      }),
    );
    setShowAtRiskModal(false);
  }, [persistSquad]);

  const handleSuccess = React.useCallback(() => {
    handleMomentumChange(1);
  }, [handleMomentumChange]);

  // Render engagement outcome with clickable parts
  const renderOutcomeDescription = React.useCallback(
    (description: string) => {
      // "Pushed Back. Lose 1 Momentum" => "Pushed Back." (clickable)
      if (description.includes("Pushed Back")) {
        return (
          <button
            type="button"
            className="dc-outcome-link"
            onClick={handlePushedBack}
            aria-label="Pushed back - lose 1 momentum"
          >
            Pushed Back.
          </button>
        );
      }

      // "Hold Position or Success at a Cost" => two clickable parts
      if (description.includes("Hold Position or Success at a Cost")) {
        return (
          <>
            <button
              type="button"
              className="dc-outcome-link"
              onClick={handleHoldPosition}
              aria-label="Hold position"
            >
              Hold Position
            </button>
            {" or "}
            <button
              type="button"
              className="dc-outcome-link"
              onClick={handleSuccessAtCost}
              aria-label="Success at a cost - gain 1 momentum"
            >
              Success at a Cost
            </button>
            .
          </>
        );
      }

      // "Hold Position" => "Hold Position." (clickable)
      if (description === "Hold Position") {
        return (
          <button
            type="button"
            className="dc-outcome-link"
            onClick={handleHoldPosition}
            aria-label="Hold position"
          >
            Hold Position.
          </button>
        );
      }

      // "Success" => "Success." (clickable)
      if (description === "Success") {
        return (
          <button
            type="button"
            className="dc-outcome-link"
            onClick={handleSuccess}
            aria-label="Success - gain 1 momentum"
          >
            Success.
          </button>
        );
      }

      // Fallback for any other description
      return <>{description}</>;
    },
    [handlePushedBack, handleHoldPosition, handleSuccessAtCost, handleSuccess],
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
          {momentumStatus ? (
            <span
              className={`dc-momentum-status dc-momentum-status--${momentumStatus.tone}`}
              role="status"
              aria-live="polite"
            >
              {momentumStatus.label}
            </span>
          ) : null}
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
        </div>
        <div className="dc-momentum-defense">
          <label className="dc-momentum-defense-toggle">
            <input
              type="checkbox"
              checked={isDefenseObjectiveEnabled}
              onChange={(event) => setIsDefenseObjectiveEnabled(event.currentTarget.checked)}
            />
            <span>Defense</span>
          </label>
          {isDefenseObjectiveEnabled && defenseExchangeGoal !== null ? (
            <div className="dc-momentum-defense-body">
              <div className="dc-momentum-defense-row">
                <span className="dc-momentum-defense-text">
                  Hold out for <strong>{defenseExchangeGoal}</strong> Exchanges
                </span>
                <div className="dc-momentum-defense-adjust">
                  <button
                    type="button"
                    className="dc-btn dc-btn--sm dc-momentum-defense-btn"
                    onClick={() => handleDefenseExchangeGoalChange(-1)}
                    disabled={defenseExchangeGoal <= 0}
                    aria-label="Decrease defense exchange goal"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    className="dc-btn dc-btn--sm dc-momentum-defense-btn"
                    onClick={() => handleDefenseExchangeGoalChange(1)}
                    aria-label="Increase defense exchange goal"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="dc-momentum-defense-note">
                Momentum must be at +1 or higher when timer reaches 0 for victory
              </p>
              {defenseOutcome?.message ? (
                <p className="dc-momentum-defense-outcome">{defenseOutcome.message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {selectedSector ? (
        <article className="dc-engagement-card dc-momentum-card dc-hard-targets-card">
          <header className="dc-momentum-header">
            <h3 className="dc-momentum-title">Hard Targets</h3>
            <button
              type="button"
              className="dc-btn dc-btn--sm dc-hard-targets-add"
              onClick={handleAddHardTarget}
              aria-label="Add hard target"
            >
              +
            </button>
          </header>
          <div className="dc-hard-targets">
            {hardTargets.length === 0 ? (
              <p className="dc-hard-targets-empty">No hard targets assigned.</p>
            ) : (
              <ul className="dc-hard-targets-list">
                {hardTargets.map((target) => {
                  const isNeutralized = target.hits <= 0;
                  const targetName = target.name.trim() || "Hard Target";
                  return (
                    <li
                      key={target.id}
                      className={`dc-hard-target${isNeutralized ? " is-neutralized" : ""}`}
                    >
                      <input
                        className="dc-input dc-hard-target-name-input"
                        type="text"
                        value={target.name}
                        onChange={(event) =>
                          handleHardTargetNameChange(target.id, event.currentTarget.value)
                        }
                        placeholder="Target name"
                      />
                      <div className="dc-hard-target-hits">
                        <span className="dc-hard-target-hits-label">Hits:</span>
                        <div className="dc-hard-target-hits-controls">
                          <button
                            type="button"
                            className="dc-btn dc-btn--sm dc-hard-target-hits-btn"
                            onClick={() => handleHardTargetHitsUpdate(target.id, target.hits - 1)}
                            aria-label={`Decrease hits for ${targetName}`}
                            disabled={target.hits <= 0}
                          >
                            -
                          </button>
                          <input
                            className="dc-input dc-hard-target-hits-input"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={target.hits}
                            onChange={(event) =>
                              handleHardTargetHitsInputChange(target.id, event.currentTarget.value)
                            }
                            aria-label={`Set hits remaining for ${targetName}`}
                          />
                          <button
                            type="button"
                            className="dc-btn dc-btn--sm dc-hard-target-hits-btn"
                            onClick={() => handleHardTargetHitsUpdate(target.id, target.hits + 1)}
                            aria-label={`Increase hits for ${targetName}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dc-hard-target-delete"
                        onClick={() => handleDeleteHardTarget(target.id)}
                        aria-label={`Delete ${targetName}`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>
      ) : null}

      {selectedSector ? (
        <article className="dc-engagement-card dc-planning-card">
          <div className="dc-planning-tabs" role="tablist" aria-label="Engagement planning">
            {PLANNING_TABS.map((tab) => {
              const isActive = activePlanningTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`dc-planning-tab-${tab.id}`}
                  className={`dc-planning-tab${isActive ? " is-active" : ""}`}
                  aria-selected={isActive}
                  aria-controls={`dc-planning-panel-${tab.id}`}
                  onClick={() => handlePlanningTabSelect(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="dc-planning-panels">
            <div
              id="dc-planning-panel-intent"
              role="tabpanel"
              aria-labelledby="dc-planning-tab-intent"
              hidden={activePlanningTab !== "intent"}
              className="dc-planning-panel"
            >
              {activePlanningTab === "intent" ? (
                <>
                  <p className="dc-planning-intro">
                    Every Trooper that isn&apos;t currently Bleeding Out or Dead determines their
                    course of action during this Exchange.
                  </p>
                  <div className="dc-planning-intent">
                    <div className="dc-planning-intent-form">
                      <ul className="dc-planning-intent-list">
                        {activeTrooperIntents.map((intentEntry) => {
                          const { id, trooper, displayName, isUnavailable, statusDetail } = intentEntry;

                          const itemClassName = `dc-planning-intent-item ${
                            isUnavailable
                              ? "dc-planning-intent-item--unavailable"
                              : "dc-planning-intent-item--with-select"
                          }`;

                          return (
                            <li key={id} className={itemClassName}>
                              {isUnavailable ? (
                                <>
                                  <span className="dc-planning-intent-name">{displayName}</span>
                                  <span className="dc-planning-intent-detail">{statusDetail}</span>
                                </>
                              ) : (
                                <>
                                  <span className="dc-planning-intent-name">{displayName}:</span>
                                  <button
                                    type="button"
                                    className="dc-btn dc-btn--sm dc-intent-select-btn"
                                    onClick={() => setIntentModalTrooper(trooper)}
                                  >
                                    {getIntentDisplayText(trooper)}
                                  </button>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="dc-planning-intent-controls" aria-label="Offense roll dice controls">
                        <span className="dc-planning-intent-controls-label">Offense Roll D6</span>
                        <div className="dc-planning-intent-counter-controls">
                          <button
                            type="button"
                            className="dc-btn dc-btn--sm dc-planning-counter-btn"
                            onClick={() => handleOffenseDiceAdjust(-1)}
                            aria-label="Decrease offense roll dice"
                          >
                            -
                          </button>
                          <span className="dc-planning-intent-counter-value">{offenseDiceCount}</span>
                          <button
                            type="button"
                            className="dc-btn dc-btn--sm dc-planning-counter-btn"
                            onClick={() => handleOffenseDiceAdjust(1)}
                            aria-label="Increase offense roll dice"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <section
                      className="dc-planning-offense-breakdown"
                      aria-label="Offense roll breakdown"
                    >
                      <span className="dc-planning-offense-breakdown__title">Offense Roll Breakdown</span>
                      {selectedSector ? (
                        offenseContributions.length > 0 ? (
                          <>
                            <ul className="dc-planning-offense-breakdown__list">
                              {offenseContributions.map((entry) => (
                                <li
                                  key={entry.trooperId}
                                  className="dc-planning-offense-breakdown__item"
                                >
                                  <div className="dc-planning-offense-breakdown__item-header">
                                    <span className="dc-planning-offense-breakdown__name">{entry.name}</span>
                                    <span className="dc-planning-offense-breakdown__value">
                                      {formatSignedValue(entry.value)}
                                    </span>
                                  </div>
                                  <p className="dc-planning-offense-breakdown__item-detail">
                                    {entry.detail}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            <div className="dc-planning-offense-breakdown__total">
                              <span>Total</span>
                              <span>{formatSignedValue(offenseComputedTotal)}</span>
                            </div>
                          </>
                        ) : (
                          <p className="dc-planning-offense-breakdown__empty">
                            No troopers available to contribute.
                          </p>
                        )
                      ) : (
                        <p className="dc-planning-offense-breakdown__empty">
                          Select a threat sector to view offense calculations.
                        </p>
                      )}
                    </section>
                  </div>
                </>
              ) : null}
            </div>
            <div
              id="dc-planning-panel-offense"
              role="tabpanel"
              aria-labelledby="dc-planning-tab-offense"
              hidden={activePlanningTab !== "offense"}
              className="dc-planning-panel"
            >
              {activePlanningTab === "offense" ? (
                <>
                  <p className="dc-planning-offense-roll">
                    Roll all {offenseDiceLabel} &amp; take the highest value.
                  </p>
                  <div className="dc-planning-offense-results">
                    {threatLevel === null ? (
                      <p className="dc-planning-offense-placeholder">
                        Select a threat level sector to view outcomes.
                      </p>
                    ) : null}
                    {threatLevel !== null ? (
                      <ul className="dc-planning-offense-table">
                        {(threatLevel === 1 || threatLevel === 2
                          ? [
                              { range: "1-3", description: "Pushed Back. Lose 1 Momentum" },
                              { range: "4-5", description: "Hold Position or Success at a Cost" },
                              { range: "6", description: "Success" },
                            ]
                          : [
                              { range: "1-3", description: "Pushed Back. Lose 1 Momentum" },
                              { range: "4", description: "Hold Position" },
                              { range: "5", description: "Hold Position or Success at a Cost" },
                              { range: "6", description: "Success" },
                            ]
                        ).map((row) => (
                          <li key={row.range} className="dc-planning-offense-row">
                            <span className="dc-planning-offense-range">{row.range}</span>
                            <span className="dc-planning-offense-description">
                              {renderOutcomeDescription(row.description)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div
              id="dc-planning-panel-defense"
              role="tabpanel"
              aria-labelledby="dc-planning-tab-defense"
              hidden={activePlanningTab !== "defense"}
              className="dc-planning-panel"
            >
              {activePlanningTab === "defense" ? (
                <>
                  <p
                    className={
                      defenseThreatMessage
                        ? "dc-planning-defense-guidance"
                        : "dc-planning-defense-placeholder"
                    }
                  >
                    {defenseThreatMessage ?? "Select a threat level sector to view defensive risks."}
                  </p>
                  <div className="dc-planning-intent">
                    <div className="dc-planning-defense-table" role="table" aria-label="Trooper defensive risks">
                      <div className="dc-planning-defense-row dc-planning-defense-header" role="row">
                        <span
                          className="dc-planning-defense-cell dc-planning-defense-cell--name"
                          role="columnheader"
                        >
                          Trooper
                        </span>
                        <span
                          className="dc-planning-defense-cell dc-planning-defense-cell--modifiers"
                          role="columnheader"
                        >
                          Modifiers
                        </span>
                        <span
                          className="dc-planning-defense-cell dc-planning-defense-cell--result"
                          role="columnheader"
                        >
                          Result
                        </span>
                      </div>
                      {activeTrooperDefenses.map((defense) => {
                        const defenseRowClassName = [
                          "dc-planning-defense-row",
                          defense.appearance ? `dc-planning-defense-row--${defense.appearance}` : null,
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <div key={defense.id} className={defenseRowClassName} role="row">
                            <span
                              className="dc-planning-defense-cell dc-planning-defense-cell--name"
                              role="cell"
                            >
                              <div className="dc-planning-defense-name-wrapper">
                                <span>{defense.name}</span>
                                {defense.coveringFireBy && (
                                  <span className="dc-planning-defense-covering-fire">
                                    Covering Fire by {defense.coveringFireBy}
                                  </span>
                                )}
                                {defense.atRisk && (
                                  <span className="dc-planning-defense-at-risk">
                                    At Risk
                                  </span>
                                )}
                              </div>
                            </span>
                            <span
                              className="dc-planning-defense-cell dc-planning-defense-cell--modifiers"
                              role="cell"
                            >
                              {defense.modifiers}
                            </span>
                            <span
                              className="dc-planning-defense-cell dc-planning-defense-cell--result"
                              role="cell"
                            >
                              <span
                                className={`dc-planning-defense-chip dc-planning-defense-chip--${defense.resultTone}`}
                              >
                                {defense.resultLabel}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
            <div
              id="dc-planning-panel-momentum"
              role="tabpanel"
              aria-labelledby="dc-planning-tab-momentum"
              hidden={activePlanningTab !== "momentum"}
              className="dc-planning-panel"
            >
              {activePlanningTab === "momentum" ? (
                <div className="dc-planning-momentum">
                  <section
                    className="dc-planning-momentum-column"
                    aria-labelledby="dc-planning-momentum-gain"
                  >
                    <h4 id="dc-planning-momentum-gain" className="dc-planning-momentum-heading">
                      Momentum Gain
                    </h4>
                    <ul className="dc-planning-momentum-list">
                      <li>Gain +1d6 on the next Offensive Roll</li>
                      <li>
                        Any Troopers that were Flanking can either choose to become Engaged or to remain
                        Flanking, but with the risk of +1 Injury if hit during the next Exchange. Applies to:
                        <span className="dc-planning-momentum-highlight"> {flankingTrooperSummary}</span>
                      </li>
                      <li>
                        Any Troopers that were Fortified can either choose to become Limited or Engaged + In
                        Cover. Applies to:
                        <span className="dc-planning-momentum-highlight"> {fortifiedTrooperSummary}</span>
                      </li>
                    </ul>
                  </section>
                  <section
                    className="dc-planning-momentum-column"
                    aria-labelledby="dc-planning-momentum-loss"
                  >
                    <h4 id="dc-planning-momentum-loss" className="dc-planning-momentum-heading">
                      Momentum Loss
                    </h4>
                    <ul className="dc-planning-momentum-list">
                      <li>
                        On Momentum Loss, any Flanked Troopers must Fall Back in the next Exchange, or gain +1
                        Injury if hit during that round. Applies to:
                        <span className="dc-planning-momentum-highlight"> {flankedTrooperSummary}</span>
                      </li>
                    </ul>
                  </section>
                </div>
              ) : null}
            </div>
            <div
              id="dc-planning-panel-tactics"
              role="tabpanel"
              aria-labelledby="dc-planning-tab-tactics"
              hidden={activePlanningTab !== "tactics"}
              className="dc-planning-panel"
            >
              {activePlanningTab === "tactics" ? (
                <>
                  <p className="dc-planning-tactics-intro">
                    Roll 1d6. If it&apos;s equal or under {" "}
                    <span className="dc-planning-tactics-threat">
                      {threatLevel === null ? "—" : threatLevel}
                    </span>
                    , {" "}
                    <button
                      type="button"
                      className="dc-planning-tactics-roll"
                      onClick={handleTacticRoll}
                      disabled={threatLevel === null || isRollingTactic}
                    >
                      roll for tactic
                    </button>
                    .
                  </p>
                  <table className="dc-planning-tactics-table">
                    <tbody>
                      {TACTIC_TABLE.map((entry) => {
                        const isHighlighted = highlightedTacticId === entry.id;
                        const rowClassName = `dc-planning-tactics-row${
                          isHighlighted ? " is-highlighted" : ""
                        }${isRollingTactic && isHighlighted ? " is-rolling" : ""}`;

                        return (
                          <tr key={entry.id} className={rowClassName}>
                            <th scope="row" className="dc-planning-tactics-effect">
                              {entry.effect}
                            </th>
                            <td className="dc-planning-tactics-description">
                              <em>{entry.description}</em>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}

      <div className="dc-engagement-squad">
        <div className="dc-engagement-squad-header">
          <h3 className="dc-engagement-squad-title">Squad Status</h3>
          <button
            type="button"
            className="dc-btn dc-btn--sm dc-engagement-intent-clear"
            onClick={handleClearAllIntents}
            disabled={!hasIntentAssignments}
          >
            Next Exchange
          </button>
        </div>
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
                              className="dc-engagement-squad-status dc-status-control"
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
                                className={`dc-status-button dc-status-button--${statusDetail.tone}`}
                                onClick={() => handleToggleStatusMenu(trooper.storageIndex)}
                                aria-haspopup="true"
                                aria-expanded={openStatusIndex === trooper.storageIndex}
                                aria-controls={`dc-engagement-status-menu-${trooper.storageIndex}`}
                              >
                                <span className="dc-status-button__label">{statusDetail.label}</span>
                                <span className="dc-status-button__chevron" aria-hidden="true">▾</span>
                              </button>
                                {openStatusIndex === trooper.storageIndex ? (
                                <div
                                  id={`dc-engagement-status-menu-${trooper.storageIndex}`}
                                  className="dc-status-menu"
                                  role="menu"
                                >
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

      {/* Intent Selection Modal */}
      {intentModalTrooper ? (
        <div className="dc-modal-overlay" onClick={() => setIntentModalTrooper(null)}>
          <div className="dc-modal dc-intent-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="dc-modal-title">
              Select Intent: {intentModalTrooper.name.trim() || `Trooper ${intentModalTrooper.displayId}`}
            </h3>
            <div className="dc-intent-options">
              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Fire")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Fire</span>
                </div>
                <p className="dc-intent-option-description">Contribute to the Offense Roll.</p>
                {(() => {
                  const contribution = getOffenseContributionForTrooper(intentModalTrooper);
                  if (contribution && contribution.value !== 0) {
                    return (
                      <div className="dc-intent-option-detail">
                        <div className="dc-intent-option-value">{formatSignedValue(contribution.value)}</div>
                        <p className="dc-intent-option-breakdown">{contribution.detail}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Move Up")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Move Up</span>
                </div>
                <p className="dc-intent-option-description">Improve Offensive Position.</p>
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Fall Back")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Fall Back</span>
                </div>
                <p className="dc-intent-option-description">Improve Defensive Position.</p>
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Covering Fire")}
                disabled={getValidCoveringFireTargets(intentModalTrooper).length === 0}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Covering Fire</span>
                </div>
                <p className="dc-intent-option-description">
                  Add +1d6 to the Defense Roll of a Moving or Interacting Trooper.
                  {getValidCoveringFireTargets(intentModalTrooper).length === 0 && (
                    <span className="dc-intent-option-unavailable"> (No eligible targets)</span>
                  )}
                </p>
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Use Special Gear")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Use Special Gear</span>
                </div>
                <p className="dc-intent-option-description">Use special weapons or equipment.</p>
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Interact")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Interact</span>
                </div>
                <p className="dc-intent-option-description">
                  Stabilize a Trooper who is Bleeding Out, or another battlefield interaction.
                </p>
              </button>

              <button
                type="button"
                className="dc-intent-option-btn"
                onClick={() => handleSelectIntent(intentModalTrooper, "Disengage")}
              >
                <div className="dc-intent-option-header">
                  <span className="dc-intent-option-title">Disengage</span>
                </div>
                <p className="dc-intent-option-description">Flee this Engagement.</p>
              </button>
            </div>
            <div className="dc-modal-buttons">
              <button type="button" className="dc-btn" onClick={() => setIntentModalTrooper(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Covering Fire Target Selection Modal */}
      {coveringFireModalTrooper ? (
        <div className="dc-modal-overlay" onClick={() => setCoveringFireModalTrooper(null)}>
          <div className="dc-modal dc-covering-fire-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="dc-modal-title">
              Select Trooper to Cover:{" "}
              {coveringFireModalTrooper.name.trim() || `Trooper ${coveringFireModalTrooper.displayId}`}
            </h3>
            <p className="dc-modal-description">
              Choose a Trooper who is Moving Up, Falling Back, or Interacting to provide Covering Fire.
            </p>
            <div className="dc-covering-fire-targets">
              {(() => {
                const validTargets = getValidCoveringFireTargets(coveringFireModalTrooper);
                if (validTargets.length === 0) {
                  return <p className="dc-covering-fire-empty">No valid targets available.</p>;
                }
                return validTargets.map((target) => {
                  const targetName = target.name.trim() || `Trooper ${target.displayId}`;
                  return (
                    <button
                      key={target.storageIndex}
                      type="button"
                      className="dc-btn dc-covering-fire-target-btn"
                      onClick={() => handleSelectCoveringFireTarget(coveringFireModalTrooper, target.storedId!)}
                    >
                      <span className="dc-covering-fire-target-name">{targetName}</span>
                      <span className="dc-covering-fire-target-intent">({target.intent})</span>
                    </button>
                  );
                });
              })()}
            </div>
            <div className="dc-modal-buttons">
              <button type="button" className="dc-btn" onClick={() => setCoveringFireModalTrooper(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Success at a Cost - Trooper at Risk Selection Modal */}
      {showAtRiskModal ? (
        <div className="dc-modal-overlay" onClick={() => setShowAtRiskModal(false)}>
          <div className="dc-modal dc-at-risk-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="dc-modal-title">Select Trooper at risk</h3>
            <div className="dc-at-risk-troopers">
              {deployedSquad.map((trooper) => {
                const statusDetail = STATUS_DETAILS[trooper.status];
                const defensivePositionOption = DEFENSIVE_POSITIONS.find(
                  (pos) => pos.value === trooper.defensivePosition
                );
                const trooperName = trooper.name.trim() || `Trooper ${trooper.displayId}`;

                return (
                  <button
                    key={trooper.storageIndex}
                    type="button"
                    className="dc-at-risk-trooper-btn"
                    onClick={() => handleSelectTrooperAtRisk(trooper)}
                  >
                    <span className="dc-at-risk-trooper-name">{trooperName}</span>
                    <div className="dc-at-risk-trooper-details">
                      <span className={`dc-at-risk-trooper-status dc-at-risk-trooper-status--${statusDetail.tone}`}>
                        {statusDetail.label}
                      </span>
                      {defensivePositionOption && (
                        <span className={`dc-at-risk-trooper-position dc-at-risk-trooper-position--${defensivePositionOption.tone}`}>
                          {defensivePositionOption.value}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="dc-modal-buttons">
              <button type="button" className="dc-btn" onClick={() => setShowAtRiskModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
