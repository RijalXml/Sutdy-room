import { forwardRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/* ---------------------------------- Button ---------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan text-navy-950 hover:bg-cyan/90 focus-visible:outline-cyan disabled:bg-cyan/40 font-semibold",
  secondary:
    "bg-navy-800 text-ink border border-border hover:border-cyan/50 hover:text-cyan disabled:opacity-50",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-navy-900 disabled:opacity-50",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading = false, disabled, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed ${buttonVariantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

/* ----------------------------------- Card ----------------------------------- */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-navy-900 p-5 ${className}`}>{children}</div>
  );
}

/* ----------------------------------- Badge ----------------------------------- */

type BadgeTone = "neutral" | "cyan" | "success" | "warning" | "danger";

const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-navy-800 text-muted border-border",
  cyan: "bg-cyan/10 text-cyan border-cyan/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/30",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------- Form fields -------------------------------- */

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const fieldBaseClass =
  "w-full rounded-lg border bg-navy-950 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:opacity-50";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => (
    <FieldShell label={label} htmlFor={id ?? props.name ?? label} error={error} hint={hint}>
      <input
        ref={ref}
        id={id ?? props.name ?? label}
        aria-invalid={Boolean(error)}
        className={`${fieldBaseClass} ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    </FieldShell>
  )
);
TextField.displayName = "TextField";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, hint, id, className = "", rows = 5, ...props }, ref) => (
    <FieldShell label={label} htmlFor={id ?? props.name ?? label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={id ?? props.name ?? label}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`${fieldBaseClass} resize-y ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    </FieldShell>
  )
);
TextAreaField.displayName = "TextAreaField";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, id, className = "", children, ...props }, ref) => (
    <FieldShell label={label} htmlFor={id ?? props.name ?? label} error={error} hint={hint}>
      <select
        ref={ref}
        id={id ?? props.name ?? label}
        aria-invalid={Boolean(error)}
        className={`${fieldBaseClass} ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
);
SelectField.displayName = "SelectField";
