import React, { useState, useEffect } from "react";
import * as T from "./types";
import {
  SQUAD_STORAGE_KEY,
  SQUAD_NAME_STORAGE_KEY,
  SQUAD_UPDATED_EVENT,
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

interface SquadTableProps {
  onAddLog: (text: string, source: "USER" | "SYSTEM") => void;
  mission: T.Mission;
  currentSectorId: string | null;
}
export default function SquadTable(props: SquadTableProps) {
  const { onAddLog, mission, currentSectorId } = props;
  const [troopers, setTroopers] = useState<T.Trooper[]>(() => {
    const saved = localStorage.getItem(SQUAD_STORAGE_KEY);
    const base = saved ? (JSON.parse(saved) as Partial<T.Trooper>[]) : defaultTroopers;
    return base.map((r, i) => {
      const d = defaultTroopers[i] ?? defaultTroopers[0];
      return {
        id: r.id ?? d.id,
        name: r.name ?? d.name,
        status: (r.status as T.Status) ?? "OK",
        grit: Number.isFinite(r.grit) ? (r.grit as number) : 3,
        ammo: Number.isFinite(r.ammo) ? (r.ammo as number) : 3,
        notes: r.notes ?? "",
        weaponId: (r.weaponId as T.WeaponId) ?? d.weaponId ?? "assault_rifle",
        armorId: (r.armorId as T.ArmorId) ?? d.armorId ?? "medium",
        biography: r.biography ?? "",
        specialGear: Array.isArray(r.specialGear) ? r.specialGear : [],
        offensivePosition:
          (r.offensivePosition as T.OffensivePosition | undefined) ??
          d.offensivePosition ??
          "Engaged",
        defensivePosition:
          (r.defensivePosition as T.DefensivePosition | undefined) ??
          d.defensivePosition ??
          "In Cover",
      };
    });
  });

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showAllTroopers, setShowAllTroopers] = useState(false);
  const [draggedTrooperId, setDraggedTrooperId] = useState<number | null>(null);
  const [dragOverTrooperId, setDragOverTrooperId] = useState<number | null>(null);
  const [squadName, setSquadName] = useState<string>(() => localStorage.getItem(SQUAD_NAME_STORAGE_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(SQUAD_STORAGE_KEY, JSON.stringify(troopers));
    window.dispatchEvent(new Event(SQUAD_UPDATED_EVENT));
  }, [troopers]);

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

  function resetSquad() {
    if (confirm("Reset squad to defaults?")) {
      setTroopers(defaultTroopers.map((trooper) => ({ ...trooper })));
      localStorage.removeItem(SQUAD_STORAGE_KEY);
      setSquadName("");
      localStorage.removeItem(SQUAD_NAME_STORAGE_KEY);
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
    const special = (trooper.specialGear ?? []).length > 0
      ? (trooper.specialGear ?? []).map((id) => T.SPECIAL_GEAR_INDEX[id]?.name).join(", ")
      : "";
    return special ? `${weapon}, ${armor}, ${special}` : `${weapon}, ${armor}`;
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
              <th>Notes</th>
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

                    {/* Notes */}
                    <td className="dc-td--notes">
                      <input
                        className="dc-input"
                        value={t.notes ?? ""}
                        onChange={(e) => update(t.id, "notes", e.target.value)}
                        placeholder="notes"
                      />
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
                      <td colSpan={7}>
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

{/* Special Gear - Dropdown */}
<div className="dc-expanded-field">
  <label className="dc-expanded-label">Special Gear</label>
  <select
    className="dc-select"
    value={(t.specialGear ?? [])[0] ?? ""}
    onChange={(e) => {
      const selected = e.target.value;
      update(t.id, "specialGear", selected ? [selected] : []);
    }}
  >
    <option value="">None</option>
    {T.SPECIAL_GEAR.sort((a, b) => a.name.localeCompare(b.name)).map((gear) => (
      <option key={gear.id} value={gear.id}>
        {gear.name} ({gear.requisition})
      </option>
    ))}
  </select>
</div>

                            {/* Biography */}
                            <div className="dc-expanded-field">
                              <label className="dc-expanded-label">Biography</label>
                              <textarea
                                className="dc-expanded-textarea"
                                value={t.biography ?? ""}
                                onChange={(e) => update(t.id, "biography", e.target.value)}
                                placeholder="Add trooper background, personality, or notes..."
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
                <td colSpan={7}>
                  <button type="button" className="dc-reserve-toggle" onClick={() => setShowAllTroopers(true)}>
                    {reserveCount} more Trooper{reserveCount === 1 ? "" : "s"} in the barracks…
                  </button>
                </td>
              </tr>
            )}
            {showAllTroopers && reserveCount > 0 && (
              <tr className="dc-reserve-toggle-row">
                <td colSpan={7}>
                  <button type="button" className="dc-reserve-toggle" onClick={() => setShowAllTroopers(false)}>
                    Hide barracks Trooper{reserveCount === 1 ? "" : "s"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}