"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Pencil, Trash2, MoreVertical, type LucideIcon } from "lucide-react";

export type RowActionExtra = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
};

type Props = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Item tambahan, ditempatkan di antara Edit dan Delete. */
  extras?: RowActionExtra[];
};

const MENU_WIDTH = 168;
const MENU_GAP = 4;

export function RowActions({ onView, onEdit, onDelete, extras }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Recompute the menu position from the button's bounding rect. Called
  // on open and whenever layout shifts while open.
  const reposition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    // Right-align menu to button. Clamp inside viewport.
    let left = r.right - MENU_WIDTH;
    if (left < 8) left = 8;
    if (left + MENU_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - MENU_WIDTH - 8;
    }
    let top = r.bottom + MENU_GAP;
    // If not enough room below, flip above the button.
    const estHeight = 132;
    if (top + estHeight > window.innerHeight - 8 && r.top - MENU_GAP - estHeight > 8) {
      top = r.top - MENU_GAP - estHeight;
    }
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("keydown", onKey);
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
          width: MENU_WIDTH,
          zIndex: 1000,
        }}
        className="overflow-hidden rounded-md border border-line bg-card shadow-pop"
      >
        {onView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-beige"
          >
            <Eye className="h-4 w-4" /> View details
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-beige"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
        {extras?.map((ex, i) => {
          const Icon = ex.icon;
          const danger = ex.tone === "danger";
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                ex.onClick();
              }}
              className={
                danger
                  ? "flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                  : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-beige"
              }
            >
              <Icon className="h-4 w-4" /> {ex.label}
            </button>
          );
        })}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-light transition-colors hover:bg-beige hover:text-ink"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {mounted ? createPortal(menu, document.body) : null}
    </>
  );
}
