"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export { parseJenisBakiList } from "@/lib/jenis-baki";

const MENU_GAP = 4;
const triggerClass =
  "flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-sm border border-line bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20";

type Props = {
  /** Hidden input name, nilai terisi sebagai string dipisah ", " untuk FormData. */
  name?: string;
  options: string[];
  /** Controlled value. */
  value?: string[];
  /** Uncontrolled initial value. */
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
};

export function MultiSelect({
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "— Pilih —",
  emptyText = "Belum ada pilihan. Tambahkan di Settings.",
  disabled,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const selected = isControlled ? controlledValue! : internal;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const setValue = (next: string[]) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const toggle = (opt: string) => {
    if (selected.includes(opt)) setValue(selected.filter((s) => s !== opt));
    else setValue([...selected, opt]);
  };

  const reposition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + MENU_GAP, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScrollResize = () => reposition();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open]);

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
        role="listbox"
        aria-multiselectable
      >
        {options.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-ink-light">
            {emptyText}
          </div>
        ) : (
          <ul className="py-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(opt);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-beige"
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-gold-dark" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    ) : null;

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(
          triggerClass,
          "cursor-pointer pr-9",
          disabled && "cursor-not-allowed bg-cream/40"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-ink-light">{placeholder}</span>
        ) : (
          selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-sm bg-beige px-2 py-0.5 text-xs font-medium text-ink"
            >
              {s}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(s);
                  }}
                  className="text-ink-light hover:text-danger"
                  aria-label={`Hapus ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        )}
      </div>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-light transition-transform",
          open && "rotate-180"
        )}
      />
      {name && <input type="hidden" name={name} value={selected.join(", ")} />}
      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}
