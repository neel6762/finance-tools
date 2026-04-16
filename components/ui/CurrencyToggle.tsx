import { Currency } from "@/lib/finance/format";

interface CurrencyToggleProps {
  value: Currency;
  onChange: (val: Currency) => void;
}

export function CurrencyToggle({ value, onChange }: CurrencyToggleProps) {
  return (
    <div className="inline-flex items-center bg-surface border border-border rounded-[6px] p-0.5">
      <button
        onClick={() => onChange("CAD")}
        className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-all duration-[120ms] ${
          value === "CAD"
            ? "bg-[var(--color-blue)] text-white"
            : "text-t2 hover:text-t1"
        }`}
      >
        CAD $
      </button>
      <button
        onClick={() => onChange("INR")}
        className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-all duration-[120ms] ${
          value === "INR"
            ? "bg-[var(--color-blue)] text-white"
            : "text-t2 hover:text-t1"
        }`}
      >
        INR &#8377;
      </button>
    </div>
  );
}
