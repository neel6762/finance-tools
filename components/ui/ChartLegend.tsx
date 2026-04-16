interface LegendItem {
  color: string;
  label: string;
  type?: "dot" | "square" | "dashed-line";
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={`flex items-center gap-4 ${className ?? ""}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.type === "square" ? (
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          ) : item.type === "dashed-line" ? (
            <div
              className="w-4 h-[0px] border-t-2 border-dashed"
              style={{ borderColor: item.color }}
            />
          ) : (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-[11px] text-t3">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
