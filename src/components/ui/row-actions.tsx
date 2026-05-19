"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Pencil, Trash2, MoreVertical } from "lucide-react";

type Props = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function RowActions({ onView, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-light transition-colors hover:bg-beige hover:text-ink"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 min-w-[160px] overflow-hidden rounded-md border border-line bg-card shadow-pop">
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
      )}
    </div>
  );
}
