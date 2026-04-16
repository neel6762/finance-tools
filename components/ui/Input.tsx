import { type InputHTMLAttributes, type KeyboardEvent, type ChangeEvent, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  prefix?: string;
  suffix?: string;
  error?: string;
}

export function Input({
  label,
  prefix,
  suffix,
  error,
  className = "",
  id,
  onKeyDown,
  type,
  onChange,
  ...props
}: InputProps) {
  const isNumeric = type === "number";

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Cmd+Backspace / Cmd+Delete: clear the input
    if (e.metaKey && e.key === "Backspace") {
      e.preventDefault();
      const input = e.currentTarget;
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeValueSetter) {
        nativeValueSetter.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    onKeyDown?.(e);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (isNumeric) {
      const val = e.target.value;
      if (val === "" || val === "-" || val === "." || val === "-." || /^-?\d*\.?\d*$/.test(val)) {
        onChange?.(e);
      }
      return;
    }
    onChange?.(e);
  }

  const inputId =
    id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[12px] font-medium text-t2"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[13px] text-t3 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type={isNumeric ? "text" : type}
          inputMode={isNumeric ? "decimal" : undefined}
          autoComplete={isNumeric ? "off" : undefined}
          className={`w-full px-3 py-2.5 md:py-[7px] rounded-[7px] text-base md:text-[13px] font-sans bg-surface border border-border text-t1 placeholder:text-[var(--color-text-placeholder)] outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)] ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-8" : ""} ${
            error ? "border-[var(--color-red)] focus:border-[var(--color-red)] focus:shadow-[0_0_0_3px_var(--color-red-dim)]" : ""
          } ${className}`}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-[13px] text-t3 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span className="text-[11px] text-[var(--color-red)]">{error}</span>
      )}
    </div>
  );
}
