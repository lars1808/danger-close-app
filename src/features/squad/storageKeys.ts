import type { SquadArmoryState, SquadInventoryItem, Trooper } from "./types";
import { SPECIAL_GEAR_INDEX } from "./types";

export const SQUAD_STORAGE_KEY = "danger-close-squad";
export const SQUAD_NAME_STORAGE_KEY = "danger-close-squad-name";
export const SQUAD_UPDATED_EVENT = "dc-squad-updated";
export const SQUAD_ARMORY_STORAGE_KEY = "danger-close-squad-armory";

export function getStoredSquadName(): string {
  try {
    return localStorage.getItem(SQUAD_NAME_STORAGE_KEY) ?? "";
  } catch (error) {
    return "";
  }
}

export function getStoredSquad(): Partial<Trooper>[] {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Partial<Trooper>[];
  } catch (error) {
    return [];
  }
}

function sanitizeInventoryItems(items: unknown): SquadInventoryItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const seenIds = new Set<string>();
  const sanitized: SquadInventoryItem[] = [];

  items.forEach((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") {
      return;
    }

    const candidate = rawItem as Partial<SquadInventoryItem> & {
      gearId?: unknown;
      id?: unknown;
      assignedTrooperId?: unknown;
    };

    const itemId = typeof candidate.id === "string" ? candidate.id : null;
    const gearId = typeof candidate.gearId === "string" ? candidate.gearId : null;

    if (!itemId || !gearId) {
      return;
    }

    if (!(gearId in SPECIAL_GEAR_INDEX)) {
      return;
    }

    if (seenIds.has(itemId)) {
      return;
    }

    let assignedTrooperId: number | null = null;
    if (typeof candidate.assignedTrooperId === "number" && Number.isFinite(candidate.assignedTrooperId)) {
      assignedTrooperId = Math.trunc(candidate.assignedTrooperId);
    } else if (typeof candidate.assignedTrooperId === "string") {
      const parsed = Number(candidate.assignedTrooperId);
      if (Number.isFinite(parsed)) {
        assignedTrooperId = Math.trunc(parsed);
      }
    }

    sanitized.push({ id: itemId, gearId, assignedTrooperId });
    seenIds.add(itemId);
  });

  return sanitized;
}

export function getStoredArmory(): SquadArmoryState {
  try {
    const raw = localStorage.getItem(SQUAD_ARMORY_STORAGE_KEY);
    if (!raw) {
      return { requisition: 0, items: [] };
    }

    const parsed = JSON.parse(raw) as Partial<SquadArmoryState> & {
      items?: unknown;
      requisition?: unknown;
    };

    const requisitionValue = Number(parsed?.requisition);
    const requisition = Number.isFinite(requisitionValue) ? Math.max(0, Math.trunc(requisitionValue)) : 0;
    const items = sanitizeInventoryItems(parsed?.items ?? []);

    return { requisition, items };
  } catch (error) {
    return { requisition: 0, items: [] };
  }
}
