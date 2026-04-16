"use client";

import { useMemo, useEffect, useCallback, useState, useRef } from "react";
import {
  ComposedChart,
  BarChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { RotateCcw, ArrowRight, Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

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
  calculateGoalPlan,
  type GoalPlannerInputs,
  RETURN_PRESETS,
} from "@/lib/finance/goal-planner";
import {
  formatCurrency,
  formatCompact,
  formatPercent,
  formatINR,
  formatCompactINR,
  getYAxisTickFormatter,
  type Currency,
} from "@/lib/finance/format";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { ChartTooltipShell } from "@/components/ui/ChartTooltipShell";
import { ChartLegend } from "@/components/ui/ChartLegend";

/* ─── Constants ──────────────────────────────────── */

const DEFAULTS: GoalPlannerInputs = {
  targetAmount: 10000000,
  currentAge: 30,
  targetAge: 50,
  expectedReturn: 10,
  startingCapital: 100000,
  stepUpPercent: 5,
  inflationRate: 6,
};

const FIELD_KEYS: (keyof GoalPlannerInputs)[] = [
  "targetAmount",
  "currentAge",
  "targetAge",
  "expectedReturn",
  "startingCapital",
  "stepUpPercent",
  "inflationRate",
];

const SCENARIO_COLORS = {
  conservative: "var(--color-orange)",
  base: "var(--color-blue)",
  optimistic: "var(--color-green)",
};

/* ─── Risk Profile Preset ─────────────────────────── */

function RiskPresetSelector({
  currentRate,
  onSelect,
}: {
  currentRate: number;
  onSelect: (rate: number) => void;
}) {
  const presets = [
    { label: "Conservative", rate: RETURN_PRESETS.conservative, color: "var(--color-orange)" },
    { label: "Moderate", rate: RETURN_PRESETS.moderate, color: "var(--color-blue)" },
    { label: "Aggressive", rate: RETURN_PRESETS.aggressive, color: "var(--color-green)" },
  ];

  return (
    <div className="flex items-center gap-1.5 md:gap-1">
      {presets.map(({ label, rate, color }) => (
        <button
          key={label}
          onClick={() => onSelect(rate)}
          className={`px-2.5 py-1.5 md:px-2 md:py-0.5 rounded-[5px] text-[11px] md:text-[10px] font-medium transition-all border active:opacity-70 ${
            Math.abs(currentRate - rate) < 0.5
              ? "border-current"
              : "border-transparent hover:bg-hover"
          }`}
          style={{ color }}
        >
          {label} ({rate}%)
        </button>
      ))}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────── */

type FormValues = Record<keyof GoalPlannerInputs, string>;

function toFormValues(inputs: GoalPlannerInputs): FormValues {
  return FIELD_KEYS.reduce((acc, key) => {
    acc[key] = String(inputs[key]);
    return acc;
  }, {} as FormValues);
}

function parseField(value: string, fallback: number): number {
  if (value === "" || value === "-" || value === ".") return fallback;
  const n = parseFloat(value);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

function toNumericInputs(form: FormValues): GoalPlannerInputs {
  return {
    targetAmount: parseField(form.targetAmount, DEFAULTS.targetAmount),
    currentAge: parseField(form.currentAge, DEFAULTS.currentAge),
    targetAge: parseField(form.targetAge, DEFAULTS.targetAge),
    expectedReturn: parseField(form.expectedReturn, DEFAULTS.expectedReturn),
    startingCapital: parseField(form.startingCapital, DEFAULTS.startingCapital),
    stepUpPercent: parseField(form.stepUpPercent, DEFAULTS.stepUpPercent),
    inflationRate: parseField(form.inflationRate, DEFAULTS.inflationRate),
  };
}

/* ─── Page ───────────────────────────────────────── */

export default function GoalPlannerPage() {
  const [savedInputs, setSavedInputs] = useLocalStorage<GoalPlannerInputs>(
    "helm:goal-planner:v2",
    DEFAULTS
  );
  const [formValues, setFormValues] = useState<FormValues>(() =>
    toFormValues(DEFAULTS)
  );
  const [showReal, setShowReal] = useState(false);
  const [currencyRaw, setCurrencyRaw] = useLocalStorage<string>(
    "helm:goal-planner:currency",
    "INR"
  );

  useEffect(() => {
    if (currencyRaw === "USD") setCurrencyRaw("CAD");
  }, [currencyRaw, setCurrencyRaw]);

  const currency: Currency = currencyRaw === "INR" ? "INR" : "CAD";

  const setCurrency = useCallback(
    (c: Currency) => setCurrencyRaw(c),
    [setCurrencyRaw]
  );

  const fmt = useMemo(() => (currency === "INR" ? formatINR : formatCurrency), [currency]);
  const fmtCompact = useMemo(() => (currency === "INR" ? formatCompactINR : formatCompact), [currency]);
  const currencySymbol = currency === "INR" ? "₹" : "$";
  const currencyLocale = currency === "INR" ? "en-IN" : "en-CA";

  /* Sync form on hydration / reset (skip when change originated from user input) */
  const skipSyncRef = useRef(false);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setFormValues(toFormValues(savedInputs));
  }, [savedInputs]);

  const inputs = useMemo(() => toNumericInputs(formValues), [formValues]);

  const handleFieldChange = useCallback(
    (field: keyof GoalPlannerInputs, value: string) => {
      skipSyncRef.current = true;
      setFormValues((prev) => {
        const next = { ...prev, [field]: value };
        setSavedInputs(toNumericInputs(next));
        return next;
      });
    },
    [setSavedInputs]
  );

  const resetDefaults = useCallback(() => {
    setSavedInputs(DEFAULTS);
  }, [setSavedInputs]);

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

  const result = useMemo(() => calculateGoalPlan(inputs), [inputs]);

  /* Chart data */
  const chartData = useMemo(() => {
    return result.projections.map((p) => {
      const deflator = showReal ? Math.pow(1 + inputs.inflationRate / 100, p.year) : 1;
      return {
        year: p.year,
        age: p.age,
        invested: Math.round(p.cumulativeContributions / deflator),
        growth: Math.round(p.cumulativeGrowth / deflator),
        total: Math.round(p.endingBalance / deflator),
        yearContributions: Math.round(p.yearContributions / deflator),
        yearGrowth: Math.round(p.yearGrowth / deflator),
        monthlyContribution: Math.round(p.monthlyContribution / deflator),
        target: Math.round(inputs.targetAmount / deflator),
      };
    });
  }, [result.projections, inputs.inflationRate, inputs.targetAmount, showReal]);

  const inflectionYear = useMemo(() => {
    const p = chartData.find(
      (d) => d.yearGrowth > d.yearContributions && d.yearContributions > 0
    );
    return p?.year;
  }, [chartData]);

  return (
    <ToolShell>
      <ToolToolbar title="Goal Planner" icon="Target">
        <CurrencyToggle value={currency} onChange={setCurrency} />
        <Button variant="subtle" onClick={resetDefaults}>
          <RotateCcw size={12} />
          Reset
        </Button>
      </ToolToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
        <div className="flex flex-col gap-5">
          {/* ─── Input Fields ──────────────────────── */}
          <ToolCard>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
              <span className="text-[12px] font-medium text-t2">Your Goal</span>
              <RiskPresetSelector
                currentRate={inputs.expectedReturn}
                onSelect={(rate) => handleFieldChange("expectedReturn", String(rate))}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <MoneyInput
                label="Target Amount"
                prefix={currencySymbol}
                value={formValues.targetAmount}
                onChange={(e) => handleFieldChange("targetAmount", e.target.value)}
                min={0}
                locale={currencyLocale}
              />
              <Input
                label="Current Age"
                suffix="yrs"
                type="number"
                value={formValues.currentAge}
                onChange={(e) => handleFieldChange("currentAge", e.target.value)}
                min={18}
                max={80}
                step={1}
              />
              <Input
                label="Target Age"
                suffix="yrs"
                type="number"
                value={formValues.targetAge}
                onChange={(e) => handleFieldChange("targetAge", e.target.value)}
                min={Number(formValues.currentAge) + 1}
                max={100}
                step={1}
              />
              <Input
                label="Expected Return"
                suffix="%"
                type="number"
                value={formValues.expectedReturn}
                onChange={(e) => handleFieldChange("expectedReturn", e.target.value)}
                min={0}
                max={30}
                step={0.5}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
              <MoneyInput
                label="Starting Capital"
                prefix={currencySymbol}
                value={formValues.startingCapital}
                onChange={(e) => handleFieldChange("startingCapital", e.target.value)}
                min={0}
                locale={currencyLocale}
              />
              <Input
                label="Annual Step-up"
                suffix="%"
                type="number"
                value={formValues.stepUpPercent}
                onChange={(e) => handleFieldChange("stepUpPercent", e.target.value)}
                min={0}
                max={25}
                step={1}
              />
              <Input
                label="Inflation Rate"
                suffix="%"
                type="number"
                value={formValues.inflationRate}
                onChange={(e) => handleFieldChange("inflationRate", e.target.value)}
                min={0}
                max={15}
                step={0.5}
              />
              <div /> {/* Empty cell for alignment */}
            </div>
          </ToolCard>

          {/* ─── Main Answer ────────────────────────── */}
          <ToolCard>
            <div className="text-[12px] text-t3 mb-2">
              To reach {fmtCompact(inputs.targetAmount)} by age {inputs.targetAge}, you need to invest
            </div>
            <div className="text-[24px] md:text-[36px] font-mono font-semibold text-[var(--color-blue)]">
              {fmt(result.requiredMonthly)}
              <span className="text-[14px] md:text-[16px] text-t2 font-normal ml-2">/month</span>
            </div>
            <div className="text-[12px] text-t3 mt-2">
              Starting now at age {inputs.currentAge} · {result.yearsToGoal} years to goal
              {inputs.stepUpPercent > 0 && (
                <span> · increasing {inputs.stepUpPercent}% yearly</span>
              )}
            </div>
          </ToolCard>

          {/* ─── Summary Stats ─────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <StatDisplay
              label={`Final Value · Age ${inputs.targetAge}`}
              value={fmtCompact(showReal
                ? result.finalValue / Math.pow(1 + inputs.inflationRate / 100, result.yearsToGoal)
                : result.finalValue
              )}
              subLabel={
                showReal
                  ? currency === "INR"
                    ? "in today's ₹"
                    : "in today's Canadian dollars"
                  : undefined
              }
            />
            <StatDisplay
              label="Total Invested"
              value={fmtCompact(result.totalInvested)}
              subLabel={`Over ${result.yearsToGoal} years`}
            />
            <StatDisplay
              label="Total Returns"
              value={fmtCompact(result.totalReturns)}
              subLabel={`${formatPercent((result.totalReturns / result.totalInvested) * 100, 0)} of invested`}
              valueClassName="text-[var(--color-green)]"
            />
            <StatDisplay
              label="Real Final Value"
              value={fmtCompact(result.finalValue / Math.pow(1 + inputs.inflationRate / 100, result.yearsToGoal))}
              subLabel={`In today's ${currencySymbol} · ${inputs.inflationRate}% inflation`}
            />
            <StatDisplay
              label="Final Monthly SIP"
              value={fmt(result.finalMonthlyContribution)}
              subLabel={inputs.stepUpPercent > 0 ? `after ${result.yearsToGoal - 1} step-ups` : undefined}
            />
          </div>

          {/* ─── Scenario Comparison ────────────────── */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">Scenario Comparison</span>
              <span className="text-[11px] text-t3">
                Required monthly SIP at different return rates
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {result.scenarios.map((scenario, idx) => {
                const colors = [
                  SCENARIO_COLORS.conservative,
                  SCENARIO_COLORS.base,
                  SCENARIO_COLORS.optimistic,
                ];
                const isActive = Math.abs(scenario.rate - inputs.expectedReturn) < 0.5;
                return (
                  <div
                    key={scenario.label}
                    className={`rounded-[8px] p-4 border transition-all ${
                      isActive ? "border-2" : "border-border"
                    }`}
                    style={{ borderColor: isActive ? colors[idx] : undefined }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium" style={{ color: colors[idx] }}>
                        {scenario.label}
                      </span>
                      <span className="text-[11px] text-t3">{formatPercent(scenario.rate)} return</span>
                    </div>
                    <div className="text-[20px] font-mono font-semibold text-t1">
                      {fmt(scenario.requiredMonthly)}
                      <span className="text-[11px] text-t3 font-normal">/mo</span>
                    </div>
                    <div className="text-[11px] text-t3 mt-1">
                      <ArrowRight className="inline w-3 h-3 mr-1" />
                      {fmtCompact(scenario.finalValue)} final value
                    </div>
                    {idx !== 1 && (
                      <div className="text-[10px] font-mono mt-1" style={{ color: colors[idx] }}>
                        {scenario.requiredMonthly > result.scenarios[1].requiredMonthly ? "+" : ""}
                        {fmt(scenario.requiredMonthly - result.scenarios[1].requiredMonthly)}/mo vs base
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ToolCard>

          {/* ─── Portfolio Growth Chart ────────────── */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-t2">Portfolio Growth</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5 p-0.5 rounded-[6px] bg-surface border border-border">
                    <button
                      onClick={() => setShowReal(false)}
                      className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all ${
                        !showReal
                          ? "bg-[var(--color-blue-dim)] text-[var(--color-blue)]"
                          : "text-t3 hover:text-t2"
                      }`}
                    >
                      Nominal
                    </button>
                    <button
                      onClick={() => setShowReal(true)}
                      className={`px-2 py-0.5 rounded-[5px] text-[11px] font-medium transition-all ${
                        showReal
                          ? "bg-[var(--color-blue-dim)] text-[var(--color-blue)]"
                          : "text-t3 hover:text-t2"
                      }`}
                    >
                      Real
                    </button>
                  </div>
                  <TooltipPrimitive.Provider delayDuration={200}>
                    <TooltipPrimitive.Root>
                      <TooltipPrimitive.Trigger asChild>
                        <Info size={11} className="text-t3 cursor-help shrink-0" />
                      </TooltipPrimitive.Trigger>
                      <TooltipPrimitive.Portal>
                        <TooltipPrimitive.Content
                          className="bg-[var(--color-bg-surface-2)] border border-border rounded-[7px] px-3 py-2 text-[11px] text-t2 max-w-[240px] shadow-lg z-50"
                          sideOffset={5}
                        >
                          Real values are adjusted for inflation to show purchasing power in today&apos;s money
                          <TooltipPrimitive.Arrow className="fill-[var(--color-bg-surface-2)]" />
                        </TooltipPrimitive.Content>
                      </TooltipPrimitive.Portal>
                    </TooltipPrimitive.Root>
                  </TooltipPrimitive.Provider>
                </div>
              </div>
              <ChartLegend
                items={[
                  { color: "var(--color-blue)", label: "Invested" },
                  { color: "var(--color-green)", label: "Growth" },
                  { color: "var(--color-red)", label: "Target", type: "dashed-line" },
                ]}
              />
            </div>

            <RechartsViewport height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[inputs.currentAge + 1, inputs.targetAge]}
                    ticks={chartData.map(d => d.age).filter((_, i, arr) => {
                      const interval = arr.length > 30 ? 10 : arr.length > 15 ? 5 : arr.length > 10 ? 3 : 2;
                      return i % interval === 0 || i === arr.length - 1;
                    })}
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={(v: number) => `${v}`}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={getYAxisTickFormatter(currency)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      return (
                        <ChartTooltipShell active={active}>
                          <div className="text-t3 text-[11px] mb-1.5">
                            Age {d.age} · Year {d.year}
                          </div>
                          <div className="text-t1 font-medium text-[14px] mb-2">
                            {fmt(d.total)}
                            {showReal && (
                              <span className="text-t3 text-[10px] ml-1">
                                today&apos;s {currencySymbol}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-green)]">Growth</span>
                              <span className="text-t1">{fmt(d.growth)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">Invested</span>
                              <span className="text-t1">{fmt(d.invested)}</span>
                            </div>
                          </div>
                          <div className="text-t3 text-[10px] mt-2 pt-2 border-t border-border">
                            Monthly SIP: {fmt(d.monthlyContribution)}
                          </div>
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={showReal ? inputs.targetAmount / Math.pow(1 + inputs.inflationRate / 100, result.yearsToGoal) : inputs.targetAmount}
                    stroke="var(--color-red)"
                    strokeDasharray="6 3"
                    strokeOpacity={0.7}
                    label={{ value: "Target", position: "right", fill: "var(--color-red)", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                  />
                  {inflectionYear && (
                    <ReferenceLine
                      x={inputs.currentAge + inflectionYear}
                      stroke="var(--color-green)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                      label={{
                        value: "Growth > contributions",
                        position: "top",
                        fill: "var(--color-green)",
                        fontSize: 9,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stackId="1"
                    stroke="var(--color-blue)"
                    fill="var(--color-blue-dim)"
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="growth"
                    stackId="1"
                    stroke="var(--color-green)"
                    fill="var(--color-green-dim)"
                    strokeWidth={1.5}
                  />
                </ComposedChart>
            </RechartsViewport>
          </ToolCard>

          {/* ─── Annual Breakdown ───────────────────── */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">Annual Breakdown</span>
              <ChartLegend
                items={[
                  { color: "var(--color-blue)", label: "Contributions" },
                  { color: "var(--color-green)", label: "Returns" },
                ]}
              />
            </div>
            <RechartsViewport height={180}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    interval={Math.max(0, Math.floor(result.yearsToGoal / 10))}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={getYAxisTickFormatter(currency)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      const ratio =
                        d.yearContributions > 0
                          ? (d.yearGrowth / d.yearContributions).toFixed(1)
                          : null;
                      return (
                        <ChartTooltipShell active={active}>
                          <div className="text-t3 text-[11px] mb-1.5">
                            Age {d.age} · Year {d.year}
                          </div>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-green)]">Returns</span>
                              <span className="text-t1">{fmt(d.yearGrowth)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">Contributions</span>
                              <span className="text-t1">{fmt(d.yearContributions)}</span>
                            </div>
                          </div>
                          {ratio && (
                            <div className="text-t3 text-[10px] mt-1.5 pt-1.5 border-t border-border">
                              Returns are {ratio}x contributions
                            </div>
                          )}
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  {inflectionYear && (
                    <ReferenceLine
                      x={inputs.currentAge + inflectionYear}
                      stroke="var(--color-green)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                      label={{
                        value: "Returns > contributions",
                        position: "top",
                        fill: "var(--color-green)",
                        fontSize: 9,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  )}
                  <Bar
                    dataKey="yearContributions"
                    stackId="1"
                    fill="var(--color-blue)"
                    fillOpacity={0.7}
                  />
                  <Bar
                    dataKey="yearGrowth"
                    stackId="1"
                    fill="var(--color-green)"
                    fillOpacity={0.7}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
            </RechartsViewport>
          </ToolCard>

          {/* ─── Year-by-Year Table ────────────────── */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Year-by-Year Breakdown
              </span>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-s2">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-t3 text-[11px]">Year</th>
                    <th className="text-left py-2 px-4 font-medium text-t3 text-[11px]">Age</th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">Monthly SIP</th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">Year Invested</th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">Year Growth</th>
                    <th className="text-right py-2 pl-4 font-medium text-t3 text-[11px]">Portfolio Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.projections.map((p) => (
                    <tr
                      key={p.year}
                      className="border-b border-border last:border-b-0 transition-all duration-[120ms] hover:bg-surface even:bg-surface/50"
                    >
                      <td className="py-2 pr-4 font-mono text-t2">{p.year}</td>
                      <td className="py-2 px-4 font-mono text-t2">{p.age}</td>
                      <td className="py-2 px-4 font-mono text-t1 text-right">
                        {fmt(p.monthlyContribution)}
                      </td>
                      <td className="py-2 px-4 font-mono text-[var(--color-blue)] text-right">
                        {fmt(p.yearContributions)}
                      </td>
                      <td className="py-2 px-4 font-mono text-[var(--color-green)] text-right">
                        {fmt(p.yearGrowth)}
                      </td>
                      <td className="py-2 pl-4 font-mono text-t1 font-medium text-right">
                        {fmt(p.endingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 bg-s2 border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="py-2 pr-4 font-mono text-t2 font-semibold text-[11px]">
                      TOTAL
                    </td>
                    <td className="py-2 px-4 font-mono text-[var(--color-blue)] text-right font-semibold">
                      {fmt(result.totalInvested)}
                    </td>
                    <td className="py-2 px-4 font-mono text-[var(--color-green)] text-right font-semibold">
                      {fmt(result.wealthGain)}
                    </td>
                    <td className="py-2 pl-4 font-mono text-t1 text-right font-semibold">
                      {fmt(result.finalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ToolCard>
        </div>
      </div>

      <ToolStatusBar
        left={
          <span>
            {fmt(result.requiredMonthly)}/mo → {fmtCompact(result.finalValue)} by age {inputs.targetAge}
            {showReal ? " (real)" : ""}
          </span>
        }
        right={<span>Cmd+Enter to reset defaults</span>}
      />
    </ToolShell>
  );
}
