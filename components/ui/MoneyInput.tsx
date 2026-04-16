import { type InputHTMLAttributes, type KeyboardEvent, type ReactNode, useState, useCallback, useEffect } from "react";

type NumberLocale = "en-US" | "en-CA" | "en-IN";

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  label?: ReactNode;
  prefix?: string;
  suffix?: string;
  error?: string;
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  locale?: NumberLocale;
}

function formatWithCommas(value: string | number, locale: NumberLocale = "en-US"): string {
  const strValue = String(value);
  if (!strValue || strValue === "" || strValue === "-" || strValue === ".") return strValue;
  
  const num = parseFloat(strValue.replace(/,/g, ""));
  if (isNaN(num)) return strValue;
  
  const isNegative = num < 0;
  const absValue = Math.abs(num);
  const formatted = absValue.toLocaleString(locale, {
    maximumFractionDigits: 0,
  });
  
  return isNegative ? `-${formatted}` : formatted;
}

function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

export function MoneyInput({
  label,
  prefix,
  suffix,
  error,
  className = "",
  id,
  value,
  onChange,
  locale = "en-US",
  onKeyDown,
  ...props
}: MoneyInputProps) {
  const inputId =
    id || (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const stringValue = String(value);
  const [displayValue, setDisplayValue] = useState(() => formatWithCommas(stringValue, locale));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(stringValue, locale));
    }
  }, [stringValue, isFocused, locale]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDisplayValue(stringValue);
  }, [stringValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setDisplayValue(formatWithCommas(stringValue, locale));
  }, [stringValue, locale]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Cmd+Backspace / Cmd+Delete: clear the input
      if (e.metaKey && e.key === "Backspace") {
        e.preventDefault();
        setDisplayValue("");
        onChange({ target: { value: "" } });
      }
      onKeyDown?.(e);
    },
    [onChange, onKeyDown]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = stripCommas(e.target.value);
      if (rawValue === "" || rawValue === "-" || /^-?\d*\.?\d*$/.test(rawValue)) {
        setDisplayValue(e.target.value);
        onChange({ target: { value: rawValue } });
      }
    },
    [onChange]
  );

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
          type="text"
          inputMode="numeric"
          className={`w-full px-3 py-2.5 md:py-[7px] rounded-[7px] text-base md:text-[13px] font-sans bg-surface border border-border text-t1 placeholder:text-[var(--color-text-placeholder)] outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)] ${
            prefix ? "pl-7" : ""
          } ${suffix ? "pr-8" : ""} ${
            error ? "border-[var(--color-red)] focus:border-[var(--color-red)] focus:shadow-[0_0_0_3px_var(--color-red-dim)]" : ""
          } ${className}`}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
