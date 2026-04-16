"use client";

import { useMemo, useEffect, useCallback, useState } from "react";
import {
  ComposedChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { RotateCcw } from "lucide-react";

import { ToolShell } from "@/components/shell/ToolShell";
import { ToolToolbar } from "@/components/shell/ToolToolbar";
import { ToolStatusBar } from "@/components/shell/ToolStatusBar";
import { ToolCard } from "@/components/ui/ToolCard";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { StatDisplay } from "@/components/ui/StatDisplay";
import { Button } from "@/components/ui/Button";
import { RechartsViewport } from "@/components/ui/RechartsViewport";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  calculateMortgage,
  getFrequencyLabel,
  getPaymentsPerYear,
  type MortgageInputs,
  type PaymentFrequency,
} from "@/lib/finance/mortgage";
import { formatCAD, formatCompactCAD, getYAxisTickFormatter } from "@/lib/finance/format";
import { ChartTooltipShell } from "@/components/ui/ChartTooltipShell";
import { ChartLegend } from "@/components/ui/ChartLegend";

type PageInputs = MortgageInputs;

const DEFAULTS: PageInputs = {
  homePrice: 800000,
  downPaymentPercent: 20,
  interestRate: 4.79,
  amortizationYears: 25,
  paymentFrequency: "monthly",
};

const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "semi-monthly", label: "Semi-Monthly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "weekly", label: "Weekly" },
  { value: "accelerated-bi-weekly", label: "Accelerated Bi-Weekly" },
  { value: "accelerated-weekly", label: "Accelerated Weekly" },
];

const AMORTIZATION_OPTIONS = [15, 20, 25, 30];

function toNumber(value: string, fallback: number): number {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

export default function MortgageSimulatorPage() {
  const [inputs, setInputs] = useLocalStorage<PageInputs>(
    "helm:mortgage-simulator:v2",
    DEFAULTS
  );

  const [summarized, setSummarized] = useState(true);

  const updateField = useCallback(
    (field: keyof PageInputs, value: string | PaymentFrequency | number) => {
      setInputs((prev) => ({
        ...prev,
        [field]: typeof value === "string" && field !== "paymentFrequency"
          ? toNumber(value, DEFAULTS[field] as number)
          : value,
      }));
    },
    [setInputs]
  );

  const resetDefaults = useCallback(() => {
    setInputs(DEFAULTS);
  }, [setInputs]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        resetDefaults();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetDefaults]);

  const result = useMemo(() => calculateMortgage(inputs), [inputs]);

  const paymentsPerYear = getPaymentsPerYear(inputs.paymentFrequency);

  // Principal vs Interest yearly breakdown for stacked bar chart
  const yearlyBreakdownData = useMemo(() => {
    if (result.schedule.length === 0) return [];
    
    const data: { year: number; principal: number; interest: number }[] = [];

    let prevCumulativePrincipal = 0;
    let prevCumulativeInterest = 0;

    for (let yearNum = 1; yearNum <= Math.ceil(result.schedule.length / paymentsPerYear); yearNum++) {
      const yearEndIdx = Math.min(yearNum * paymentsPerYear - 1, result.schedule.length - 1);
      const row = result.schedule[yearEndIdx];
      if (!row) continue;

      const yearlyPrincipal = row.cumulativePrincipal - prevCumulativePrincipal;
      const yearlyInterest = row.cumulativeInterest - prevCumulativeInterest;

      data.push({
        year: yearNum,
        principal: Math.round(yearlyPrincipal),
        interest: Math.round(yearlyInterest),
      });

      prevCumulativePrincipal = row.cumulativePrincipal;
      prevCumulativeInterest = row.cumulativeInterest;
    }

    return data;
  }, [result, paymentsPerYear]);

  // Donut chart data for total interest vs principal
  const totalCostData = useMemo(() => {
    return [
      { name: "Principal", value: Math.round(result.principal), color: "var(--color-blue)" },
      { name: "Interest", value: Math.round(result.totalInterest), color: "var(--color-orange)" },
    ];
  }, [result]);

  const crossoverYear = useMemo(() => {
    return yearlyBreakdownData.find((d) => d.principal > d.interest)?.year;
  }, [yearlyBreakdownData]);

  const equityData = useMemo(() => {
    if (result.schedule.length === 0) return [];
    const data: { year: number; equity: number; balance: number }[] = [];
    for (let yearNum = 1; yearNum <= Math.ceil(result.schedule.length / paymentsPerYear); yearNum++) {
      const yearEndIdx = Math.min(yearNum * paymentsPerYear - 1, result.schedule.length - 1);
      const row = result.schedule[yearEndIdx];
      if (!row) continue;
      data.push({
        year: yearNum,
        equity: Math.round(result.downPayment + row.cumulativePrincipal),
        balance: Math.round(row.balance),
      });
    }
    return data;
  }, [result, paymentsPerYear]);

  const tableRows = useMemo(() => {
    if (!summarized) return result.schedule;
    return result.schedule.filter(
      (p) =>
        p.paymentNumber % paymentsPerYear === 0 ||
        p.paymentNumber === result.schedule.length
    );
  }, [result, summarized, paymentsPerYear]);

  return (
    <ToolShell>
      <ToolToolbar title="Mortgage Simulator" icon="Home">
        <Button variant="subtle" onClick={resetDefaults}>
          <RotateCcw size={12} />
          Reset
        </Button>
      </ToolToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
        <div className="flex flex-col gap-5">
          {/* Input Fields */}
          <ToolCard>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <MoneyInput
                label="Home Price"
                prefix="$"
                locale="en-CA"
                value={inputs.homePrice}
                onChange={(e) => updateField("homePrice", e.target.value)}
                min={0}
              />
              <Input
                label="Down Payment"
                suffix="%"
                type="number"
                value={inputs.downPaymentPercent}
                onChange={(e) => updateField("downPaymentPercent", e.target.value)}
                min={5}
                max={100}
                step={1}
              />
              <Input
                label="Interest Rate"
                suffix="%"
                type="number"
                value={inputs.interestRate}
                onChange={(e) => updateField("interestRate", e.target.value)}
                min={0}
                max={20}
                step={0.01}
              />
              <div className="flex flex-col gap-1.5">
                <label className="block text-[12px] font-medium text-t2">
                  Amortization
                </label>
                <select
                  value={inputs.amortizationYears}
                  onChange={(e) => updateField("amortizationYears", parseInt(e.target.value))}
                  className="w-full px-3 py-[7px] rounded-[7px] text-[13px] font-sans bg-surface border border-border text-t1 outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)]"
                >
                  {AMORTIZATION_OPTIONS.map((years) => (
                    <option key={years} value={years}>
                      {years} years
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="block text-[12px] font-medium text-t2">
                  Payment Frequency
                </label>
                <select
                  value={inputs.paymentFrequency}
                  onChange={(e) => updateField("paymentFrequency", e.target.value as PaymentFrequency)}
                  className="w-full px-3 py-[7px] rounded-[7px] text-[13px] font-sans bg-surface border border-border text-t1 outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)]"
                >
                  {PAYMENT_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ToolCard>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <StatDisplay
              label="Mortgage Principal"
              value={formatCompactCAD(result.principal)}
              subLabel={`${formatCAD(result.downPayment)} down (${inputs.downPaymentPercent}%)`}
            />
            <StatDisplay
              label={`${getFrequencyLabel(inputs.paymentFrequency)} Payment`}
              value={formatCAD(result.payment, true)}
              subLabel={`@ ${inputs.interestRate}% interest`}
              valueClassName="text-[var(--color-blue)]"
            />
            <StatDisplay
              label="Total Payments"
              value={formatCompactCAD(result.totalPaid)}
              subLabel={`Over ${inputs.amortizationYears} years`}
            />
            <StatDisplay
              label="Total Interest"
              value={formatCompactCAD(result.totalInterest)}
              subLabel={result.principal > 0 ? `${((result.totalInterest / result.principal) * 100).toFixed(0)}% of principal` : "—"}
              valueClassName="text-[var(--color-orange)]"
            />
            <StatDisplay
              label="Cost Ratio"
              value={result.principal > 0 ? `${((result.totalPaid / result.principal - 1) * 100).toFixed(1)}%` : "—"}
              subLabel={result.principal > 0 ? `${(result.totalPaid / result.principal).toFixed(2)}× per dollar borrowed` : "Total cost over principal"}
            />
          </div>

          {/* Principal vs Interest Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Stacked Bar Chart - Yearly Payment Breakdown */}
            <ToolCard>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-t2">
                  Yearly Payment Breakdown
                </span>
              </div>
              <ChartLegend
                items={[
                  { color: "var(--color-blue)", label: "Principal", type: "square" },
                  { color: "var(--color-orange)", label: "Interest", type: "square" },
                ]}
                className="mb-3"
              />
              <RechartsViewport height={220}>
                  <BarChart data={yearlyBreakdownData} barCategoryGap="20%">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                      stroke="var(--color-text-tertiary)"
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                      tickFormatter={(v: number) => `Y${v}`}
                      interval={Math.ceil(yearlyBreakdownData.length / 10) - 1}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                      stroke="var(--color-text-tertiary)"
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                      tickFormatter={getYAxisTickFormatter("CAD")}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const principal = payload.find(p => p.dataKey === "principal")?.value as number || 0;
                        const interest = payload.find(p => p.dataKey === "interest")?.value as number || 0;
                        const total = principal + interest;
                        return (
                          <ChartTooltipShell active={active}>
                            <div className="text-t3 text-[11px] mb-1.5">
                              Year {label}
                            </div>
                            <div className="flex flex-col gap-0.5 text-[11px]">
                              <div className="flex justify-between gap-6">
                                <span className="text-[var(--color-blue)]">Principal</span>
                                <span className="text-t1">{formatCAD(principal)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-[var(--color-orange)]">Interest</span>
                                <span className="text-t1">{formatCAD(interest)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between gap-6 mt-1.5 pt-1.5 border-t border-border text-[11px]">
                              <span className="text-t1 font-medium">Total</span>
                              <span className="text-t1 font-medium">{formatCAD(total)}</span>
                            </div>
                          </ChartTooltipShell>
                        );
                      }}
                    />
                    {crossoverYear && (
                      <ReferenceLine
                        x={crossoverYear}
                        stroke="var(--color-green)"
                        strokeDasharray="4 4"
                        label={{
                          value: "Principal > Interest",
                          position: "top",
                          fill: "var(--color-green)",
                          fontSize: 9,
                          fontFamily: "var(--font-jetbrains)",
                        }}
                      />
                    )}
                    <Bar
                      dataKey="principal"
                      stackId="payment"
                      fill="var(--color-blue)"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="interest"
                      stackId="payment"
                      fill="var(--color-orange)"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
              </RechartsViewport>
            </ToolCard>

            {/* Donut Chart - Total Cost Split */}
            <ToolCard>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-t2">
                  Total Loan Cost
                </span>
              </div>
              <div className="relative h-[220px] w-full min-h-0">
                <RechartsViewport height={220}>
                  <PieChart>
                    <Pie
                      data={totalCostData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {totalCostData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0];
                        if (!d) return null;
                        const total = totalCostData[0].value + totalCostData[1].value;
                        return (
                          <ChartTooltipShell active={active}>
                            <div className="flex justify-between gap-6 text-[11px]">
                              <span style={{ color: d.payload.color }}>{d.payload.name}</span>
                              <span className="text-t1">{formatCAD(Number(d.value))}</span>
                            </div>
                            <div className="text-t3 text-[10px] mt-1">
                              {((Number(d.value) / total) * 100).toFixed(1)}% of total
                            </div>
                          </ChartTooltipShell>
                        );
                      }}
                    />
                  </PieChart>
                </RechartsViewport>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-t3 uppercase tracking-wider">Total Paid</span>
                  <span className="text-[18px] font-semibold text-t1 font-mono">
                    {formatCompactCAD(totalCostData[0].value + totalCostData[1].value)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-blue)]" />
                    <span className="text-[11px] text-t3">Principal</span>
                  </div>
                  <span className="text-[12px] font-mono text-t2">{formatCAD(totalCostData[0].value)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[var(--color-orange)]" />
                    <span className="text-[11px] text-t3">Interest</span>
                  </div>
                  <span className="text-[12px] font-mono text-[var(--color-orange)]">{formatCAD(totalCostData[1].value)}</span>
                </div>
              </div>
            </ToolCard>
          </div>

          {/* Equity Build-up vs Remaining Balance */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">Equity Build-up</span>
              <ChartLegend
                items={[
                  { color: "var(--color-blue)", label: "Equity Built" },
                  { color: "var(--color-orange)", label: "Remaining Balance", type: "dashed-line" as const },
                ]}
              />
            </div>
            <RechartsViewport height={220}>
                <ComposedChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={(v: number) => `Y${v}`}
                    interval={Math.ceil(equityData.length / 10) - 1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={getYAxisTickFormatter("CAD")}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const equity = payload.find(p => p.dataKey === "equity")?.value as number || 0;
                      const balance = payload.find(p => p.dataKey === "balance")?.value as number || 0;
                      const equityPct = equity + balance > 0 ? ((equity / (equity + balance)) * 100).toFixed(1) : "0";
                      return (
                        <ChartTooltipShell active={active}>
                          <div className="text-t3 text-[11px] mb-1.5">Year {label}</div>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">Equity</span>
                              <span className="text-t1">{formatCAD(equity)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-orange)]">Remaining</span>
                              <span className="text-t1">{formatCAD(balance)}</span>
                            </div>
                          </div>
                          <div className="text-t3 text-[10px] mt-1.5 pt-1.5 border-t border-border">
                            {equityPct}% equity ownership (at purchase price)
                          </div>
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="var(--color-blue)"
                    fill="var(--color-blue-dim)"
                    strokeWidth={1.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--color-orange)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
            </RechartsViewport>
          </ToolCard>

          {/* Amortization Table */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Amortization Schedule
              </span>
              <button
                onClick={() => setSummarized((s) => !s)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[12px] font-medium transition-all duration-[120ms] hover:bg-hover text-t2 hover:text-t1"
              >
                <span
                  className={`w-[30px] h-[16px] rounded-full relative transition-all duration-[120ms] ${
                    summarized
                      ? "bg-[var(--color-blue)]"
                      : "bg-surface border border-border"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[12px] h-[12px] rounded-full transition-all duration-[120ms] ${
                      summarized
                        ? "left-[15px] bg-white"
                        : "left-[2px] bg-t3"
                    }`}
                  />
                </span>
                Yearly summary
              </button>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-s2">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium text-t3 text-[11px]">
                      {summarized ? "Year" : "#"}
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">
                      Payment
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">
                      <div className="flex flex-col items-end">
                        <span>Principal</span>
                        <span className="text-[9px] font-normal opacity-60">this period</span>
                      </div>
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">
                      <div className="flex flex-col items-end">
                        <span>Interest</span>
                        <span className="text-[9px] font-normal opacity-60">this period</span>
                      </div>
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">
                      <div className="flex flex-col items-end">
                        <span>Total Paid</span>
                        <span className="text-[9px] font-normal opacity-60">cumulative</span>
                      </div>
                    </th>
                    <th className="text-right py-2 pl-3 font-medium text-t3 text-[11px]">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((p, idx) => {
                    const year = Math.ceil(p.paymentNumber / paymentsPerYear);
                    const percentPaid = result.principal > 0 ? ((result.principal - p.balance) / result.principal) * 100 : 0;
                    const isLastRow = idx === tableRows.length - 1;
                    
                    return (
                      <tr
                        key={p.paymentNumber}
                        className={`border-b border-border last:border-b-0 transition-all duration-[120ms] hover:bg-surface ${
                          isLastRow ? "bg-[var(--color-green-dim)]" : "even:bg-surface/50"
                        }`}
                      >
                        <td className="py-2 pr-3 font-mono text-t2">
                          {summarized ? `Y${year}` : p.paymentNumber}
                        </td>
                        <td className="py-2 px-3 font-mono text-t1 text-right">
                          {formatCAD(p.payment, true)}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-[var(--color-blue)]">
                          {formatCAD(p.principal, true)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[var(--color-orange)] text-right">
                          {formatCAD(p.interest, true)}
                        </td>
                        <td className="py-2 px-3 font-mono text-t2 text-right">
                          <div className="flex flex-col items-end">
                            <span>{formatCAD(p.cumulativePrincipal + p.cumulativeInterest)}</span>
                            <span className="text-[9px] text-t3">{percentPaid.toFixed(1)}% paid</span>
                          </div>
                        </td>
                        <td className={`py-2 pl-3 font-mono font-medium text-right ${
                          isLastRow ? "text-[var(--color-green)]" : "text-t1"
                        }`}>
                          {isLastRow ? "Paid off!" : formatCAD(p.balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ToolCard>
        </div>
      </div>

      <ToolStatusBar
        left={
          <span>
            {formatCAD(result.principal)} mortgage · {inputs.amortizationYears}yr amortization · {getFrequencyLabel(inputs.paymentFrequency)} payments
          </span>
        }
        right={<span>Press Cmd+Enter to reset</span>}
      />
    </ToolShell>
  );
}
