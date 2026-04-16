const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const cadFormatterDecimals = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number, decimals = false): string {
  return decimals
    ? cadFormatterDecimals.format(value)
    : cadFormatter.format(value);
}

export function formatCAD(value: number, decimals = false): string {
  return formatCurrency(value, decimals);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `C$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `C$${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function formatCompactCAD(value: number): string {
  return formatCompact(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inrFormatter.format(value);
}

export function formatCompactINR(value: number): string {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  return formatINR(value);
}

export type Currency = "CAD" | "INR";

export function getYAxisTickFormatter(currency: Currency): (v: number) => string {
  return (v: number) => {
    if (currency === "INR") {
      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
      if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
      return `₹${v}`;
    }
    if (v >= 1_000_000) return `C$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `C$${(v / 1_000).toFixed(0)}K`;
    return `C$${v}`;
  };
}
