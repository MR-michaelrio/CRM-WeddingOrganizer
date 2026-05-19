"use client";

import { forwardRef } from "react";
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

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select(props, ref) {
  return (
    <select
      ref={ref}
      {...props}
      className={cn(inputClass, "cursor-pointer pr-8", props.className)}
    />
  );
});
