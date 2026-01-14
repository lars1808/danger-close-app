# CLAUDE.md - AI Assistant Guide for Danger Close

**Last Updated**: 2026-01-14
**Version**: 1.0.0

This document provides comprehensive guidance for AI assistants working on the Danger Close codebase. It covers architecture, conventions, workflows, and best practices to ensure consistent and high-quality contributions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Codebase Architecture](#codebase-architecture)
4. [Development Conventions](#development-conventions)
5. [State Management](#state-management)
6. [Type System](#type-system)
7. [Styling Conventions](#styling-conventions)
8. [Component Patterns](#component-patterns)
9. [Data Persistence](#data-persistence)
10. [Development Workflow](#development-workflow)
11. [Testing Approach](#testing-approach)
12. [Common Tasks](#common-tasks)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Danger Close** is a tabletop wargaming companion application that helps players manage skirmish-scale battles. It's a single-page application (SPA) built with React 19 and TypeScript, running entirely in the browser with localStorage persistence.

### Key Features
- **Squad Builder**: Manage 5+ trooper roster with stats, equipment, and special gear
- **Mission Planner**: Create missions with objectives, sectors, and environmental conditions
- **Engagement System**: Track combat mechanics including positioning, momentum, and injury progression
- **Dice Tray**: Animated d6 roller with result tracking
- **Mission Log**: Timestamped event log with drag-and-drop reordering
- **Rules Reference**: Embedded game rules documentation

### Design Philosophy
- **Zero Backend**: Fully client-side with localStorage persistence
- **Minimal Dependencies**: Only React and React-DOM in production
- **Type Safety**: Strict TypeScript configuration with comprehensive game-specific types
- **Accessibility**: Semantic HTML, keyboard navigation, ARIA attributes
- **Offline-First**: Works without internet connection after initial load

---

## Technology Stack

### Core Technologies
```json
{
  "runtime": "React 19.1.1",
  "language": "TypeScript 5.9.3",
  "buildTool": "Vite 7.1.7",
  "target": "ES2022"
}
```

### Development Tools
- **ESLint 9.36.0**: Modern flat config with React Hooks rules
- **Prettier 3.6.2**: Code formatting (single quotes, semicolons, 100 char width)
- **TypeScript**: Strict mode with all safety checks enabled

### No UI Libraries
This project **intentionally avoids** UI frameworks like Material-UI, Chakra, etc. All components are custom-built with vanilla React and CSS.

---

## Codebase Architecture

### Directory Structure

```
danger-close-app/
├── src/
│   ├── features/              # Feature-based modules
│   │   ├── squad/             # Squad management & shared types
│   │   │   ├── SquadTable.tsx       (1,132 lines)
│   │   │   ├── types.ts             (288 lines - SHARED TYPES)
│   │   │   └── storageKeys.ts       (Storage utilities)
│   │   ├── mission/           # Mission planning
│   │   │   ├── MissionSetup.tsx     (1,374 lines)
│   │   │   └── missionUtils.ts      (Utility functions)
│   │   ├── engagement/        # Combat mechanics
│   │   │   ├── EngagementTab.tsx    (3,767 lines - LARGEST)
│   │   │   └── momentumUtils.ts     (Momentum state logic)
│   │   ├── log/               # Mission logging
│   │   │   ├── LogFlyout.tsx        (Modal view)
│   │   │   └── LogTab.tsx           (Inline view)
│   │   ├── dice/              # Dice rolling
│   │   │   └── DiceTray.tsx         (Animated roller)
│   │   └── rules/             # Rules documentation
│   │       └── RulesReferencePanel.tsx
│   ├── styles/
│   │   └── danger-close.css   # Main CSS with theme system
│   ├── assets/                # Static assets
│   ├── App.tsx                # Root component (state coordinator)
│   ├── main.tsx               # React entry point
│   ├── App.css                # App-level styles
│   └── index.css              # Base CSS resets
├── public/
│   └── rules-reference.md     # Game rules documentation
├── Configuration files
└── README.md
```

### Code Statistics
- **Total Lines**: ~8,051 TypeScript/TSX across 13 files
- **Largest Component**: EngagementTab.tsx (3,767 lines)
- **Shared Types**: Centralized in `src/features/squad/types.ts`

### Import Patterns

**Type Imports** (always use namespace import):
```typescript
import * as T from "./features/squad/types";

// Usage:
const [mission, setMission] = useState<T.Mission>(() => { /* ... */ });
const [troopers, setTroopers] = useState<T.Trooper[]>([]);
```

**Component Imports**:
```typescript
import SquadTable from "./features/squad/SquadTable";
import EngagementTab from "./features/engagement/EngagementTab";
```

**Style Imports**:
```typescript
import "./styles/danger-close.css"; // Global styles in App.tsx
```

---

## Development Conventions

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **Component Files** | PascalCase | `SquadTable.tsx`, `EngagementTab.tsx` |
| **Utility Files** | camelCase | `missionUtils.ts`, `momentumUtils.ts` |
| **Type Definitions** | PascalCase | `Trooper`, `Mission`, `LogEntry` |
| **Type Files** | camelCase | `types.ts`, `storageKeys.ts` |
| **CSS Classes** | kebab-case with `dc-` prefix | `.dc-container`, `.dc-btn`, `.dc-table` |
| **Functions** | camelCase | `addLogEntry`, `normalizeMission` |
| **Event Handlers** | `handle` prefix | `handleRoll`, `handleAddEntry` |
| **Storage Keys** | kebab-case with `danger-close-` prefix | `danger-close-mission`, `danger-close-squad` |
| **React Hooks** | `use` prefix | `useState`, `useEffect`, `useCallback` |
| **Constants** | SCREAMING_SNAKE_CASE | `MISSION_STORAGE_KEY`, `ROLL_DURATION_MS` |

### File Organization Rules

1. **One component per file**: Each `.tsx` file exports a single default component
2. **Co-locate utilities**: Place utility functions near the features that use them
3. **Centralized types**: All shared types live in `src/features/squad/types.ts`
4. **Feature-based structure**: Group by feature/domain, not by technical role

### Code Style

**Prettier Configuration** (`.prettierrc`):
```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100
}
```

**TypeScript Strict Mode** (all enabled):
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedSideEffectImports: true`

---

## State Management

### Architecture: Local State + localStorage

This project **does not use**:
- ❌ Redux
- ❌ Context API
- ❌ Zustand or other state libraries

Instead, it uses:
- ✅ `useState` hooks for component state
- ✅ Props drilling from App.tsx to child components
- ✅ localStorage for persistence
- ✅ Callback props for child → parent communication

### State Flow Pattern

```
┌─────────────────────────────────────────────┐
│              App.tsx (Root)                  │
│  - Manages: mission, logEntries, theme      │
│  - Syncs to localStorage via useEffect      │
└─────────────┬───────────────────────────────┘
              │
              ├─► SquadTable (manages own trooper state)
              ├─► MissionSetup (receives mission, sends updates via callback)
              ├─► EngagementTab (receives mission, sends updates via callback)
              └─► LogFlyout (receives logEntries, sends updates via callback)
```

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `danger-close-mission` | `T.Mission` | Current mission state |
| `danger-close-squad` | `T.Trooper[]` | Squad roster |
| `danger-close-squad-name` | `string` | Squad name |
| `danger-close-squad-armory` | `T.SquadArmoryState` | Equipment inventory |
| `dc-theme` | `Theme` | User theme preference |

### State Update Pattern

```typescript
// Example from App.tsx
useEffect(() => {
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(mission));
}, [mission]);

// Example of callback-based updates
function handleMissionUpdate(updatedMission: T.Mission) {
  setMission(updatedMission);
  // localStorage is automatically synced via useEffect dependency
}
```

### Best Practices

1. **Initialize from localStorage**:
   ```typescript
   const [mission, setMission] = useState<T.Mission>(() => {
     const saved = localStorage.getItem(MISSION_STORAGE_KEY);
     return saved ? normalizeMission(JSON.parse(saved)) : normalizeMission(undefined);
   });
   ```

2. **Use useEffect for persistence**:
   ```typescript
   useEffect(() => {
     localStorage.setItem(key, JSON.stringify(value));
   }, [value]);
   ```

3. **Validate data from storage** (see `src/features/squad/storageKeys.ts`):
   - Check for valid IDs against known catalogs
   - Clamp numeric values to valid ranges
   - Provide sensible defaults for missing data

---

## Type System

### Central Type File

**Location**: `src/features/squad/types.ts` (288 lines)

This file contains **all shared types** for the application. Import it as a namespace:

```typescript
import * as T from "./features/squad/types";
```

### Core Type Categories

#### 1. Trooper Types

```typescript
export type Status = 'OK' | 'Grazed' | 'Wounded' | 'Bleeding Out' | 'Dead';
export type OffensivePosition = 'Flanking' | 'Engaged' | 'Limited';
export type DefensivePosition = 'Fortified' | 'In Cover' | 'Flanked';
export type TrooperIntent = 'Fire' | 'Move Up' | 'Fall Back' | 'Covering Fire'
                          | 'Use Special Gear' | 'Interact' | 'Disengage';

export interface Trooper {
  id: number;
  name: string;
  status: Status;
  grit: number;           // 0-3
  ammo: number;           // 0-3
  notes?: string;
  weaponId: WeaponId;
  armorId: ArmorId;
  biography?: string;
  specialGear?: string[]; // Array of inventory item IDs
  offensivePosition?: OffensivePosition;
  defensivePosition?: DefensivePosition;
  intent?: TrooperIntent | null;
  coveringFireTargetId?: number | null;
  atRisk?: boolean;
}
```

#### 2. Equipment Types

```typescript
export type WeaponId = 'carbine' | 'assault_rifle' | 'marksman_rifle';
export type ArmorId = 'light' | 'medium' | 'heavy';

export interface Weapon {
  id: WeaponId;
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
```

#### 3. Mission Types

```typescript
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
```

#### 4. Log Types

```typescript
export type LogSource = 'SYSTEM' | 'USER';

export interface LogEntry {
  id: string;
  timestamp: string;  // HH:MM:SS format
  source: LogSource;
  text: string;
  order: number;      // For drag-and-drop reordering
}
```

### Type Guards

When validating external data (e.g., from localStorage), use type guards:

```typescript
function isTrooperStatus(value: unknown): value is T.Status {
  return typeof value === "string" && T.STATUS_ORDER.includes(value as T.Status);
}

function isValidWeaponId(id: unknown): id is T.WeaponId {
  return typeof id === "string" && id in T.WEAPON_INDEX;
}
```

### Lookup Indexes

For constant-time lookups, use the exported indexes:

```typescript
export const WEAPON_INDEX = Object.fromEntries(
  WEAPONS.map(w => [w.id, w])
) as Record<WeaponId, Weapon>;

export const ARMOR_INDEX = Object.fromEntries(
  ARMORS.map(a => [a.id, a])
) as Record<ArmorId, Armor>;

export const SPECIAL_GEAR_INDEX = Object.fromEntries(
  SPECIAL_GEAR.map(g => [g.id, g])
) as Record<string, SpecialGear>;

// Usage:
const weapon = T.WEAPON_INDEX[trooper.weaponId];
const armor = T.ARMOR_INDEX[trooper.armorId];
```

---

## Styling Conventions

### CSS Architecture

**Single Global CSS File**: `src/styles/danger-close.css`

- Uses CSS custom properties (variables) for theming
- No CSS modules or CSS-in-JS
- BEM-inspired naming with `dc-` prefix

### CSS Variable System

```css
:root {
  /* Color Palette */
  --bg: #0e0f10;
  --panel: #151617;
  --text: #e9ecef;
  --accent: #DDA15E;
  --accent-alt: #606C38;

  /* Threat Levels */
  --threat-tl1: #8ac926;
  --threat-tl2: #ffca3a;
  --threat-tl3: #f77f00;
  --threat-tl4: #f94144;

  /* Status Colors */
  --ok: #58d68d;
  --grazed: #f7dc6f;
  --wounded: #f5b041;
  --bleeding: #e74c3c;
  --dead: #000000;

  /* Typography */
  --font-main: "Outfit", system-ui, sans-serif;
  --font-display: "Quantico", ui-sans-serif;
  --font-mono: "Courier New", monospace;
}
```

### Theme System

Three complete themes are available:

1. **Default Theme** (base CSS variables)
2. **Terminal Theme** (`.theme-terminal` class on `:root`)
   - Monospace fonts (VT323)
   - Green CRT aesthetic
   - Text glow effects
3. **Crusade Theme** (`.theme-crusade` class on `:root`)
   - Ornate serif fonts (Cinzel, Rajdhani)
   - Gold and crimson color scheme
   - Medieval/gothic aesthetic

**Theme Application** (in App.tsx):
```typescript
useEffect(() => {
  const root = document.documentElement;
  root.classList.remove("theme-terminal", "theme-crusade");
  if (theme === "terminal") root.classList.add("theme-terminal");
  if (theme === "crusade") root.classList.add("theme-crusade");
  localStorage.setItem("dc-theme", theme);
}, [theme]);
```

### Common CSS Classes

| Class | Purpose |
|-------|---------|
| `.dc-container` | Main app wrapper |
| `.dc-panel` | Content section with border |
| `.dc-btn` | Primary button style |
| `.dc-btn--sm` | Small button variant |
| `.dc-table` | Data table styling |
| `.dc-tab-nav` | Tab navigation container |
| `.dc-tab-btn` | Individual tab button |
| `.dc-input` | Text input field |
| `.dc-select` | Dropdown select |
| `.dc-badge` | Status badge with colored background |

### Styling Best Practices

1. **Always use CSS classes** - Never use inline styles except for dynamic values
2. **Prefix custom classes** - All custom classes start with `dc-`
3. **Use CSS variables** - Reference variables for colors, not hard-coded hex values
4. **Theme-aware colors** - Ensure new colors work in all three themes
5. **Test accessibility** - Maintain contrast ratios for WCAG compliance

---

## Component Patterns

### Functional Components Only

All components are functional components using React Hooks. No class components.

### Standard Component Structure

```typescript
// 1. Imports
import { useState, useEffect, useCallback } from "react";
import * as T from "./features/squad/types";

// 2. Types (Props interfaces)
interface ComponentNameProps {
  data: T.SomeType;
  onUpdate: (updated: T.SomeType) => void;
  optional?: string;
}

// 3. Component definition
export default function ComponentName(props: ComponentNameProps) {
  // 4. State declarations
  const [localState, setLocalState] = useState<T.SomeType>(props.data);

  // 5. Refs (if needed)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 6. Effects
  useEffect(() => {
    // Side effect logic
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // 7. Event handlers
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // 8. Render
  return (
    <div className="dc-component-name">
      {/* JSX */}
    </div>
  );
}
```

### Common Hook Patterns

#### useState with localStorage

```typescript
const [data, setData] = useState<T.DataType>(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : getDefaultValue();
});

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}, [data]);
```

#### useCallback for Event Handlers

```typescript
const handleSubmit = useCallback((event: React.FormEvent) => {
  event.preventDefault();
  // Process form data
}, [dependencies]);
```

#### useRef for DOM Access and Timers

```typescript
const inputRef = useRef<HTMLInputElement>(null);
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

#### useEffect Cleanup

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [onClose]);
```

### Modal/Flyout Pattern

```typescript
export default function ModalComponent({ onClose }: ModalProps) {
  // Prevent body scrolling
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="dc-modal-overlay" onClick={onClose}>
      <div className="dc-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal content */}
      </div>
    </div>
  );
}
```

### Form Input Pattern

```typescript
<input
  type="text"
  className="dc-input"
  value={formData.fieldName}
  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
  placeholder="Enter value..."
/>
```

---

## Data Persistence

### localStorage Strategy

All application data persists to `localStorage` with the following patterns:

#### 1. Mission Data
```typescript
// Location: App.tsx
const MISSION_STORAGE_KEY = "danger-close-mission";

// Load on mount
const [mission, setMission] = useState<T.Mission>(() => {
  const saved = localStorage.getItem(MISSION_STORAGE_KEY);
  return saved ? normalizeMission(JSON.parse(saved)) : normalizeMission(undefined);
});

// Auto-save on change
useEffect(() => {
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(mission));
}, [mission]);
```

#### 2. Squad Data
```typescript
// Location: SquadTable.tsx
export const SQUAD_STORAGE_KEY = "danger-close-squad";

// Utility functions in storageKeys.ts
export function getStoredSquad(): T.Trooper[] {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Validate and sanitize each trooper
    return parsed.map(sanitizeTrooper);
  } catch {
    return [];
  }
}
```

#### 3. Data Migration

When adding new fields to existing types, use normalization functions:

```typescript
export function normalizeMission(data?: Partial<T.Mission>): T.Mission {
  return {
    id: data?.id ?? crypto.randomUUID(),
    name: data?.name ?? "Untitled Mission",
    objective: data?.objective ?? "",
    briefing: data?.briefing ?? "",
    difficulty: data?.difficulty ?? "Routine",
    airspace: data?.airspace ?? "Clear",
    status: data?.status ?? "planning",
    sectors: (data?.sectors ?? []).map(normalizeSector),
    // New fields with defaults for backward compatibility
    startTime: data?.startTime,
  };
}
```

### Data Validation Rules

From `src/features/squad/storageKeys.ts`:

1. **Type Checking**: Verify types before use
2. **Range Clamping**: Ensure numeric values stay in bounds
   ```typescript
   grit: Math.max(0, Math.min(3, raw.grit ?? 3))
   ```
3. **ID Validation**: Check IDs against known catalogs
   ```typescript
   weaponId: isValidWeaponId(raw.weaponId) ? raw.weaponId : 'carbine'
   ```
4. **Array Sanitization**: Remove duplicates and validate items
   ```typescript
   const seen = new Set<string>();
   specialGear: (raw.specialGear ?? []).filter(id => {
     if (seen.has(id)) return false;
     seen.add(id);
     return id in T.SPECIAL_GEAR_INDEX;
   })
   ```

### Reset Functionality

Provide a way to clear all data:

```typescript
const handleReset = useCallback(() => {
  if (window.confirm("Reset all app data? This will clear everything and reload the page.")) {
    localStorage.clear();
    window.location.reload();
  }
}, []);
```

---

## Development Workflow

### Scripts

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # TypeScript check + production build
npm run lint     # Run ESLint on all TypeScript files
npm run preview  # Preview production build locally
```

### Git Workflow

This project uses a feature branch workflow with pull requests.

**Branch Naming**:
- Feature branches: `feature/short-description` or `username/feature-description`
- Bug fixes: `fix/bug-description`
- AI-assisted branches: `claude/description-sessionid` or `codex/description`

**Recent Commit Pattern** (from git log):
```
Merge pull request #78 from lars1808/development
Remove app running and build instructions from README
Merge pull request #77 from lars1808/codex/update-readme-with-project-description
Update project README
Merge pull request #76 from lars1808/codex/implement-move-action-modal-logic
Implement move intent resolution modal
```

**Commit Message Format**:
- Use imperative mood: "Add feature" not "Added feature"
- Be concise but descriptive
- Reference features/components: "Implement move intent resolution modal"
- Keep first line under 72 characters

### Before Committing

1. **Run linter**: `npm run lint`
2. **Test in browser**: `npm run dev` and manually test changes
3. **Check all themes**: Toggle between default, terminal, and crusade themes
4. **Test localStorage**: Verify data persists after page refresh
5. **Check TypeScript**: `npm run build` should complete without errors

### Code Review Checklist

- [ ] TypeScript strict mode passes without errors
- [ ] No unused variables or parameters
- [ ] ESLint passes without warnings
- [ ] Prettier formatting applied (single quotes, semicolons, 100 width)
- [ ] CSS classes use `dc-` prefix
- [ ] Theme variables used instead of hard-coded colors
- [ ] localStorage data validated with type guards
- [ ] New types added to `src/features/squad/types.ts`
- [ ] Event listeners cleaned up in useEffect returns
- [ ] Accessibility attributes present (aria-label, aria-expanded, etc.)

---

## Testing Approach

### Current State

This project **does not currently have automated tests**. Testing is performed manually in the browser.

### Manual Testing Checklist

When making changes, test the following:

**Squad Tab**:
- [ ] Add/edit/delete troopers
- [ ] Status progression (OK → Grazed → Wounded → Bleeding Out → Dead)
- [ ] Grit and ammo tracking (0-3 range)
- [ ] Weapon and armor assignment
- [ ] Special gear management
- [ ] Biography and notes fields

**Mission Tab**:
- [ ] Create new mission
- [ ] Add/edit/delete sectors
- [ ] Sector properties (cover, space, content, weather)
- [ ] Hard target management
- [ ] Mission status transitions

**Engagement Tab**:
- [ ] Position management (offensive/defensive)
- [ ] Intent selection
- [ ] Dice roll mechanics
- [ ] Injury resolution
- [ ] Momentum tracking (-3 to +5)
- [ ] Covering fire system

**General**:
- [ ] Theme switching (default/terminal/crusade)
- [ ] Dice tray animation
- [ ] Log entry creation/editing/reordering
- [ ] Data persistence after page reload
- [ ] Reset functionality

### Browser Testing

Test in at least:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

### Future Testing Considerations

If adding automated tests in the future, consider:
- **Vitest** for unit tests (Vite-native)
- **React Testing Library** for component tests
- **Playwright** or **Cypress** for E2E tests
- **localStorage mocking** for isolation

---

## Common Tasks

### Adding a New Feature

1. **Create feature directory** (if needed):
   ```bash
   mkdir -p src/features/new-feature
   ```

2. **Add types to `types.ts`**:
   ```typescript
   export interface NewFeatureData {
     id: string;
     name: string;
     // ...fields
   }
   ```

3. **Create component**:
   ```typescript
   // src/features/new-feature/NewFeature.tsx
   import * as T from "../squad/types";

   interface NewFeatureProps {
     data: T.NewFeatureData;
     onUpdate: (data: T.NewFeatureData) => void;
   }

   export default function NewFeature(props: NewFeatureProps) {
     // Implementation
   }
   ```

4. **Add to App.tsx**:
   ```typescript
   import NewFeature from "./features/new-feature/NewFeature";

   // In render:
   {activeTab === "new-feature" && (
     <NewFeature data={data} onUpdate={handleUpdate} />
   )}
   ```

5. **Add styles to `danger-close.css`**:
   ```css
   .dc-new-feature {
     /* Styles */
   }
   ```

### Adding a New Type

1. **Open `src/features/squad/types.ts`**
2. **Add type definition**:
   ```typescript
   export interface NewType {
     id: string;
     field1: string;
     field2: number;
   }
   ```
3. **Add validation/normalization** (if needed):
   ```typescript
   export function normalizeNewType(data?: Partial<NewType>): NewType {
     return {
       id: data?.id ?? crypto.randomUUID(),
       field1: data?.field1 ?? "",
       field2: data?.field2 ?? 0,
     };
   }
   ```

### Adding a New Storage Key

1. **Define constant**:
   ```typescript
   export const NEW_STORAGE_KEY = "danger-close-new-data";
   ```

2. **Add getter/setter in `storageKeys.ts`**:
   ```typescript
   export function getStoredNewData(): T.NewType | null {
     try {
       const raw = localStorage.getItem(NEW_STORAGE_KEY);
       return raw ? JSON.parse(raw) : null;
     } catch {
       return null;
     }
   }
   ```

3. **Use in component**:
   ```typescript
   const [data, setData] = useState<T.NewType>(() =>
     getStoredNewData() ?? getDefaultNewData()
   );

   useEffect(() => {
     localStorage.setItem(NEW_STORAGE_KEY, JSON.stringify(data));
   }, [data]);
   ```

### Adding a New Theme

1. **Define theme type** in App.tsx:
   ```typescript
   type Theme = "default" | "terminal" | "crusade" | "new-theme";
   ```

2. **Add CSS variables** in `danger-close.css`:
   ```css
   :root.theme-new-theme {
     --bg: #newcolor;
     --text: #newcolor;
     /* ...all variables */
   }
   ```

3. **Update theme toggle** in App.tsx:
   ```typescript
   root.classList.remove("theme-terminal", "theme-crusade", "theme-new-theme");
   if (theme === "new-theme") root.classList.add("theme-new-theme");
   ```

### Modifying Game Mechanics

1. **Update types** in `src/features/squad/types.ts`
2. **Modify logic** in `src/features/engagement/EngagementTab.tsx`
3. **Update utility functions** if mechanics have reusable logic
4. **Update rules** in `public/rules-reference.md`
5. **Test thoroughly** - game mechanics are complex!

---

## Troubleshooting

### TypeScript Errors

**"Property does not exist on type"**
- Check that types are imported: `import * as T from "./features/squad/types"`
- Verify the type definition includes the property
- Use optional chaining if property might not exist: `data?.property`

**"Type 'X' is not assignable to type 'Y'"**
- Check for typos in union type values (e.g., `'OK'` vs `'Ok'`)
- Ensure you're using the correct type from `types.ts`
- Use type assertions only as a last resort: `value as T.SomeType`

### localStorage Issues

**Data not persisting**
- Check that useEffect dependency array includes the state variable
- Verify localStorage.setItem is being called
- Check browser console for quota exceeded errors

**Data corrupted/invalid**
- Use type guards and validation functions from `storageKeys.ts`
- Provide default values in normalization functions
- Add migration logic for breaking changes

### Styling Issues

**Styles not applying**
- Verify class name starts with `dc-` prefix
- Check that `danger-close.css` is imported in App.tsx
- Use browser DevTools to check computed styles
- Verify CSS variable is defined in `:root`

**Theme not switching**
- Check that theme class is being applied to `:root`
- Verify CSS selector specificity: `:root.theme-terminal`
- Test in incognito mode (clear localStorage)

### Build Errors

**"Cannot find module"**
- Verify import path is correct (relative from current file)
- Check file extension (`.tsx` for components, `.ts` for utilities)
- Ensure file exists at the specified path

**"Expression produces a union type that is too complex"**
- Simplify type definitions or use type aliases
- Consider breaking large union types into smaller ones
- Check for circular type references

### Runtime Errors

**"Cannot read property of undefined"**
- Use optional chaining: `data?.property`
- Add null checks before accessing properties
- Verify data is initialized with default values

**"localStorage is not defined"**
- Check that code is running in browser (not SSR)
- Wrap localStorage calls in try-catch blocks

---

## Additional Resources

### Key Files to Reference

- **Type Definitions**: `src/features/squad/types.ts`
- **Storage Utilities**: `src/features/squad/storageKeys.ts`
- **Mission Utilities**: `src/features/mission/missionUtils.ts`
- **Momentum Logic**: `src/features/engagement/momentumUtils.ts`
- **Main Styles**: `src/styles/danger-close.css`
- **Game Rules**: `public/rules-reference.md`

### External Documentation

- [React 19 Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vite.dev/guide/)
- [MDN Web Docs](https://developer.mozilla.org/)

### Project-Specific Notes

- **No backend**: This is a fully client-side application
- **No database**: All data is in localStorage
- **No authentication**: Single-user application
- **No network requests**: Except initial load of assets

---

## Changelog

### Version 1.0.0 (2026-01-14)
- Initial CLAUDE.md creation
- Documented all major patterns and conventions
- Added comprehensive architecture overview
- Included troubleshooting section

---

**End of CLAUDE.md**

For questions or clarifications, refer to the codebase itself or consult the README.md for project overview.
