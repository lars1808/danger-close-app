import type { Trooper } from "./types";

export const SQUAD_STORAGE_KEY = "danger-close-squad";
export const SQUAD_NAME_STORAGE_KEY = "danger-close-squad-name";
export const SQUAD_UPDATED_EVENT = "dc-squad-updated";

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
