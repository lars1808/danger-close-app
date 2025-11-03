import React, { useState } from "react";
import * as T from "../squad/types";

interface LogTabProps {
  entries: T.LogEntry[];
  onUpdateEntries: (entries: T.LogEntry[]) => void;
}

export default function LogTab(props: LogTabProps) {
  const { entries, onUpdateEntries } = props;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryText, setNewEntryText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Helper: Format current time as HH:MM:SS
  function getCurrentTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // Add a new log entry via modal
  function handleAddEntryFromModal() {
    if (!newEntryText.trim()) return;
    
    const newEntry: T.LogEntry = {
      id: Date.now().toString(),
      timestamp: getCurrentTimestamp(),
      source: "USER",
      text: newEntryText,
      order: entries.length,
    };
    onUpdateEntries([...entries, newEntry]);
    setNewEntryText("");
    setShowAddModal(false);
  }

  // Delete a log entry
  function deleteLogEntry(id: string) {
    onUpdateEntries(entries.filter((entry) => entry.id !== id));
  }

  // Start editing an entry
  function startEditing(id: string, currentText: string) {
    setEditingId(id);
    setEditingText(currentText);
  }

  // Save edited entry
  function saveEdit(id: string) {
    if (!editingText.trim()) {
      setEditingId(null);
      return;
    }
    onUpdateEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, text: editingText } : entry
      )
    );
    setEditingId(null);
    setEditingText("");
  }

  // Cancel editing
  function cancelEdit() {
    setEditingId(null);
    setEditingText("");
  }

  // Copy all log text to clipboard
  function copyLogToClipboard() {
    const logText = entries
      .map((e) => `${e.timestamp} [${e.source}] ${e.text}`)
      .join("\n");
    
    navigator.clipboard.writeText(logText).then(() => {
      alert("Log copied to clipboard!");
    });
  }

  // Download log as .txt file
  function downloadLogAsText() {
    const logText = entries
      .map((e) => `${e.timestamp} [${e.source}] ${e.text}`)
      .join("\n");
    
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(logText));
    element.setAttribute("download", "mission-log.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Drag and drop handlers
  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  function handleDrop(e: React.DragEvent, dropTargetId: string) {
    e.preventDefault();
    
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    // Find indices
    const draggedIndex = entries.findIndex((e) => e.id === draggedId);
    const dropIndex = entries.findIndex((e) => e.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    // Create new array with reordered entries
    const newEntries = [...entries];
    const [removed] = newEntries.splice(draggedIndex, 1);
    newEntries.splice(dropIndex, 0, removed);

    // Update order values
    const reorderedEntries = newEntries.map((entry, idx) => ({
      ...entry,
      order: idx,
    }));

    onUpdateEntries(reorderedEntries);
    setDraggedId(null);
    setDragOverId(null);
  }

  return (
    <div>
      <h2>Mission Log</h2>

      {/* TOOLBAR */}
      <div className="dc-toolbar">
        <button className="dc-btn dc-btn--accent" onClick={() => setShowAddModal(true)}>
          + Add Log Entry
        </button>
        <button className="dc-btn" onClick={copyLogToClipboard} disabled={entries.length === 0}>
          Copy Log
        </button>
        <button className="dc-btn" onClick={downloadLogAsText} disabled={entries.length === 0}>
          Download .TXT
        </button>
      </div>

      {/* LOG ENTRIES DISPLAY */}
      <div className="dc-log-feed">
        {entries.length === 0 ? (
          <p className="dc-log-empty">No log entries yet.</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`dc-log-entry ${draggedId === entry.id ? "dc-log-entry--dragging" : ""} ${
                dragOverId === entry.id ? "dc-log-entry--drag-over" : ""
              }`}
              draggable={editingId !== entry.id}
              onDragStart={() => handleDragStart(entry.id)}
              onDragOver={(e) => handleDragOver(e, entry.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, entry.id)}
            >
              {/* DRAG HANDLE */}
              <div className="dc-log-drag-handle" title="Drag to reorder">
                ≡
              </div>

              <div className="dc-log-header">
                <span className="dc-log-timestamp">{entry.timestamp}</span>
                <span className={`dc-log-source dc-log-source--${entry.source.toLowerCase()}`}>
                  [{entry.source}]
                </span>
              </div>

              {/* EDITABLE TEXT */}
              {editingId === entry.id ? (
                <div className="dc-log-edit-mode">
                  <textarea
                    className="dc-log-edit-textarea"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    autoFocus
                  />
                  <div className="dc-log-edit-buttons">
                    <button
                      className="dc-btn dc-btn--sm dc-btn--accent"
                      onClick={() => saveEdit(entry.id)}
                    >
                      Save
                    </button>
                    <button
                      className="dc-btn dc-btn--sm"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="dc-log-text"
                  onClick={() => startEditing(entry.id, entry.text)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      startEditing(entry.id, entry.text);
                    }
                  }}
                >
                  {entry.text}
                </div>
              )}

              {/* DELETE BUTTON */}
              <button
                className="dc-log-delete"
                onClick={() => deleteLogEntry(entry.id)}
                aria-label="Delete entry"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* ADD ENTRY MODAL */}
      {showAddModal && (
        <div className="dc-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="dc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Log Entry</h3>
            <textarea
              className="dc-modal-textarea"
              placeholder="Type your log entry here..."
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              autoFocus
            />
            <div className="dc-modal-buttons">
              <button
                className="dc-btn dc-btn--accent"
                onClick={handleAddEntryFromModal}
                disabled={!newEntryText.trim()}
              >
                Save Entry
              </button>
              <button className="dc-btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}