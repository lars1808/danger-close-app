import * as T from "../squad/types";

export const THREAT_CONTENT_VALUES = ["TL 1", "TL 2", "TL 3", "TL 4"] as const;
export const MISSION_WEATHER_OPTIONS = ["Normal", "Bad", "Terrible"] as const satisfies ReadonlyArray<T.MissionWeather>;

export type ThreatContent = (typeof THREAT_CONTENT_VALUES)[number];

export function isThreatContent(content: T.MissionContent): content is ThreatContent {
  return (THREAT_CONTENT_VALUES as readonly string[]).includes(content);
}

export function getSectorDisplayName(sector: T.MissionSector): string {
  const trimmed = sector.name.trim();
  return trimmed || "Unnamed Sector";
}
