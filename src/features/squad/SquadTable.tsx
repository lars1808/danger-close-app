import React, { useState, useEffect } from "react";
import * as T from "./types";

const STORAGE_KEY = "danger-close-squad";
const SQUAD_NAME_STORAGE_KEY = "danger-close-squad-name";

const defaultTroopers: T.Trooper[] = [
  { id: 1, name: "Aelius",    status: "OK", grit: 3, ammo: 3, notes: "", weaponId: "assault_rifle",  armorId: "medium", biography: "" },
  { id: 2, name: "Brennus",   status: "OK", grit: 3, ammo: 3, notes: "", weaponId: "carbine",        armorId: "light", biography: "" },
  { id: 3, name: "Cassander", status: "OK", grit: 3, ammo: 3, notes: "", weaponId: "assault_rifle",  armorId: "medium", biography: "" },
  { id: 4, name: "Decimus",   status: "OK", grit: 3, ammo: 3, notes: "", weaponId: "assault_rifle",  armorId: "heavy", biography: "" },
  { id: 5, name: "Ector",     status: "OK", grit: 3, ammo: 3, notes: "", weaponId: "marksman_rifle", armorId: "light", biography: "" },
];

interface SquadTableProps {
  onAddLog: (text: string, source: "USER" | "SYSTEM") => void;
}
export default function SquadTable(props: SquadTableProps) {
  const { onAddLog } = props;
  const [troopers, setTroopers] = useState<T.Trooper[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
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
      };
    });
  });

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [squadName, setSquadName] = useState<string>(() => localStorage.getItem(SQUAD_NAME_STORAGE_KEY) ?? "");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(troopers));
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
      setTroopers(defaultTroopers);
      localStorage.removeItem(STORAGE_KEY);
      setSquadName("");
      localStorage.removeItem(SQUAD_NAME_STORAGE_KEY);
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

  function getGearSummary(trooper: T.Trooper): string {
    const weapon = T.WEAPON_INDEX[trooper.weaponId]?.name ?? "Unknown";
    const armor = T.ARMOR_INDEX[trooper.armorId]?.name ?? "Unknown";
    const special = (trooper.specialGear ?? []).length > 0
      ? (trooper.specialGear ?? []).map((id) => T.SPECIAL_GEAR_INDEX[id]?.name).join(", ")
      : "";
    return special ? `${weapon}, ${armor}, ${special}` : `${weapon}, ${armor}`;
  }

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
        <button onClick={resetSquad} className="dc-btn dc-btn--accent">Reset Squad</button>
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
            </tr>
          </thead>

          <tbody>
            {troopers.map((t) => {
              const isExpanded = expandedIds.has(t.id);
              const gearSummary = getGearSummary(t);

              return (
                <React.Fragment key={t.id}>
                  {/* MAIN ROW */}
                  <tr>
                    {/* Expand button */}
                    <td className="dc-col-expand">
                      <button
                        onClick={() => toggleExpanded(t.id)}
                        className={`dc-expand-btn ${isExpanded ? "expanded" : ""}`}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${t.name}`}
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
      onAddLog(`${t.name} status changed to ${newStatus}`, "SYSTEM");
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
                        <button onClick={() => bump(t.id, "grit", -1)} className="dc-btn dc-btn--sm">-</button>
                        <span className="dc-valbox">{t.grit}</span>
                        <button onClick={() => bump(t.id, "grit", +1)} className="dc-btn dc-btn--sm">+</button>
                      </div>
                    </td>

                    {/* Ammo */}
                    <td className="dc-td--num">
                      <div className="dc-inline-group">
                        <button onClick={() => bump(t.id, "ammo", -1)} className="dc-btn dc-btn--sm">-</button>
                        <span className="dc-valbox">{t.ammo}</span>
                        <button onClick={() => bump(t.id, "ammo", +1)} className="dc-btn dc-btn--sm">+</button>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}