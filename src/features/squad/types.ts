export type Status = 'OK' | 'Grazed' | 'Wounded' | 'Bleeding Out' | 'Dead';

export type OffensivePosition = 'Flanking' | 'Engaged' | 'Limited';
export type DefensivePosition = 'Fortified' | 'In Cover' | 'Flanked';

export type TrooperIntent =
  | 'Fire'
  | 'Move'
  | 'Covering Fire'
  | 'Use Special Gear'
  | 'Interact'
  | 'Disengage';

export type WeaponId = 'carbine' | 'assault_rifle' | 'marksman_rifle';
export type ArmorId = 'light' | 'medium' | 'heavy';

export interface Weapon {
  id: WeaponId;
  name: string;
  info: string; // used for tooltips / references elsewhere
}

export interface Armor {
  id: ArmorId;
  name: string;
  info: string;
}

export interface SpecialGear {
  id: string;
  name: string;
  type: 'weapon' | 'equipment';
  requisition: number;  // 0-3
  description: string;
  function: string;
}

export interface SquadInventoryItem {
  id: string;
  gearId: string;
  assignedTrooperId: number | null;
}

export interface SquadArmoryState {
  requisition: number;
  items: SquadInventoryItem[];
}

export interface Trooper {
  id: number;
  name: string;
  status: Status;
  grit: number;   // 0–3 intended
  ammo: number;   // 0–3 intended
  notes?: string;
  weaponId: WeaponId;
  armorId: ArmorId;
  biography?: string;
  specialGear?: string[];  // Array of special gear inventory IDs
  offensivePosition?: OffensivePosition;
  defensivePosition?: DefensivePosition;
  intent?: TrooperIntent | null;
}

export const STATUS_ORDER: Status[] = ['OK', 'Grazed', 'Wounded', 'Bleeding Out', 'Dead'];

export function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

// ----- Equipment catalogs -----
export const WEAPONS: Weapon[] = [
  {
    id: 'carbine',
    name: 'Carbine',
    info: 'Compact rifle. Good in confined spaces; standard accuracy. 1d6 to Offense Roll when Engaged in Tight battlefields.',
  },
  {
    id: 'assault_rifle',
    name: 'Assault rifle',
    info: 'Versatile service rifle. Balanced range and fire rate. 1-in-6 chance of not consuming Ammo when enhancing an Attack.',
  },
  {
    id: 'marksman_rifle',
    name: 'Marksman rifle',
    info: 'Scoped, accurate. Favours aimed shots; slower handling. +1d6 to Offense Roll when Limited in Transitional or Open battlefields.',
  },
];

export const ARMORS: Armor[] = [
  {
    id: 'light',
    name: 'Light armor',
    info: 'High mobility. Minimal protection. Roll twice when Moving, pick the best result.',
  },
  {
    id: 'medium',
    name: 'Medium armor',
    info: 'Balanced protection and mobility. Ignore the first Injury taken during Mission.',
  },
  {
    id: 'heavy',
    name: 'Heavy armor',
    info: 'Maximum protection. Reduced agility. Reduces Injury range by 1.',
  },
];

export const SPECIAL_GEAR: SpecialGear[] = [
  {
    id: 'lmg',
    name: 'LMG',
    type: 'weapon',
    requisition: 1,
    description: 'Light automatic weapon for mobile suppression and supporting fire.',
    function: 'Passive: An additional +1d6 for the Defense Roll of a Trooper receiving Covering Fire.',
  },
  {
    id: 'sniper_rifle',
    name: 'Sniper Rifle',
    type: 'weapon',
    requisition: 1,
    description: 'Long-range rifle optimized for precision shots from cover.',
    function: 'Passive: +1d6 to the Offense Roll when Fortified. An additional +1d6 when Fortified and didn\'t Move in the previous Exchange.',
  },
  {
    id: 'grenade_launcher',
    name: 'Grenade Launcher',
    type: 'weapon',
    requisition: 1,
    description: 'Indirect-fire weapon used to flush enemies or hit hard targets.',
    function: 'Active: Launch a grenade against a Hard Target (counts as a Hit), or at another Trooper\'s target, granting them the benefit of Flanking in the next Offense Roll.',
  },
  {
    id: 'hmg',
    name: 'HMG',
    type: 'weapon',
    requisition: 2,
    description: 'Heavy-caliber weapon best deployed from a braced or fortified position.',
    function: 'Passive: +1d6 on Offensive Roll when Fortified. Active: Provide Covering Fire for up to 3 Troopers this round.',
  },
  {
    id: 'rocket_launcher',
    name: 'Rocket Launcher',
    type: 'weapon',
    requisition: 1,
    description: 'Anti-armor launcher designed to destroy vehicles and strongpoints.',
    function: 'Active: Add +3d6 to Offensive Roll - or deal direct damage to a Hard Target, counting as 2 Hits. Trooper is in Exposed position after use. Single use.',
  },
  {
    id: 'melee_weapon',
    name: 'Melee Weapon',
    type: 'weapon',
    requisition: 0,
    description: 'A large maul, chainsaw sword or similar device.',
    function: 'Passive: When a Trooper Moves Up to a Flanking position, they can choose to move to a Flanked position instead of rolling.',
  },
  {
    id: 'plasma_rifle',
    name: 'Plasma Rifle',
    type: 'weapon',
    requisition: 3,
    description: 'A devastating energy weapon prone to catastrophic feedback.',
    function: 'Active: Roll 1d6 on use. Results vary from Catastrophic Failure to Overcharged Blast.',
  },
  {
    id: 'commanders_kit',
    name: 'Commander\'s Kit',
    type: 'equipment',
    requisition: 1,
    description: 'Encrypted comms headset, wrist-mounted tactical interface, signal override module.',
    function: 'Whenever Enemy Tactics are triggered, roll 1d6. On a 1–3, the Tactic is nullified as the Commander adapts the squad\'s response in time.',
  },
  {
    id: 'demolition_charges',
    name: 'Demolition Charges',
    type: 'equipment',
    requisition: 0,
    description: 'Bulky, high-power charges. No use in a fight - but crucial if a mission revolves around destroying critical infrastructure.',
    function: 'Placing charges takes 2 Exchanges: 1 to move towards a suitable point, 1 to set the charges.',
  },
  {
    id: 'drone_gear',
    name: 'Drone Gear',
    type: 'equipment',
    requisition: 0,
    description: 'Backpack with a deployable aerial recon drone.',
    function: 'Once per mission, add +1 to the next Advance Roll.',
  },
  {
    id: 'jump_pack',
    name: 'Jump Pack',
    type: 'equipment',
    requisition: 2,
    description: 'Back-mounted miniature jet engine.',
    function: 'Once per Engagement, the Trooper can use their Move to instantly shift to a Offensive/Defensive position of choice.',
  },
  {
    id: 'medic_gear',
    name: 'Medic Gear',
    type: 'equipment',
    requisition: 1,
    description: 'Bandages, combat stims, splints and sprays.',
    function: 'Allows the user to patch up Wounded Troopers back to Grazed when out of combat. Costs 1 Ammo per restoration.',
  },
  {
    id: 'radio_gear',
    name: 'Radio Gear',
    type: 'equipment',
    requisition: 1,
    description: 'Bulky backpack-sized transmitter and receiver, allowing one to reach command.',
    function: 'Call in an artillery strike on the current Sector, once per Mission. Hits in 1d2 Exchanges from now.',
  },
  {
    id: 'supply_backpack',
    name: 'Supply Backpack',
    type: 'equipment',
    requisition: 1,
    description: 'Tactical sack stuffed with a variety of ammo, munitions and grenades.',
    function: 'Holds 6 extra Ammo, which can be redistributed after combat.',
  },
];

// quick lookups
export const WEAPON_INDEX = Object.fromEntries(WEAPONS.map(w => [w.id, w])) as Record<WeaponId, Weapon>;
export const ARMOR_INDEX  = Object.fromEntries(ARMORS.map(a => [a.id, a])) as Record<ArmorId, Armor>;
export const SPECIAL_GEAR_INDEX = Object.fromEntries(SPECIAL_GEAR.map(g => [g.id, g])) as Record<string, SpecialGear>;

// ===== MISSION TYPES =====
export type Difficulty = 'Routine' | 'Hazardous' | 'Desperate';
export type Airspace = 'Clear' | 'Contested' | 'Hostile';

export type MissionCover = 'Exposed' | 'Normal' | 'Dense';
export type MissionSpace = 'Tight' | 'Transitional' | 'Open';
export type MissionContent = 'Boon' | 'Nothing' | 'TL 1' | 'TL 2' | 'TL 3' | 'TL 4';
export type MissionWeather = 'Normal' | 'Bad' | 'Terrible';

export interface MissionSector {
  id: string;
  name: string;
  cover: MissionCover;
  space: MissionSpace;
  content: MissionContent;
  weather: MissionWeather;
  momentum: number;
  hardTargets: HardTarget[];
}

export interface Mission {
  id: string;
  name: string;
  objective: string;
  briefing: string;
  difficulty: Difficulty;
  airspace: Airspace;
  status: 'planning' | 'active' | 'complete';
  startTime?: number;
  sectors: MissionSector[];
}

export interface HardTarget {
  id: string;
  name: string;
  hits: number;
}

// ===== LOG ENTRIES =====
export type LogSource = 'SYSTEM' | 'USER';

export interface LogEntry {
  id: string;
  timestamp: string; // Format: HH:MM:SS
  source: LogSource;
  text: string;
  order: number; // For drag-and-drop reordering
}