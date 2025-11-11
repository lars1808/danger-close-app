import { useEffect, useState, useCallback } from "react";
import type { MouseEvent } from "react";

type RulesReferencePanelProps = {
  onClose: () => void;
};

type MarkdownList = {
  type: "ul" | "ol";
  items: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function convertInlineMarkdown(text: string) {
  let result = escapeHtml(text);

  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

  return result;
}

function simpleMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let currentList: MarkdownList | null = null;
  let inCodeBlock = false;
  const codeLines: string[] = [];
  const paragraphLines: string[] = [];

  const flushList = () => {
    if (!currentList) {
      return;
    }
    const itemsHtml = currentList.items
      .map((item) => `<li>${convertInlineMarkdown(item)}</li>`)
      .join("");
    html.push(`<${currentList.type}>${itemsHtml}</${currentList.type}>`);
    currentList = null;
  };

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    const paragraphText = paragraphLines.join(" ");
    html.push(`<p>${convertInlineMarkdown(paragraphText)}</p>`);
    paragraphLines.length = 0;
  };

  const flushCodeBlock = () => {
    if (!codeLines.length) {
      return;
    }
    const codeHtml = escapeHtml(codeLines.join("\n"));
    html.push(`<pre><code>${codeHtml}</code></pre>`);
    codeLines.length = 0;
  };

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const headingText = convertInlineMarkdown(headingMatch[2]);
      html.push(`<h${level}>${headingText}</h${level}>`);
      return;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(unorderedMatch[1]);
      return;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }

    paragraphLines.push(trimmed);
  });

  if (inCodeBlock) {
    flushCodeBlock();
  }
  flushParagraph();
  flushList();

  return html.join("\n");
}

export default function RulesReferencePanel({ onClose }: RulesReferencePanelProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    fetch("/rules-reference.md")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load rules reference");
        }
        return response.text();
      })
      .then((text) => {
        if (!isActive) {
          return;
        }
        setContent(text);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        setError("Unable to load the rules reference. Please try again later.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const renderedContent = error
    ? `<p class="rules-panel__error">${escapeHtml(error)}</p>`
    : simpleMarkdownToHtml(content || "");

  return (
    <div
      className="rules-overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <section
        className="rules-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-reference-title"
        id="rules-reference-panel"
      >
        <header className="rules-panel__header">
          <h2 id="rules-reference-title">Rules Reference</h2>
          <button
            type="button"
            className="rules-panel__close"
            onClick={onClose}
            aria-label="Close rules reference"
          >
            ×
          </button>
        </header>
        <div className="rules-panel__content" aria-live="polite">
          {isLoading ? (
            <p className="rules-panel__loading">Loading…</p>
          ) : (
            <div
              className="rules-panel__markdown"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
