"use client";

import { useEffect, useRef, useState } from "react";

interface StatDisplayProps {
  label: string;
  value: string;
  subLabel?: string;
  valueClassName?: string;
}

export function StatDisplay({
  label,
  value,
  subLabel,
  valueClassName = "text-t1",
}: StatDisplayProps) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 400);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="bg-s2 border border-border rounded-[10px] p-3 md:p-4 flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-t3 leading-tight">
        {label}
      </span>
      <span
        className={`text-[18px] md:text-[20px] lg:text-[22px] font-semibold font-mono tracking-[-0.04em] transition-all duration-300 truncate ${valueClassName} ${
          flash ? "bg-[var(--color-blue-dim)] rounded-[4px] px-1 -mx-1" : ""
        }`}
      >
        {value}
      </span>
      {subLabel && <span className="text-[11px] text-t2">{subLabel}</span>}
    </div>
  );
}
