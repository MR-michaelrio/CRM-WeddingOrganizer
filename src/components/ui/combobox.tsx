"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type ComboboxOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  allowFreeText?: boolean;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
};

const MENU_GAP = 4;

export const Combobox = forwardRef<HTMLInputElement, Props>(function Combobox(
  {
    value,
    onChange,
    options,
    placeholder,
    emptyText = "Tidak ada hasil. Ketik manual untuk menambah.",
    allowFreeText = true,
    required,
    disabled,
    autoComplete = "off",
    className,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q)
    );
  }, [value, options]);

  const reposition = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = r.bottom + MENU_GAP;
    setPos({ top, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (open) {
      reposition();
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScrollResize = () => {
      reposition();
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

  const setRef = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (filtered[highlight]) {
        e.preventDefault();
        onChange(filtered[highlight].value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const menu =
    open && pos && mounted ? (
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 1000,
        }}
        className="max-h-72 overflow-auto rounded-md border border-line bg-card shadow-pop"
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-ink-light">
            {emptyText}
          </div>
        ) : (
          <ul className="py-1">
            {filtered.map((o, idx) => {
              const isActive = idx === highlight;
              const isSelected = o.value === value;
              return (
                <li key={o.value + idx}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mouseDown supaya tidak hilang focus dulu.
                      e.preventDefault();
                      onChange(o.value);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-beige" : "bg-transparent"
                    } hover:bg-beige`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{o.label}</span>
                      {o.description && (
                        <span className="block text-[11px] text-ink-light">
                          {o.description}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-gold-dark" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {allowFreeText && value.trim() !== "" &&
          !filtered.some((o) => o.label.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="border-t border-line bg-cream/40 px-3 py-2 text-[11px] text-ink-light">
              Pakai &ldquo;
              <span className="font-semibold text-ink">{value.trim()}</span>
              &rdquo; sebagai entri baru
            </div>
          )}
      </div>
    ) : null;

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light" />
      <input
        ref={setRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full rounded-sm border border-line bg-card py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-light focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:bg-cream/40"
      />
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          inputRef.current?.focus();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-light hover:text-ink"
        tabIndex={-1}
        aria-label="Toggle dropdown"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
});
