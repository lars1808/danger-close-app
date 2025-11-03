export const SQUAD_STORAGE_KEY = "danger-close-squad";
export const SQUAD_NAME_STORAGE_KEY = "danger-close-squad-name";

export function getStoredSquadName(): string {
  try {
    return localStorage.getItem(SQUAD_NAME_STORAGE_KEY) ?? "";
  } catch (error) {
    return "";
  }
}
