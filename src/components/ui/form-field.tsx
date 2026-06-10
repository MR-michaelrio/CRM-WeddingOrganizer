"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Children,
  isValidElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-ink-light">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-light">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-sm border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-light focus:border-gold focus:ring-2 focus:ring-gold/20";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} {...props} className={cn(inputClass, props.className)} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      rows={3}
      {...props}
      className={cn(inputClass, "resize-y", props.className)}
    />
  );
});

// ----------------------------------------------------------------------------
// Custom Select — drop-in pengganti <select>.
//
// Tetap pakai API yang sama: terima children <option value="...">label</option>.
// Native <select> ikut dirender (hidden) untuk dukung form submission via
// FormData & browser validation (required). UI dropdown custom via portal.
// ----------------------------------------------------------------------------

type ParsedOption = {
  value: string;
  label: string;
  disabled: boolean;
  // Marker untuk option placeholder seperti <option value="" disabled>—pilih—</option>
  isPlaceholder: boolean;
};

function parseOptions(children: ReactNode): ParsedOption[] {
  const opts: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const props = child.props as {
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      };
      const rawLabel = childrenToString(props.children);
      const value =
        props.value !== undefined ? String(props.value) : rawLabel;
      const isPlaceholder = !!props.disabled && value === "";
      opts.push({
        value,
        label: rawLabel || value,
        disabled: !!props.disabled,
        isPlaceholder,
      });
    } else if (child.type === "optgroup") {
      const groupProps = child.props as { children?: ReactNode };
      opts.push(...parseOptions(groupProps.children));
    }
  });
  return opts;
}

function childrenToString(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(childrenToString).join("");
  }
  if (isValidElement(children)) {
    const c = children.props as { children?: ReactNode };
    return childrenToString(c.children);
  }
  return "";
}

const MENU_GAP = 4;

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select(props, ref) {
  const {
    value: controlledValue,
    defaultValue,
    onChange,
    children,
    className,
    disabled,
    required,
    name,
    ...rest
  } = props;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    String(controlledValue ?? defaultValue ?? "")
  );
  const value = isControlled ? String(controlledValue) : internalValue;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => setMounted(true), []);

  const options = useMemo(() => parseOptions(children), [children]);
  const current = options.find((o) => o.value === value);

  const setRef = (node: HTMLSelectElement | null) => {
    selectRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<HTMLSelectElement | null>).current = node;
  };

  const reposition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + MENU_GAP, left: r.left, width: r.width });
  };

  useLayoutEffect(() => {
    if (open) {
      reposition();
      const idx = options.findIndex((o) => o.value === value && !o.isPlaceholder);
      setHighlight(idx >= 0 ? idx : 0);
    }
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

  const commit = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue);
    // Fire synthetic onChange. Most consumers hanya pakai e.target.value /
    // e.target.name jadi cukup synthesis minimal.
    if (onChange) {
      const evt = {
        target: { value: newValue, name: name ?? "" },
        currentTarget: { value: newValue, name: name ?? "" },
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(evt);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h;
        do {
          next = (next + 1) % options.length;
        } while (options[next]?.disabled && next !== h);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => {
        let next = h;
        do {
          next = (next - 1 + options.length) % options.length;
        } while (options[next]?.disabled && next !== h);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[highlight];
      if (o && !o.disabled) {
        commit(o.value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const triggerLabel = current && !current.isPlaceholder ? current.label : "";
  const placeholder = options.find((o) => o.isPlaceholder)?.label ?? "— Pilih —";

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
      >
        <ul className="py-1">
          {options.map((o, idx) => {
            if (o.isPlaceholder) return null;
            const isActive = idx === highlight;
            const isSelected = o.value === value;
            return (
              <li key={o.value + idx}>
                <button
                  type="button"
                  disabled={o.disabled}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (o.disabled) return;
                    commit(o.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors",
                    isActive ? "bg-beige" : "bg-transparent",
                    o.disabled
                      ? "cursor-not-allowed text-ink-light opacity-60"
                      : "text-ink hover:bg-beige"
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-gold-dark" />}
                </button>
              </li>
            );
          })}
          {options.filter((o) => !o.isPlaceholder).length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-ink-light">
              Tidak ada opsi
            </li>
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKey}
        disabled={disabled}
        className={cn(
          inputClass,
          "flex cursor-pointer items-center justify-between gap-2 pr-9 text-left",
          disabled && "cursor-not-allowed bg-cream/40",
          !triggerLabel && "text-ink-light"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{triggerLabel || placeholder}</span>
      </button>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light transition-transform",
          open && "rotate-180"
        )}
      />
      {/* Native <select> hidden: untuk FormData & required validation. */}
      <select
        {...rest}
        ref={setRef}
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={() => {
          /* native onChange not fired; programmatic value update via state. */
        }}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 h-full w-full opacity-0"
        style={{ pointerEvents: "none" }}
      >
        {children}
      </select>
      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
});
