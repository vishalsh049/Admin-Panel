import { useState, useId } from "react";

// Minimal hover/focus tooltip — no portal needed since callers position it
// within normal-overflow containers (cards, form fields). Keyboard-accessible
// via focus/blur so it isn't mouse-only.
export default function Tooltip({ text, children, side = "top" }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const sideCls =
    side === "bottom"
      ? "top-full mt-2 left-1/2 -translate-x-1/2"
      : side === "left"
      ? "right-full mr-2 top-1/2 -translate-y-1/2"
      : side === "right"
      ? "left-full ml-2 top-1/2 -translate-y-1/2"
      : "bottom-full mb-2 left-1/2 -translate-x-1/2";

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} tabIndex={0} className="inline-flex cursor-help">
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`pointer-events-none absolute z-50 w-max max-w-[220px] rounded-lg bg-stone-900 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg ${sideCls}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
