import { useEffect } from "react";

// Registers global key handlers while the owning component is mounted.
// `handlers` maps a key name (e.g. "F2", "Escape", "ctrl+Enter") to a
// callback. Ignores keystrokes typed into text inputs/textareas unless the
// binding is explicitly marked `allowInInput`.
export default function useKeyboardShortcuts(handlers, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(e) {
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName) || e.target?.isContentEditable;

      const key = e.ctrlKey && e.key !== "Control" ? `ctrl+${e.key}` : e.key;
      const binding = handlers[key];
      if (!binding) return;

      const handler = typeof binding === "function" ? binding : binding.handler;
      const allowInInput = typeof binding === "object" && binding.allowInInput;
      if (isTyping && !allowInInput) return;

      e.preventDefault();
      handler(e);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, enabled]);
}

// Detects barcode-scanner input on a text field: scanners type digits/chars
// far faster than a human (usually < 30ms between keystrokes) and terminate
// with Enter. Attach to the search input's onKeyDown; calls onScan(buffer)
// once a fast burst ending in Enter is detected, otherwise lets normal
// typing through untouched.
export function createScanDetector(onScan, { maxGapMs = 40 } = {}) {
  let buffer = "";
  let lastTime = 0;

  return function handleKeyDown(e) {
    const now = Date.now();
    const gap = now - lastTime;
    lastTime = now;

    if (e.key === "Enter") {
      if (buffer.length >= 4) {
        onScan(buffer);
        buffer = "";
        e.preventDefault();
      }
      return;
    }

    if (e.key.length === 1) {
      buffer = gap > maxGapMs ? e.key : buffer + e.key;
    }
  };
}
