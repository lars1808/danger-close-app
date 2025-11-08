import React, { useState, useEffect } from "react";
import * as T from "./types";
import {
  SQUAD_STORAGE_KEY,
  SQUAD_NAME_STORAGE_KEY,
  SQUAD_UPDATED_EVENT,
  SQUAD_ARMORY_STORAGE_KEY,
  getStoredArmory,
} from "./storageKeys";
import { getSectorDisplayName } from "../mission/missionUtils";

function createTrooper(id: number): T.Trooper {
  return {
    id,
    name: "",
    status: "OK",
    grit: 3,
    ammo: 3,
    notes: "",
    weaponId: "assault_rifle",
    armorId: "medium",
    biography: "",
    specialGear: [],
    offensivePosition: "Engaged",
    defensivePosition: "In Cover",
  };
}

const defaultTroopers: T.Trooper[] = Array.from({ length: 5 }, (_, index) =>
  createTrooper(index + 1),
);

const TROOPER_CALLSIGNS = [
  "Reaper",
  "Dusty",
  "Ghost",
  "Twitch",
  "Preacher",
  "Nails",
  "Joker",
  "Doc",
  "Bishop",
  "Wrench",
  "Prophet",
  "Echo",
  "Brick",
  "Sparks",
  "Ghoul",
  "Rookie",
  "Thunder",
  "Quill",
  "Hound",
  "Icebox",
  "Vulture",
  "Scorch",
  "Lucky",
  "Zero",
  "Fang",
  "Sarge",
  "Whisper",
  "Tango",
  "Blaze",
  "Grit",
  "Buzz",
  "Muzzle",
  "Shade",
  "Gramps",
  "Halo",
  "Knuckles",
  "Striker",
  "Latch",
  "Razor",
  "Patch",
  "Slick",
  "Cinder",
  "Moose",
  "Phase",
  "Bounty",
  "Trigger",
  "Frostbite",
  "Gunner",
  "Hex",
  "Sundown",
  "Bolt",
  "Nomad",
  "Switch",
  "Torque",
  "Palehorse",
  "Banshee",
  "Mutt",
  "Crash",
  "Triage",
  "Static",
  "Havoc",
];

function getRandomCallsign(): string {
  if (TROOPER_CALLSIGNS.length === 0) {
    return "";
  }
  const index = Math.floor(Math.random() * TROOPER_CALLSIGNS.length);
  return TROOPER_CALLSIGNS[index];
}

function createEmptyArmory(): T.SquadArmoryState {
  return { requisition: 0, items: [] };
}

function createInventoryItemId(): string {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    try {
      return globalCrypto.randomUUID();
    } catch {
      // Fall through to time-based ID
    }
  }
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `gear-${timePart}-${randomPart}`;
}

interface InitialSquadState {
  troopers: T.Trooper[];
  armory: T.SquadArmoryState;
}

function loadInitialSquadState(): InitialSquadState {
  let rawSquad: unknown = null;
  try {
    rawSquad = localStorage.getItem(SQUAD_STORAGE_KEY);
  } catch {
    rawSquad = null;
  }

  let parsedSquad: Partial<T.Trooper>[] | null = null;
  if (typeof rawSquad === "string" && rawSquad.length > 0) {
    try {
      const parsed = JSON.parse(rawSquad);
      parsedSquad = Array.isArray(parsed) ? (parsed as Partial<T.Trooper>[]) : null;
    } catch {
      parsedSquad = null;
    }
  }

  const base = parsedSquad ?? defaultTroopers;
  const legacyGearByTrooper = new Map<number, string[]>();

  const troopers = base.map((record, index) => {
    const fallback = defaultTroopers[index] ?? defaultTroopers[0];
    const id = typeof record?.id === "number" ? record.id : fallback.id;
    const legacySource = Array.isArray(record?.specialGear)
      ? (record?.specialGear as unknown[])
      : [];
    const legacyGear = legacySource.filter((gear): gear is string => typeof gear === "string");
    legacyGearByTrooper.set(id, legacyGear);
    const gritValue = Number(record?.grit ?? Number.NaN);
    const ammoValue = Number(record?.ammo ?? Number.NaN);

    return {
      id,
      name: typeof record?.name === "string" ? record.name : fallback.name,
      status: (record?.status as T.Status) ?? "OK",
      grit: Number.isFinite(gritValue) ? Math.trunc(gritValue) : 3,
      ammo: Number.isFinite(ammoValue) ? Math.trunc(ammoValue) : 3,
      notes: typeof record?.notes === "string" ? record.notes : fallback.notes ?? "",
      weaponId: (record?.weaponId as T.WeaponId) ?? fallback.weaponId ?? "assault_rifle",
      armorId: (record?.armorId as T.ArmorId) ?? fallback.armorId ?? "medium",
      biography: typeof record?.biography === "string" ? record.biography : fallback.biography ?? "",
      specialGear: [],
      offensivePosition:
        (record?.offensivePosition as T.OffensivePosition | undefined) ??
        fallback.offensivePosition ??
        "Engaged",
      defensivePosition:
        (record?.defensivePosition as T.DefensivePosition | undefined) ??
        fallback.defensivePosition ??
        "In Cover",
    } satisfies T.Trooper;
  });

  const storedArmory = getStoredArmory();
  const validTrooperIds = new Set(troopers.map((trooper) => trooper.id));
  const normalizedItems = storedArmory.items
    .filter((item) => !!item && typeof item.id === "string" && typeof item.gearId === "string")
    .filter((item) => item.gearId in T.SPECIAL_GEAR_INDEX)
    .map((item) => ({
      id: item.id,
      gearId: item.gearId,
      assignedTrooperId:
        typeof item.assignedTrooperId === "number" && validTrooperIds.has(item.assignedTrooperId)
          ? item.assignedTrooperId
          : null,
    }));

  let armory: T.SquadArmoryState;

  if (normalizedItems.length === 0) {
    const generatedItems: T.SquadInventoryItem[] = [];
    troopers.forEach((trooper) => {
      const legacyGear = legacyGearByTrooper.get(trooper.id) ?? [];
      legacyGear.forEach((gearId) => {
        if (!(gearId in T.SPECIAL_GEAR_INDEX)) {
          return;
        }
        generatedItems.push({
          id: createInventoryItemId(),
          gearId,
          assignedTrooperId: trooper.id,
        });
      });
    });
    armory = { requisition: 0, items: generatedItems };
  } else {
    const itemsById = new Map<string, T.SquadInventoryItem>();
    normalizedItems.forEach((item) => {
      itemsById.set(item.id, { ...item });
    });

    troopers.forEach((trooper) => {
      const legacyGear = legacyGearByTrooper.get(trooper.id) ?? [];
      legacyGear.forEach((itemId) => {
        const existing = itemsById.get(itemId);
        if (existing && existing.assignedTrooperId === null) {
          existing.assignedTrooperId = trooper.id;
        }
      });
    });

    armory = {
      requisition: Math.max(0, Math.trunc(storedArmory.requisition ?? 0)),
      items: Array.from(itemsById.values()),
    };
  }

  const assignmentsByTrooper = new Map<number, string[]>();
  armory.items.forEach((item) => {
    if (item.assignedTrooperId !== null && validTrooperIds.has(item.assignedTrooperId)) {
      const list = assignmentsByTrooper.get(item.assignedTrooperId) ?? [];
      list.push(item.id);
      assignmentsByTrooper.set(item.assignedTrooperId, list);
    }
  });

  const troopersWithAssignments = troopers.map((trooper) => ({
    ...trooper,
    specialGear: assignmentsByTrooper.get(trooper.id) ?? [],
  }));

  return {
    troopers: troopersWithAssignments,
    armory,
  };
}

interface SquadTableProps {
  onAddLog: (text: string, source: "USER" | "SYSTEM") => void;
  mission: T.Mission;
  currentSectorId: string | null;
}
export default function SquadTable(props: SquadTableProps) {
  const { onAddLog, mission, currentSectorId } = props;
  const initialStateRef = React.useRef<InitialSquadState | null>(null);
  if (initialStateRef.current === null) {
    initialStateRef.current = loadInitialSquadState();
  }
  const initialState = initialStateRef.current;

  const [troopers, setTroopers] = useState<T.Trooper[]>(initialState.troopers);
  const [armory, setArmory] = useState<T.SquadArmoryState>(initialState.armory);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showAllTroopers, setShowAllTroopers] = useState(false);
  const [draggedTrooperId, setDraggedTrooperId] = useState<number | null>(null);
  const [dragOverTrooperId, setDragOverTrooperId] = useState<number | null>(null);
  const [squadName, setSquadName] = useState<string>(() => localStorage.getItem(SQUAD_NAME_STORAGE_KEY) ?? "");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const inventoryIndex = React.useMemo(() => {
    const index: Record<string, T.SquadInventoryItem> = {};
    armory.items.forEach((item) => {
      index[item.id] = item;
    });
    return index;
  }, [armory.items]);

  const unassignedInventoryItems = React.useMemo(
    () => armory.items.filter((item) => item.assignedTrooperId === null),
    [armory.items],
  );

  useEffect(() => {
    localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(troopers));
    window.dispatchEvent(new Event(SQUAD_UPDATED_EVENT));
  }, [troopers]);

  useEffect(() => {
    localStorage.setItem(SQUAD_ARMORY_STORAGE_KEY, JSON.stringify(armory));
    window.dispatchEvent(new Event(SQUAD_UPDATED_EVENT));
  }, [armory]);

  useEffect(() => {
    localStorage.setItem(SQUAD_NAME_STORAGE_KEY, squadName);
  }, [squadName]);

  function update<K extends keyof T.Trooper>(id: number, key: K, value: T.Trooper[K]) {
    setTroopers((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)));
  }

  function clamp03(n: number) {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(3, Math.round(n)));
  }

  function bump(id: number, key: "grit" | "ammo", delta: 1 | -1) {
    setTroopers((prev) => prev.map((t) => (t.id === id ? { ...t, [key]: clamp03((t[key] as number) + delta) } : t)));
  }

  function randomizeTrooperName(id: number) {
    const callsign = getRandomCallsign();
    if (!callsign) {
      return;
    }
    update(id, "name", callsign);
  }

  function adjustRequisition(delta: number) {
    setArmory((prev) => {
      const nextValue = Math.max(0, prev.requisition + delta);
      if (nextValue === prev.requisition) {
        return prev;
      }
      return { ...prev, requisition: nextValue };
    });
  }

  function handleAcquireGear(gearId: string) {
    const gear = T.SPECIAL_GEAR_INDEX[gearId];
    if (!gear) {
      return;
    }

    setArmory((prev) => {
      if (prev.requisition < gear.requisition) {
        return prev;
      }
      const newItem: T.SquadInventoryItem = {
        id: createInventoryItemId(),
        gearId: gear.id,
        assignedTrooperId: null,
      };
      return {
        requisition: prev.requisition - gear.requisition,
        items: [...prev.items, newItem],
      };
    });
  }

  function assignInventoryItem(itemId: string, trooperId: number | null) {
    const currentOwner = inventoryIndex[itemId]?.assignedTrooperId ?? null;
    if (currentOwner === trooperId) {
      return;
    }

    setArmory((prev) => ({
      requisition: prev.requisition,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, assignedTrooperId: trooperId } : item)),
    }));

    setTroopers((prev) =>
      prev.map((trooper) => {
        const currentGear = Array.isArray(trooper.specialGear) ? trooper.specialGear : [];
        const hasItem = currentGear.includes(itemId);
        const shouldHave = trooperId !== null && trooper.id === trooperId;

        if (shouldHave && !hasItem) {
          return { ...trooper, specialGear: [...currentGear, itemId] };
        }

        if (!shouldHave && hasItem) {
          return { ...trooper, specialGear: currentGear.filter((gearId) => gearId !== itemId) };
        }

        return trooper;
      }),
    );
  }

  function destroyInventoryItem(itemId: string) {
    const item = inventoryIndex[itemId];
    if (!item) {
      return;
    }

    const gear = T.SPECIAL_GEAR_INDEX[item.gearId];
    const displayName = gear?.name ?? "this item";
    if (!confirm(`Are you sure you want to destroy ${displayName}?`)) {
      return;
    }

    setTroopers((prev) =>
      prev.map((trooper) => {
        const currentGear = Array.isArray(trooper.specialGear) ? trooper.specialGear : [];
        if (!currentGear.includes(itemId)) {
          return trooper;
        }
        return { ...trooper, specialGear: currentGear.filter((gearId) => gearId !== itemId) };
      }),
    );

    setArmory((prev) => ({
      requisition: prev.requisition,
      items: prev.items.filter((candidate) => candidate.id !== itemId),
    }));
  }

  function resetSquad() {
    if (confirm("Reset squad to defaults?")) {
      setTroopers(defaultTroopers.map((trooper) => ({ ...trooper, specialGear: [] })));
      setArmory(createEmptyArmory());
      localStorage.removeItem(SQUAD_STORAGE_KEY);
      setSquadName("");
      localStorage.removeItem(SQUAD_NAME_STORAGE_KEY);
      localStorage.removeItem(SQUAD_ARMORY_STORAGE_KEY);
      setShowAllTroopers(false);
      setExpandedIds(new Set());
    }
  }

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function addTrooper() {
    const nextId = troopers.reduce((max, trooper) => Math.max(max, trooper.id), 0) + 1;
    setTroopers((prev) => [...prev, createTrooper(nextId)]);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(nextId);
      return next;
    });
    setShowAllTroopers(true);
  }

  function removeTrooper(id: number) {
    const trooper = troopers.find((t) => t.id === id);
    const trooperIndex = trooper ? troopers.indexOf(trooper) : -1;
    const displayName = trooper?.name?.trim() || (trooperIndex >= 0 ? `Trooper ${trooperIndex + 1}` : "this trooper");
    if (!confirm(`Are you sure you want to delete ${displayName}?`)) {
      return;
    }

    const nextTroopers = troopers.filter((t) => t.id !== id);
    setTroopers(nextTroopers);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setArmory((prev) => ({
      requisition: prev.requisition,
      items: prev.items.map((item) =>
        item.assignedTrooperId === id ? { ...item, assignedTrooperId: null } : item,
      ),
    }));
    if (nextTroopers.length <= 5) {
      setShowAllTroopers(false);
    }
  }

  function moveTrooper(id: number, direction: -1 | 1) {
    setTroopers((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) {
        return prev;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function reorderTroopers(sourceId: number, targetId: number) {
    if (sourceId === targetId) {
      return;
    }
    setTroopers((prev) => {
      const sourceIndex = prev.findIndex((t) => t.id === sourceId);
      const targetIndex = prev.findIndex((t) => t.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function handleDragStart(event: React.DragEvent<HTMLTableRowElement>, id: number) {
    event.dataTransfer.effectAllowed = "move";
    setDraggedTrooperId(id);
  }

  function handleDragOver(event: React.DragEvent<HTMLTableRowElement>, id: number) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverTrooperId !== id) {
      setDragOverTrooperId(id);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLTableRowElement>, id: number) {
    event.preventDefault();
    if (draggedTrooperId !== null) {
      reorderTroopers(draggedTrooperId, id);
    }
    setDraggedTrooperId(null);
    setDragOverTrooperId(null);
  }

  function handleDragEnd() {
    setDraggedTrooperId(null);
    setDragOverTrooperId(null);
  }

  function getGearSummary(trooper: T.Trooper): string {
    const weapon = T.WEAPON_INDEX[trooper.weaponId]?.name ?? "Unknown";
    const armor = T.ARMOR_INDEX[trooper.armorId]?.name ?? "Unknown";
    const specialNames = (trooper.specialGear ?? [])
      .map((itemId) => {
        const inventoryItem = inventoryIndex[itemId];
        if (inventoryItem) {
          return T.SPECIAL_GEAR_INDEX[inventoryItem.gearId]?.name ?? null;
        }
        return T.SPECIAL_GEAR_INDEX[itemId]?.name ?? null;
      })
      .filter((name): name is string => Boolean(name));
    return specialNames.length > 0
      ? `${weapon}, ${armor}, ${specialNames.join(", ")}`
      : `${weapon}, ${armor}`;
  }

  const primaryTroopers = troopers.slice(0, 5);
  const reserveTroopers = troopers.slice(5);
  const visibleTroopers = showAllTroopers ? troopers : primaryTroopers;
  const reserveCount = reserveTroopers.length;

  return (
    <div>
      <div className="dc-squad-header">
        <label className="dc-squad-label" htmlFor="squad-name-input">
          Squad Name
        </label>
        <input
          id="squad-name-input"
          className="dc-input"
          value={squadName}
          onChange={(e) => setSquadName(e.target.value)}
          placeholder="Enter squad name"
        />
      </div>

      <div className="dc-toolbar">
        <button type="button" onClick={resetSquad} className="dc-btn dc-btn--accent">Reset Squad</button>
        <button type="button" onClick={addTrooper} className="dc-btn">
          <span aria-hidden="true">＋</span>
          Add Trooper
        </button>
      </div>

      <div className="dc-table-wrap">
        <table className="dc-table" role="grid">
          <thead>
            <tr>
              <th className="dc-col-expand"></th>
              <th className="dc-col-name">Name</th>
              <th className="dc-th--center">Status</th>
              <th className="dc-th--center">Grit</th>
              <th className="dc-th--center">Ammo</th>
              <th className="dc-col-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleTroopers.map((t) => {
              const trooperIndex = troopers.findIndex((trooper) => trooper.id === t.id);
              const isPrimary = trooperIndex > -1 && trooperIndex < 5;
              const isExpanded = expandedIds.has(t.id);
              const gearSummary = getGearSummary(t);
              const isDragging = draggedTrooperId === t.id;
              const isDragOver = dragOverTrooperId === t.id && draggedTrooperId !== null && draggedTrooperId !== t.id;
              const displayIndex = trooperIndex + 1;
              const displayName = t.name.trim() || (trooperIndex >= 0 ? `Trooper ${displayIndex}` : "Trooper");
              const assignedItems = (t.specialGear ?? [])
                .map((itemId) => inventoryIndex[itemId])
                .filter((item): item is T.SquadInventoryItem => Boolean(item));
              const legacyAssignedNames = (t.specialGear ?? [])
                .filter((itemId) => !inventoryIndex[itemId] && T.SPECIAL_GEAR_INDEX[itemId])
                .map((itemId) => T.SPECIAL_GEAR_INDEX[itemId]?.name ?? "")
                .filter((name) => Boolean(name));

              return (
                <React.Fragment key={t.id}>
                  {/* MAIN ROW */}
                  <tr
                    className={`dc-trooper-row ${isPrimary ? "dc-trooper-row--active" : "dc-trooper-row--reserve"} ${
                      isDragging ? "dc-trooper-row--dragging" : ""
                    } ${isDragOver ? "dc-trooper-row--dragover" : ""}`.trim()}
                    draggable
                    onDragStart={(event) => handleDragStart(event, t.id)}
                    onDragOver={(event) => handleDragOver(event, t.id)}
                    onDrop={(event) => handleDrop(event, t.id)}
                    onDragEnd={handleDragEnd}
                    aria-label={`Trooper ${displayIndex}`}
                  >
                    {/* Expand button */}
                    <td className="dc-col-expand">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(t.id)}
                        className={`dc-expand-btn ${isExpanded ? "expanded" : ""}`}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${displayName}`}
                      >
                        ▼
                      </button>
                    </td>

                    {/* Name + Gear Summary */}
                    <td className="dc-col-name">
                      <div>
                        <input
                          className="dc-input"
                          value={t.name}
                          onChange={(e) => update(t.id, "name", e.target.value)}
                        />
                        <div className="dc-gear-summary">{gearSummary}</div>
                      </div>
                    </td>

{/* Status */}
<td className="dc-col-status">
  <select
    className="dc-status-select"
    value={t.status}
    onChange={(e) => {
      const newStatus = e.target.value as T.Status;
      update(t.id, "status", newStatus);

      // Special KIA message format when status is Dead
      if (newStatus === "Dead") {
        const currentSector = mission.sectors.find((s) => s.id === currentSectorId);
        const sectorName = currentSector ? getSectorDisplayName(currentSector) : "Unknown Sector";
        const missionName = mission.name.trim() || "Unknown Mission";
        onAddLog(`++ ${t.name} down - status: KIA - ${sectorName} - Mission: ${missionName} ++`, "SYSTEM");
      } else {
        onAddLog(`${t.name} status changed to ${newStatus}`, "SYSTEM");
      }
    }}
  >
    <option value="OK" className="dc-status-option--ok">OK</option>
    <option value="Grazed" className="dc-status-option--grazed">Grazed</option>
    <option value="Wounded" className="dc-status-option--wounded">Wounded</option>
    <option value="Bleeding Out" className="dc-status-option--bleeding">Bleeding Out</option>
    <option value="Dead" className="dc-status-option--dead">Dead</option>
  </select>
</td>

                    {/* Grit */}
                    <td className="dc-td--num">
                      <div className="dc-inline-group">
                        <button type="button" onClick={() => bump(t.id, "grit", -1)} className="dc-btn dc-btn--sm">-</button>
                        <span className="dc-valbox">{t.grit}</span>
                        <button type="button" onClick={() => bump(t.id, "grit", +1)} className="dc-btn dc-btn--sm">+</button>
                      </div>
                    </td>

                    {/* Ammo */}
                    <td className="dc-td--num">
                      <div className="dc-inline-group">
                        <button type="button" onClick={() => bump(t.id, "ammo", -1)} className="dc-btn dc-btn--sm">-</button>
                        <span className="dc-valbox">{t.ammo}</span>
                        <button type="button" onClick={() => bump(t.id, "ammo", +1)} className="dc-btn dc-btn--sm">+</button>
                      </div>
                    </td>

                    <td className="dc-td-actions">
                      <div className="dc-row-actions">
                        <button
                          type="button"
                          className="dc-row-action-btn"
                          onClick={() => moveTrooper(t.id, -1)}
                          disabled={trooperIndex <= 0}
                          aria-label={`Move ${displayName} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="dc-row-action-btn"
                          onClick={() => moveTrooper(t.id, 1)}
                          disabled={trooperIndex === troopers.length - 1}
                          aria-label={`Move ${displayName} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="dc-row-action-btn"
                          onClick={() => randomizeTrooperName(t.id)}
                          title="Randomize"
                          aria-label={`Randomize ${displayName}'s callsign`}
                        >
                          🎲
                        </button>
                        <button
                          type="button"
                          className="dc-row-action-btn dc-row-action-btn--danger"
                          onClick={() => removeTrooper(t.id)}
                          aria-label={`Delete ${displayName}`}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* EXPANDED ROW */}
                  {isExpanded && (
                    <tr className="dc-expanded-row show">
                      <td colSpan={6}>
                        <div className="dc-expanded-content">
                          <div className="dc-expanded-inner">
                            {/* Weapon */}
                            <div className="dc-expanded-field">
                              <label className="dc-expanded-label">Weapon</label>
                              <div className="dc-tip">
                                <select
                                  className="dc-select"
                                  value={t.weaponId}
                                  onChange={(e) => update(t.id, "weaponId", e.target.value as T.WeaponId)}
                                  aria-label="Weapon"
                                  aria-describedby={`tip-weapon-${t.id}`}
                                >
                                  {T.WEAPONS.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                  ))}
                                </select>
                                <div id={`tip-weapon-${t.id}`} role="tooltip" className="dc-tip__bubble">
                                  {T.WEAPON_INDEX[t.weaponId as T.WeaponId]?.info ?? ""}
                                </div>
                              </div>
                            </div>

                            {/* Armor */}
                            <div className="dc-expanded-field">
                              <label className="dc-expanded-label">Armor</label>
                              <div className="dc-tip">
                                <select
                                  className="dc-select"
                                  value={t.armorId}
                                  onChange={(e) => update(t.id, "armorId", e.target.value as T.ArmorId)}
                                  aria-label="Armor"
                                  aria-describedby={`tip-armor-${t.id}`}
                                >
                                  {T.ARMORS.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                  ))}
                                </select>
                                <div id={`tip-armor-${t.id}`} role="tooltip" className="dc-tip__bubble">
                                  {T.ARMOR_INDEX[t.armorId as T.ArmorId]?.info ?? ""}
                                </div>
                              </div>
                            </div>

                            {/* Special Gear - Inventory assignments */}
                            <div className="dc-expanded-field">
                              <label className="dc-expanded-label">Special Gear</label>
                              <div className="dc-armory-trooper-gear">
                                {assignedItems.map((item) => {
                                  const gear = T.SPECIAL_GEAR_INDEX[item.gearId];
                                  return (
                                    <div key={item.id} className="dc-armory-trooper-gear-item">
                                      <div className="dc-armory-trooper-gear-info">
                                        <div className="dc-armory-trooper-gear-name">{gear?.name ?? "Unknown Gear"}</div>
                                        {gear?.function ? (
                                          <div className="dc-armory-trooper-gear-function">{gear.function}</div>
                                        ) : null}
                                      </div>
                                      <button
                                        type="button"
                                        className="dc-btn dc-btn--sm"
                                        onClick={() => assignInventoryItem(item.id, null)}
                                      >
                                        Unassign
                                      </button>
                                    </div>
                                  );
                                })}
                                {legacyAssignedNames.map((name, index) => (
                                  <div key={`legacy-${t.id}-${index}`} className="dc-armory-trooper-gear-item">
                                    <div className="dc-armory-trooper-gear-info">
                                      <div className="dc-armory-trooper-gear-name">{name}</div>
                                      <div className="dc-armory-trooper-gear-function">Legacy gear (needs reacquisition)</div>
                                    </div>
                                  </div>
                                ))}
                                {assignedItems.length === 0 && legacyAssignedNames.length === 0 ? (
                                  <div className="dc-armory-trooper-gear-empty">No special gear assigned.</div>
                                ) : null}
                              </div>
                              <div className="dc-armory-trooper-gear-controls">
                                <select
                                  className="dc-select"
                                  value=""
                                  onChange={(event) => {
                                    const itemId = event.target.value;
                                    if (!itemId) {
                                      return;
                                    }
                                    assignInventoryItem(itemId, t.id);
                                    event.currentTarget.value = "";
                                  }}
                                  disabled={unassignedInventoryItems.length === 0}
                                >
                                  <option value="">Assign gear…</option>
                                  {unassignedInventoryItems.map((item) => {
                                    const gear = T.SPECIAL_GEAR_INDEX[item.gearId];
                                    return (
                                      <option key={item.id} value={item.id}>
                                        {gear?.name ?? item.gearId}
                                      </option>
                                    );
                                  })}
                                </select>
                                {unassignedInventoryItems.length === 0 ? (
                                  <div className="dc-armory-trooper-gear-hint">No unassigned gear available.</div>
                                ) : null}
                              </div>
                            </div>

                            {/* Biography */}
                            <div className="dc-expanded-field">
                              <label className="dc-expanded-label">Biography</label>
                              <textarea
                                className="dc-expanded-textarea"
                                value={t.biography ?? ""}
                                onChange={(e) => update(t.id, "biography", e.target.value)}
                                placeholder="Add trooper background, personality, or mission history..."
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!showAllTroopers && reserveCount > 0 && (
              <tr className="dc-reserve-toggle-row">
                <td colSpan={6}>
                  <button type="button" className="dc-reserve-toggle" onClick={() => setShowAllTroopers(true)}>
                    {reserveCount} more Trooper{reserveCount === 1 ? "" : "s"} in the barracks…
                  </button>
                </td>
              </tr>
            )}
            {showAllTroopers && reserveCount > 0 && (
              <tr className="dc-reserve-toggle-row">
                <td colSpan={6}>
                  <button type="button" className="dc-reserve-toggle" onClick={() => setShowAllTroopers(false)}>
                    Hide barracks Trooper{reserveCount === 1 ? "" : "s"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <section className="dc-armory" aria-labelledby="dc-armory-heading">
        <div className="dc-armory-header">
          <h3 id="dc-armory-heading" className="dc-armory-title">Squad Armory</h3>
          <div className="dc-armory-controls">
            <div className="dc-armory-requisition" aria-live="polite">
              <span className="dc-armory-requisition-label">Requisition:</span>
              <div className="dc-inline-group">
                <button
                  type="button"
                  className="dc-btn dc-btn--sm"
                  onClick={() => adjustRequisition(-1)}
                  disabled={armory.requisition <= 0}
                  aria-label="Decrease requisition"
                >
                  -
                </button>
                <span className="dc-valbox" aria-live="polite">{armory.requisition}</span>
                <button
                  type="button"
                  className="dc-btn dc-btn--sm"
                  onClick={() => adjustRequisition(1)}
                  aria-label="Increase requisition"
                >
                  +
                </button>
              </div>
            </div>
            <button type="button" className="dc-btn" onClick={() => setIsCatalogOpen(true)}>
              Acquire Gear
            </button>
          </div>
        </div>

        <div className="dc-armory-body">
          {armory.items.length === 0 ? (
            <div className="dc-armory-empty">No special gear acquired yet. Spend requisition to equip the squad.</div>
          ) : (
            <ul className="dc-armory-items">
              {armory.items.map((item) => {
                const gear = T.SPECIAL_GEAR_INDEX[item.gearId];
                const assignedTrooper = troopers.find((trooper) => trooper.id === item.assignedTrooperId) ?? null;
                const assignedIndex = assignedTrooper ? troopers.findIndex((trooper) => trooper.id === assignedTrooper.id) : -1;
                const assignedName = assignedTrooper
                  ? assignedTrooper.name.trim() || (assignedIndex >= 0 ? `Trooper ${assignedIndex + 1}` : `Trooper ${assignedTrooper.id}`)
                  : "Unassigned";

                return (
                  <li key={item.id} className="dc-armory-item">
                    <div className="dc-armory-item-main">
                      <div className="dc-armory-item-header">
                        <h4 className="dc-armory-item-name">{gear?.name ?? "Unknown Gear"}</h4>
                        <span className="dc-armory-item-cost">Req {gear?.requisition ?? "?"}</span>
                      </div>
                      {gear?.description ? (
                        <p className="dc-armory-item-description">{gear.description}</p>
                      ) : null}
                      {gear?.function ? (
                        <p className="dc-armory-item-function">{gear.function}</p>
                      ) : null}
                    </div>
                    <div className="dc-armory-item-actions">
                      <label className="dc-armory-item-label" htmlFor={`armory-assign-${item.id}`}>
                        Assigned To
                      </label>
                      <select
                        id={`armory-assign-${item.id}`}
                        className="dc-select"
                        value={item.assignedTrooperId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) {
                            assignInventoryItem(item.id, null);
                          } else {
                            assignInventoryItem(item.id, Number(value));
                          }
                        }}
                      >
                        <option value="">Unassigned</option>
                        {troopers.map((trooper, index) => {
                          const label = trooper.name.trim() || `Trooper ${index + 1}`;
                          return (
                            <option key={trooper.id} value={trooper.id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <div className="dc-armory-item-assigned">{assignedName}</div>
                      <button
                        type="button"
                        className="dc-btn dc-btn--sm dc-armory-item-destroy"
                        onClick={() => destroyInventoryItem(item.id)}
                      >
                        Destroy
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {isCatalogOpen ? (
        <div className="dc-modal-overlay" onClick={() => setIsCatalogOpen(false)}>
          <div className="dc-modal dc-armory-modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="dc-armory-modal-title">Acquire Special Gear</h3>
            <p className="dc-armory-modal-summary">Available requisition: {armory.requisition}</p>
            <div className="dc-armory-catalog">
              {T.SPECIAL_GEAR.map((gear) => {
                const canAfford = armory.requisition >= gear.requisition;
                return (
                  <div key={gear.id} className="dc-armory-catalog-item">
                    <div className="dc-armory-catalog-info">
                      <div className="dc-armory-catalog-header">
                        <div className="dc-armory-catalog-name">{gear.name}</div>
                        <span className="dc-armory-catalog-cost">Req {gear.requisition}</span>
                      </div>
                      <p className="dc-armory-catalog-description">{gear.description}</p>
                      <p className="dc-armory-catalog-function">{gear.function}</p>
                    </div>
                    <button
                      type="button"
                      className="dc-btn dc-btn--sm"
                      onClick={() => handleAcquireGear(gear.id)}
                      disabled={!canAfford}
                    >
                      Acquire
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="dc-modal-buttons">
              <button type="button" className="dc-btn" onClick={() => setIsCatalogOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}