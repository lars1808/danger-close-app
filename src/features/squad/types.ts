export type Status = 'OK' | 'Grazed' | 'Wounded' | 'Bleeding Out' | 'Dead';

export interface Trooper {
  id: number;
  name: string;
  status: Status;
  grit: number; // 0–3 intended
  ammo: number; // 0–3 intended
  notes?: string;
  weaponId?: string;
}

export const STATUS_ORDER: Status[] = ['OK', 'Grazed', 'Wounded', 'Bleeding Out', 'Dead'];

export function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}
