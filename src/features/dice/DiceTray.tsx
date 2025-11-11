import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

const MIN_DICE = 1;
const MAX_DICE = 20;
const ROLL_INTERVAL_MS = 120;
const ROLL_DURATION_MS = 900;

interface DiceTrayProps {
  onClose: () => void;
}

function generateDiceValues(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export default function DiceTray({ onClose }: DiceTrayProps) {
  const [diceCount, setDiceCount] = useState(6);
  const [results, setResults] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const rollIntervalRef = useRef<number | null>(null);
  const finalizeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
      }
      if (finalizeTimeoutRef.current) {
        window.clearTimeout(finalizeTimeoutRef.current);
      }
    };
  }, []);

  const highest = useMemo(() => {
    if (results.length === 0) {
      return null;
    }
    return Math.max(...results);
  }, [results]);

  const lowest = useMemo(() => {
    if (results.length === 0) {
      return null;
    }
    return Math.min(...results);
  }, [results]);

  const handleDiceCountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(parsed)) {
      setDiceCount(MIN_DICE);
      return;
    }
    const clamped = Math.min(Math.max(parsed, MIN_DICE), MAX_DICE);
    setDiceCount(clamped);
  }, []);

  const clearResults = useCallback(() => {
    if (rollIntervalRef.current) {
      window.clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
    if (finalizeTimeoutRef.current) {
      window.clearTimeout(finalizeTimeoutRef.current);
      finalizeTimeoutRef.current = null;
    }
    setIsRolling(false);
    setResults([]);
  }, []);

  const handleRoll = useCallback(() => {
    if (isRolling) {
      return;
    }

    setIsRolling(true);
    // Kick off lively interim rolls.
    rollIntervalRef.current = window.setInterval(() => {
      setResults(generateDiceValues(diceCount));
    }, ROLL_INTERVAL_MS);

    finalizeTimeoutRef.current = window.setTimeout(() => {
      if (rollIntervalRef.current) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      const finalValues = generateDiceValues(diceCount);
      setResults(finalValues);
      setIsRolling(false);
      finalizeTimeoutRef.current = null;
    }, ROLL_DURATION_MS);
  }, [diceCount, isRolling]);

  return (
    <aside className="dice-tray" id="dice-tray" aria-live="polite">
      <header className="dice-tray__header">
        <h2 className="dice-tray__title">Dice Roller</h2>
        <button
          type="button"
          className="dice-tray__close"
          onClick={onClose}
          aria-label="Close dice roller"
        >
          ×
        </button>
      </header>

      <div className="dice-tray__controls">
        <label className="dice-tray__label" htmlFor="dice-count-input">
          Number of D6
        </label>
        <input
          id="dice-count-input"
          className="dice-tray__input"
          type="number"
          min={MIN_DICE}
          max={MAX_DICE}
          value={diceCount}
          onChange={handleDiceCountChange}
        />
        <div className="dice-tray__buttons">
          <button
            type="button"
            className="dc-btn dc-btn--accent dc-btn--sm"
            onClick={handleRoll}
            disabled={isRolling}
          >
            {isRolling ? "Rolling…" : "Roll D6"}
          </button>
          <button
            type="button"
            className="dc-btn dc-btn--sm"
            onClick={clearResults}
            disabled={!isRolling && results.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="dice-tray__results" aria-live="polite">
        {results.length === 0 ? (
          <p className="dice-tray__empty">No dice rolled yet.</p>
        ) : (
          <div className={`dice-tray__dice-grid ${isRolling ? "dice-tray__dice-grid--rolling" : ""}`}>
            {results.map((value, index) => (
              <div
                key={`${value}-${index}-${isRolling ? "rolling" : "static"}`}
                className={`dice-tray__die ${value === highest ? "dice-tray__die--high" : ""} ${
                  value === lowest ? "dice-tray__die--low" : ""
                } ${isRolling ? "dice-tray__die--rolling" : ""}`.trim()}
                aria-label={`Die ${index + 1}: ${value}`}
              >
                {value}
              </div>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <dl className="dice-tray__summary">
          <div className="dice-tray__summary-item">
            <dt>Highest</dt>
            <dd>{highest}</dd>
          </div>
          <div className="dice-tray__summary-item">
            <dt>Lowest</dt>
            <dd>{lowest}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
