"use client";

import { Fragment, useMemo, useEffect, useCallback, useState, useRef } from "react";
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
  ReferenceLine,
} from "recharts";
import { RotateCcw, X, Info, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { ToolShell } from "@/components/shell/ToolShell";
import { ToolToolbar } from "@/components/shell/ToolToolbar";
import { ToolStatusBar } from "@/components/shell/ToolStatusBar";
import { ToolCard } from "@/components/ui/ToolCard";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { StatDisplay } from "@/components/ui/StatDisplay";
import { Button } from "@/components/ui/Button";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  simulate,
  type SimulatorInputs,
  type SimulatorResult,
  type LifeEvent,
} from "@/lib/finance/simulator";
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
import { RechartsViewport } from "@/components/ui/RechartsViewport";

/* ─── Types ──────────────────────────────────────── */

interface PageInputs extends SimulatorInputs {
  currentAge: number;
}

interface PinnedScenario {
  id: number;
  label: string;
  result: SimulatorResult;
}

/* ─── Constants ──────────────────────────────────── */

const DEFAULTS: PageInputs = {
  initialBalance: 10000,
  annualGrowthRate: 8,
  contributionYears: 30,
  growthOnlyYears: 20,
  monthlyContribution: 500,
  annualContributionIncrease: 2,
  currentAge: 25,
};

const FIELD_KEYS: (keyof PageInputs)[] = [
  "currentAge",
  "initialBalance",
  "annualGrowthRate",
  "contributionYears",
  "growthOnlyYears",
  "monthlyContribution",
  "annualContributionIncrease",
];

const SCENARIO_COLORS = [
  "var(--color-purple)",
  "var(--color-orange)",
  "var(--color-red)",
];

const MAX_SCENARIOS = 3;

/* ─── Helpers ────────────────────────────────────── */

type FormValues = Record<keyof PageInputs, string>;

function toFormValues(inputs: PageInputs): FormValues {
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

function toNumericInputs(form: FormValues): PageInputs {
  return {
    currentAge: parseField(form.currentAge, DEFAULTS.currentAge),
    initialBalance: parseField(form.initialBalance, DEFAULTS.initialBalance),
    annualGrowthRate: parseField(
      form.annualGrowthRate,
      DEFAULTS.annualGrowthRate
    ),
    contributionYears: parseField(
      form.contributionYears,
      DEFAULTS.contributionYears
    ),
    growthOnlyYears: parseField(
      form.growthOnlyYears,
      DEFAULTS.growthOnlyYears
    ),
    monthlyContribution: parseField(
      form.monthlyContribution,
      DEFAULTS.monthlyContribution
    ),
    annualContributionIncrease: parseField(
      form.annualContributionIncrease,
      DEFAULTS.annualContributionIncrease
    ),
  };
}

/* ─── Investment Events Card ─────────────────────── */

function InvestmentEventsCard({
  events,
  onAdd,
  onDelete,
  currentAge,
  totalYears,
  formatAmount,
  currencyPrefix,
  locale,
}: {
  events: LifeEvent[];
  onAdd: (event: LifeEvent) => void;
  onDelete: (id: string) => void;
  currentAge: number;
  totalYears: number;
  formatAmount: (value: number) => string;
  currencyPrefix: string;
  locale: "en-CA" | "en-IN";
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    age: String(currentAge + 5),
    amount: "",
    type: "income" as "expense" | "income",
  });

  const maxAge = currentAge + totalYears - 1;

  const handleAdd = () => {
    if (!newEvent.name.trim() || !newEvent.amount) return;
    const amount = parseFloat(newEvent.amount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) return;
    const age = parseInt(newEvent.age);
    if (isNaN(age) || age < currentAge || age > maxAge) return;

    onAdd({
      id: crypto.randomUUID(),
      name: newEvent.name.trim(),
      age,
      amount,
      type: newEvent.type,
    });

    setNewEvent({ name: "", age: String(currentAge + 5), amount: "", type: "income" });
    setIsAdding(false);
  };

  const totalImpact = events.reduce(
    (sum, e) => sum + (e.type === "income" ? e.amount : -e.amount),
    0
  );

  const sortedEvents = [...events].sort((a, b) => a.age - b.age);

  return (
    <ToolCard>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-t3 font-medium hover:text-t2 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Investment Events
          {events.length > 0 && (
            <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded-full">
              {events.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setIsExpanded(true);
            setIsAdding(true);
          }}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--color-blue)] hover:bg-[var(--color-blue-dim)] rounded-[5px] transition-all duration-[120ms]"
        >
          <Plus size={12} />
          Add Event
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 flex flex-col gap-3">
          {isAdding && (
            <div className="p-3 bg-surface rounded-[7px] border border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-t3 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) =>
                      setNewEvent((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Lump Sum Investment"
                    className="w-full px-2.5 py-2.5 md:py-1.5 rounded-[5px] text-base md:text-[12px] bg-s2 border border-border text-t1 placeholder:text-t3 outline-none focus:border-[var(--color-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-t3 mb-1">
                    Type
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        type: e.target.value as "expense" | "income",
                      }))
                    }
                    className="w-full px-2.5 py-2.5 md:py-1.5 rounded-[5px] text-base md:text-[12px] bg-s2 border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
                  >
                    <option value="income">Deposit</option>
                    <option value="expense">Withdrawal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-t3 mb-1">
                    At Age
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={newEvent.age}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*$/.test(val)) {
                        setNewEvent((prev) => ({ ...prev, age: val }));
                      }
                    }}
                    className="w-full px-2.5 py-2.5 md:py-1.5 rounded-[5px] text-base md:text-[12px] bg-s2 border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-t3 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-t3">
                      {currencyPrefix}
                    </span>
                    <input
                      type="text"
                      value={newEvent.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        const num = parseInt(val) || 0;
                        const formatted = num.toLocaleString(locale);
                        setNewEvent((prev) => ({
                          ...prev,
                          amount: num > 0 ? formatted : "",
                        }));
                      }}
                      placeholder="10,000"
                      className="w-full pl-6 pr-2.5 py-2.5 md:py-1.5 rounded-[5px] text-base md:text-[12px] bg-s2 border border-border text-t1 placeholder:text-t3 outline-none focus:border-[var(--color-blue)]"
                    />
                  </div>
                </div>
                <div className="col-span-2 flex items-end gap-2">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-3 py-2.5 md:py-1.5 text-[12px] md:text-[11px] font-medium text-t2 bg-surface border border-border rounded-[5px] hover:bg-hover active:bg-hover transition-all duration-[120ms]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newEvent.name.trim() || !newEvent.amount}
                    className="flex-1 px-3 py-2.5 md:py-1.5 text-[12px] md:text-[11px] font-medium text-white bg-[var(--color-blue)] rounded-[5px] hover:opacity-90 active:opacity-80 transition-all duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </div>
          )}

          {sortedEvents.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {sortedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-2.5 rounded-[6px] border ${
                    event.type === "expense"
                      ? "bg-[var(--color-red-dim)] border-[var(--color-red)]/20"
                      : "bg-[var(--color-green-dim)] border-[var(--color-green)]/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-t1">
                      {event.name}
                    </span>
                    <span className="text-[11px] text-t3">Age {event.age}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[12px] font-mono font-medium ${
                        event.type === "expense"
                          ? "text-[var(--color-red)]"
                          : "text-[var(--color-green)]"
                      }`}
                    >
                      {event.type === "expense" ? "-" : "+"}
                      {formatAmount(event.amount)}
                    </span>
                    <button
                      onClick={() => onDelete(event.id)}
                      className="p-1 text-t3 hover:text-[var(--color-red)] transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {events.length > 0 && (
                <div className="flex justify-end pt-2 border-t border-border mt-1">
                  <span className="text-[11px] text-t3">
                    Net Impact:{" "}
                    <span
                      className={`font-mono font-medium ${
                        totalImpact >= 0
                          ? "text-[var(--color-green)]"
                          : "text-[var(--color-red)]"
                      }`}
                    >
                      {totalImpact >= 0 ? "+" : ""}
                      {formatAmount(Math.abs(totalImpact))}
                    </span>{" "}
                    across {events.length} event{events.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          ) : (
            !isAdding && (
              <p className="text-[11px] text-t3 py-2">
                No events added. Add lump-sum deposits, withdrawals, or one-time
                expenses to see their impact on your investment growth.
              </p>
            )
          )}
        </div>
      )}
    </ToolCard>
  );
}

/* ─── Page ───────────────────────────────────────── */

export default function InvestmentSimulatorPage() {
  /* Persisted inputs */
  const [savedInputs, setSavedInputs] = useLocalStorage<PageInputs>(
    "helm:investment-simulator:v2",
    DEFAULTS
  );
  const [formValues, setFormValues] = useState<FormValues>(() =>
    toFormValues(DEFAULTS)
  );
  const [summarized, setSummarized] = useState(false);

  /* Life events */
  const [lifeEvents, setLifeEvents] = useLocalStorage<LifeEvent[]>(
    "helm:investment-simulator:events",
    []
  );

  const handleAddEvent = useCallback(
    (event: LifeEvent) => setLifeEvents((prev) => [...prev, event]),
    [setLifeEvents]
  );

  const handleDeleteEvent = useCallback(
    (id: string) => setLifeEvents((prev) => prev.filter((e) => e.id !== id)),
    [setLifeEvents]
  );

  /* View controls */
  const [showReal, setShowReal] = useState(false);
  const [inflationRate, setInflationRate] = useState("2");
  const [pinnedScenarios, setPinnedScenarios] = useState<PinnedScenario[]>([]);
  const [currencyRaw, setCurrencyRaw] = useLocalStorage<string>(
    "helm:investment-simulator:currency",
    "CAD"
  );

  useEffect(() => {
    if (currencyRaw === "USD") setCurrencyRaw("CAD");
  }, [currencyRaw, setCurrencyRaw]);

  const currency: Currency = currencyRaw === "INR" ? "INR" : "CAD";

  const setCurrency = useCallback(
    (c: Currency) => setCurrencyRaw(c),
    [setCurrencyRaw]
  );

  /* Currency formatting */
  const fmt = useMemo(() => {
    return currency === "INR" ? formatINR : formatCurrency;
  }, [currency]);

  const fmtCompact = useMemo(() => {
    return currency === "INR" ? formatCompactINR : formatCompact;
  }, [currency]);

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

  const inputs = useMemo(
    () => ({ ...toNumericInputs(formValues), lifeEvents }),
    [formValues, lifeEvents]
  );

  const handleFieldChange = useCallback(
    (field: keyof PageInputs, value: string) => {
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
    setPinnedScenarios([]);
    setLifeEvents([]);
  }, [setSavedInputs, setLifeEvents]);

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

  /* Monte Carlo */
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [volatility, setVolatility] = useState("15");

  /* Simulation */
  const result = useMemo(() => simulate(inputs), [inputs]);
  const totalYears = inputs.contributionYears + inputs.growthOnlyYears;
  const finalAge = inputs.currentAge + totalYears;
  const contributionEndAge = inputs.currentAge + inputs.contributionYears;

  const monteCarloResults = useMemo(() => {
    if (!showMonteCarlo) return null;
    const vol = (parseFloat(volatility) || 15) / 100;
    const lowRate = Math.max(0, inputs.annualGrowthRate - 1.28 * vol * 100);
    const highRate = inputs.annualGrowthRate + 1.28 * vol * 100;
    const low = simulate({ ...inputs, annualGrowthRate: lowRate });
    const high = simulate({ ...inputs, annualGrowthRate: highRate });
    return { low, high };
  }, [showMonteCarlo, volatility, inputs]);

  const inflationNum = useMemo(
    () => (parseFloat(inflationRate) || 0) / 100,
    [inflationRate]
  );

  /* Display values — nominal or real */
  const display = useMemo(() => {
    if (!showReal || inflationNum === 0) {
      return {
        finalValue: result.finalValue,
        totalContributed: result.totalContributed,
        totalGrowth: result.totalGrowth,
        totalLifeEvents: result.totalLifeEvents,
        effectiveCAGR: result.effectiveCAGR,
        growthMultiple: result.growthMultiple,
        contributionPeriodEndValue: result.contributionPeriodEndValue,
        finalMonthlyContribution: result.finalMonthlyContribution,
      };
    }
    const totalDeflator = Math.pow(1 + inflationNum, totalYears);
    const contribEndDeflator = Math.pow(
      1 + inflationNum,
      inputs.contributionYears
    );
    const realFinal = result.finalValue / totalDeflator;

    let realContributed = inputs.initialBalance;
    for (const p of result.projections) {
      realContributed += p.contributions / Math.pow(1 + inflationNum, p.year);
      realContributed += p.lifeEventImpact / Math.pow(1 + inflationNum, p.year);
    }
    const realGrowth = realFinal - realContributed;
    const realCAGR =
      inputs.initialBalance > 0 && totalYears > 0
        ? (Math.pow(realFinal / inputs.initialBalance, 1 / totalYears) - 1) *
          100
        : 0;

    const realLifeEvents = realContributed - inputs.initialBalance -
      result.projections.reduce((sum, p) => sum + p.contributions / Math.pow(1 + inflationNum, p.year), 0);

    return {
      finalValue: realFinal,
      totalContributed: realContributed,
      totalGrowth: realGrowth,
      totalLifeEvents: realLifeEvents,
      effectiveCAGR: realCAGR,
      growthMultiple: realContributed > 0 ? realFinal / realContributed : 0,
      contributionPeriodEndValue:
        result.contributionPeriodEndValue / contribEndDeflator,
      finalMonthlyContribution:
        result.finalMonthlyContribution /
        Math.pow(1 + inflationNum, inputs.contributionYears),
    };
  }, [showReal, inflationNum, result, inputs, totalYears]);

  const growthPct =
    display.finalValue > 0
      ? ((display.totalGrowth / display.finalValue) * 100).toFixed(0)
      : "0";

  /* Chart data — 3-layer stacked area + per-year bars */
  const chartData = useMemo(() => {
    return result.projections.map((p, idx) => {
      const deflator = showReal ? Math.pow(1 + inflationNum, p.year) : 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const point: Record<string, any> = {
        age: inputs.currentAge + p.year - 1,
        year: p.year,
        principal: Math.round(inputs.initialBalance / deflator),
        // Include cumulative life events in contributions area so stack sums to endingBalance
        contributions: Math.round(
          (p.cumulativeContributions - inputs.initialBalance + p.cumulativeLifeEvents) / deflator
        ),
        growth: Math.round(p.cumulativeGrowth / deflator),
        yearContributions: Math.round(p.contributions / deflator),
        yearGrowth: Math.round(p.growth / deflator),
        lifeEventImpact: p.lifeEventImpact,
        hasEvents: p.lifeEvents.length > 0,
        eventNames: p.lifeEvents.map((e) => `${e.type === "income" ? "+" : "-"}${e.name}`).join(", "),
      };
      pinnedScenarios.forEach((s, si) => {
        const sp = s.result.projections[idx];
        if (sp) {
          point[`scenario_${si}`] = Math.round(sp.endingBalance / deflator);
        }
      });
      if (monteCarloResults) {
        const lowP = monteCarloResults.low.projections[idx];
        const highP = monteCarloResults.high.projections[idx];
        if (lowP) point.p10 = Math.round(lowP.endingBalance / deflator);
        if (highP) point.p90 = Math.round(highP.endingBalance / deflator);
        if (lowP && highP) point.band = Math.round((highP.endingBalance - lowP.endingBalance) / deflator);
      }
      return point;
    });
  }, [
    result.projections,
    inputs.currentAge,
    inputs.initialBalance,
    showReal,
    inflationNum,
    pinnedScenarios,
    monteCarloResults,
  ]);

  /* X-axis ticks — every 5 years (age-based) */
  const ageTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const first = chartData[0].age;
    const last = chartData[chartData.length - 1].age;
    const ticks: number[] = [];
    const start = Math.ceil(first / 5) * 5;
    for (let a = start; a <= last; a += 5) ticks.push(a);
    if (ticks.length === 0 || ticks[ticks.length - 1] !== last)
      ticks.push(last);
    return ticks;
  }, [chartData]);

  /* Inflection year — when annual growth > annual contributions */
  const inflectionAge = useMemo(() => {
    const p = chartData.find(
      (d) => d.yearGrowth > d.yearContributions && d.yearContributions > 0
    );
    return p?.age;
  }, [chartData]);

  /* Table rows */
  const tableRows = useMemo(() => {
    if (!summarized) return result.projections;
    return result.projections.filter(
      (p) =>
        p.year % 5 === 0 ||
        p.year === totalYears ||
        p.year === inputs.contributionYears
    );
  }, [result.projections, summarized, totalYears, inputs.contributionYears]);

  /* Scenario pinning */
  const pinScenario = useCallback(() => {
    if (pinnedScenarios.length >= MAX_SCENARIOS) return;
    setPinnedScenarios((prev) => [
      ...prev,
      {
        id: Date.now(),
        label: `${formatPercent(inputs.annualGrowthRate, 0)} · ${currencySymbol}${inputs.monthlyContribution}/mo`,
        result,
      },
    ]);
  }, [
    inputs.annualGrowthRate,
    inputs.monthlyContribution,
    result,
    pinnedScenarios.length,
    currencySymbol,
  ]);

  const unpinScenario = useCallback((id: number) => {
    setPinnedScenarios((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /* ─── Render ───────────────────────────────────── */

  const barInterval =
    totalYears <= 20 ? 1 : totalYears <= 30 ? 2 : totalYears <= 40 ? 3 : 4;

  return (
    <ToolShell>
      <ToolToolbar title="Investment Simulator" icon="TrendingUp">
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
              <Input
                label="Current Age"
                suffix="yrs"
                type="number"
                value={formValues.currentAge}
                onChange={(e) =>
                  handleFieldChange("currentAge", e.target.value)
                }
                min={1}
                max={120}
                step={1}
              />
              <MoneyInput
                label="Starting Balance"
                prefix={currencySymbol}
                value={formValues.initialBalance}
                onChange={(e) =>
                  handleFieldChange("initialBalance", e.target.value)
                }
                min={0}
                locale={currencyLocale}
              />
              <Input
                label="Annual Growth Rate"
                suffix="%"
                type="number"
                value={formValues.annualGrowthRate}
                onChange={(e) =>
                  handleFieldChange("annualGrowthRate", e.target.value)
                }
                min={0}
                max={100}
                step={0.5}
              />
              {/* Investment Timeline — two stacked sub-inputs */}
              <div className="flex flex-col gap-1.5">
                <label className="block text-[12px] font-medium text-t2">
                  Investment Timeline
                </label>
                <div className="flex flex-col gap-1">
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[11px] text-t3 pointer-events-none whitespace-nowrap">
                      Contribute
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formValues.contributionYears}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*$/.test(val)) {
                          handleFieldChange("contributionYears", val);
                        }
                      }}
                      className="w-full pl-[78px] pr-8 py-2.5 md:py-[7px] rounded-[7px] text-base md:text-[13px] font-sans bg-surface border border-border text-t1 placeholder:text-[var(--color-text-placeholder)] outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)]"
                    />
                    <span className="absolute right-3 text-[13px] text-t3 pointer-events-none">
                      yrs
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-[11px] text-t3 pointer-events-none whitespace-nowrap">
                      Then grow
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formValues.growthOnlyYears}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*$/.test(val)) {
                          handleFieldChange("growthOnlyYears", val);
                        }
                      }}
                      className="w-full pl-[78px] pr-8 py-2.5 md:py-[7px] rounded-[7px] text-base md:text-[13px] font-sans bg-surface border border-border text-t1 placeholder:text-[var(--color-text-placeholder)] outline-none transition-all duration-[150ms] focus:border-[var(--color-blue)] focus:shadow-[0_0_0_3px_var(--color-blue-dim)]"
                    />
                    <span className="absolute right-3 text-[13px] text-t3 pointer-events-none">
                      yrs
                    </span>
                  </div>
                </div>
              </div>
              <MoneyInput
                label="Monthly Contribution"
                prefix={currencySymbol}
                value={formValues.monthlyContribution}
                onChange={(e) =>
                  handleFieldChange("monthlyContribution", e.target.value)
                }
                min={0}
                locale={currencyLocale}
              />
              <Input
                label="Annual Increase"
                suffix="%"
                type="number"
                value={formValues.annualContributionIncrease}
                onChange={(e) =>
                  handleFieldChange(
                    "annualContributionIncrease",
                    e.target.value
                  )
                }
                min={0}
                max={50}
                step={0.5}
              />
            </div>
          </ToolCard>

          {/* ─── Investment Events ─────────────────── */}
          <InvestmentEventsCard
            events={lifeEvents}
            onAdd={handleAddEvent}
            onDelete={handleDeleteEvent}
            currentAge={inputs.currentAge}
            totalYears={totalYears}
            formatAmount={fmt}
            currencyPrefix={currencySymbol}
            locale={currencyLocale}
          />

          {/* ─── Summary Stats ─────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            <StatDisplay
              label={`Value · Age ${contributionEndAge}`}
              value={fmtCompact(display.contributionPeriodEndValue)}
              subLabel={
                inputs.growthOnlyYears > 0
                  ? "When contributions stop"
                  : undefined
              }
            />
            <StatDisplay
              label={`Final Value · Age ${finalAge}`}
              value={fmtCompact(display.finalValue)}
              subLabel={
                showReal
                  ? currency === "INR"
                    ? "in today's rupees"
                    : "in today's Canadian dollars"
                  : undefined
              }
            />
            <StatDisplay
              label="Total Invested"
              value={fmtCompact(display.totalContributed)}
              subLabel={
                display.totalLifeEvents !== 0
                  ? `incl. ${display.totalLifeEvents > 0 ? "+" : ""}${fmtCompact(display.totalLifeEvents)} events`
                  : `Final monthly: ${fmt(display.finalMonthlyContribution)}`
              }
            />
            <StatDisplay
              label="Total Growth"
              value={fmtCompact(display.totalGrowth)}
              subLabel={`${growthPct}% of portfolio`}
              valueClassName="text-[var(--color-green)]"
            />
            <div title="Effective CAGR measures how fast the initial balance would need to grow to reach the final portfolio value. It appears higher than the market rate because regular contributions increase the compounding base over time.">
              <StatDisplay
                label="Effective CAGR"
                value={formatPercent(display.effectiveCAGR)}
                subLabel={`vs ${formatPercent(inputs.annualGrowthRate)} market rate · boosted by contributions`}
              />
            </div>
            <StatDisplay
              label="Growth Multiple"
              value={`${display.growthMultiple.toFixed(1)}x`}
              subLabel={`on ${fmtCompact(display.totalContributed)} invested`}
            />
          </div>

          {/* ─── Stacked Area Chart ────────────────── */}
          <ToolCard>
            {/* Controls row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-medium text-t2">
                  Growth Over Time
                </span>
                {/* Nominal / Real toggle */}
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
                {showReal && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-t3">Inflation</span>
                    <input
                      type="number"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      className="w-12 px-1.5 py-0.5 rounded-[5px] text-[11px] font-mono bg-surface border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
                      min={0}
                      max={20}
                      step={0.5}
                    />
                    <span className="text-[11px] text-t3">%</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowMonteCarlo((s) => !s)}
                  className={`px-2.5 py-1.5 md:px-2 md:py-0.5 rounded-[5px] text-[11px] font-medium border transition-all ${
                    showMonteCarlo
                      ? "bg-[var(--color-purple-dim)] text-[var(--color-purple)] border-[var(--color-purple)]"
                      : "text-t3 hover:text-t1 hover:bg-hover border-border"
                  }`}
                >
                  Monte Carlo
                </button>
                {showMonteCarlo && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-t3">Vol</span>
                    <input
                      type="number"
                      value={volatility}
                      onChange={(e) => setVolatility(e.target.value)}
                      className="w-12 px-1.5 py-0.5 rounded-[5px] text-[11px] font-mono bg-surface border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
                      min={1}
                      max={50}
                      step={1}
                    />
                    <span className="text-[11px] text-t3">%</span>
                  </div>
                )}
                <button
                  onClick={pinScenario}
                  disabled={pinnedScenarios.length >= MAX_SCENARIOS}
                  className="px-2.5 py-1.5 md:px-2 md:py-0.5 rounded-[5px] text-[11px] font-medium text-t3 hover:text-t1 hover:bg-hover border border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Pin Current
                </button>
                {pinnedScenarios.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{
                      color: SCENARIO_COLORS[i],
                      borderColor: SCENARIO_COLORS[i],
                    }}
                  >
                    {s.label}
                    <button
                      onClick={() => unpinScenario(s.id)}
                      className="hover:opacity-70"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-2">
              <ChartLegend
                items={[
                  { color: "var(--color-teal)", label: "Principal" },
                  { color: "var(--color-blue)", label: "Contributions" },
                  { color: "var(--color-green)", label: "Growth" },
                  ...(inputs.growthOnlyYears > 0
                    ? [{ color: "var(--color-text-tertiary)", label: "Contributions end", type: "dashed-line" as const }]
                    : []),
                  ...(showMonteCarlo
                    ? [{ color: "var(--color-purple)", label: "80% confidence range", type: "square" as const }]
                    : []),
                  ...pinnedScenarios.map((s, i) => ({
                    color: SCENARIO_COLORS[i],
                    label: s.label,
                    type: "dashed-line" as const,
                  })),
                ]}
              />
            </div>

            {/* Chart */}
            <RechartsViewport height={320}>
                <ComposedChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    ticks={ageTicks}
                    tick={{
                      fontSize: 10,
                      fontFamily: "var(--font-jetbrains)",
                    }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    label={{ value: "Age", position: "insideBottomRight", offset: -5, style: { fontSize: 10, fill: "var(--color-text-tertiary)", fontFamily: "var(--font-jetbrains)" } }}
                  />
                  <YAxis
                    domain={[0, "auto"]}
                    tick={{
                      fontSize: 10,
                      fontFamily: "var(--font-jetbrains)",
                    }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    tickFormatter={getYAxisTickFormatter(currency)}
                    label={{ value: currency === "INR" ? "₹" : "C$", position: "insideTopLeft", offset: -5, style: { fontSize: 10, fill: "var(--color-text-tertiary)", fontFamily: "var(--font-jetbrains)" } }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      const total =
                        d.principal + d.contributions + d.growth;
                      const phase =
                        d.year <= inputs.contributionYears
                          ? "Contributing"
                          : "Growth only";
                      return (
                        <ChartTooltipShell active={active}>
                          <div className="text-t3 text-[11px] mb-1.5">
                            Age {d.age} · Year {d.year} · {phase}
                          </div>
                          <div className="text-t1 font-medium text-[14px] mb-2">
                            {fmt(total)}
                            {showReal && (
                              <span className="text-t3 text-[10px] ml-1">
                                today&apos;s {currencySymbol}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-green)]">
                                Growth
                              </span>
                              <span className="text-t1">
                                {fmt(d.growth)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">
                                Contributions
                              </span>
                              <span className="text-t1">
                                {fmt(d.contributions)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-teal)]">
                                Principal
                              </span>
                              <span className="text-t1">
                                {fmt(d.principal)}
                              </span>
                            </div>
                          </div>
                          {d.hasEvents && (
                            <div className="mt-2 pt-2 border-t border-border text-[11px]">
                              <div className="flex justify-between gap-6">
                                <span className={d.lifeEventImpact >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}>
                                  {d.eventNames}
                                </span>
                                <span className={`font-mono font-medium ${d.lifeEventImpact >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                                  {d.lifeEventImpact >= 0 ? "+" : ""}{fmt(d.lifeEventImpact)}
                                </span>
                              </div>
                            </div>
                          )}
                          {pinnedScenarios.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-2 pt-2 border-t border-border text-[11px]">
                              {pinnedScenarios.map((s, i) => {
                                const val = d[`scenario_${i}`];
                                if (val == null) return null;
                                return (
                                  <div
                                    key={s.id}
                                    className="flex justify-between gap-6"
                                  >
                                    <span
                                      style={{
                                        color: SCENARIO_COLORS[i],
                                      }}
                                    >
                                      {s.label}
                                    </span>
                                    <span className="text-t1">
                                      {fmt(val)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  {/* Contributions-end reference line */}
                  {inputs.growthOnlyYears > 0 && (
                    <ReferenceLine
                      x={contributionEndAge}
                      stroke="var(--color-text-tertiary)"
                      strokeDasharray="4 4"
                      label={{
                        value: `Age ${contributionEndAge}`,
                        position: "top",
                        fill: "var(--color-text-tertiary)",
                        fontSize: 10,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  )}
                  {/* Life event reference lines */}
                  {lifeEvents.map((e) => (
                    <ReferenceLine
                      key={e.id}
                      x={e.age}
                      stroke={e.type === "income" ? "var(--color-green)" : "var(--color-red)"}
                      strokeDasharray="3 3"
                      strokeOpacity={0.6}
                      label={{
                        value: e.name,
                        position: "insideTopRight",
                        fill: e.type === "income" ? "var(--color-green)" : "var(--color-red)",
                        fontSize: 9,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  ))}
                  {/* Monte Carlo confidence band — p10 as invisible base, band=p90-p10 stacked on top */}
                  {showMonteCarlo && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="p10"
                        stackId="mc"
                        stroke="none"
                        fill="transparent"
                        fillOpacity={0}
                      />
                      <Area
                        type="monotone"
                        dataKey="band"
                        stackId="mc"
                        stroke="none"
                        fill="var(--color-purple-dim)"
                        fillOpacity={0.5}
                      />
                    </>
                  )}
                  {/* Stacked areas: principal (bottom) → contributions → growth (top) */}
                  <Area
                    type="monotone"
                    dataKey="principal"
                    stackId="1"
                    stroke="var(--color-teal)"
                    fill="var(--color-teal-dim)"
                    strokeWidth={1}
                  />
                  <Area
                    type="monotone"
                    dataKey="contributions"
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
                  {/* Pinned scenario overlays */}
                  {pinnedScenarios.map((s, i) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={`scenario_${i}`}
                      stroke={SCENARIO_COLORS[i]}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                    />
                  ))}
                </ComposedChart>
            </RechartsViewport>
          </ToolCard>

          {/* ─── Annual Breakdown Bar Chart ─────────── */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Annual Breakdown
              </span>
              <ChartLegend
                items={[
                  { color: "var(--color-blue)", label: "Contributions" },
                  { color: "var(--color-green)", label: "Growth" },
                ]}
              />
            </div>
            <RechartsViewport height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="age"
                    tick={{
                      fontSize: 10,
                      fontFamily: "var(--font-jetbrains)",
                    }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    interval={barInterval}
                    label={{ value: "Age", position: "insideBottomRight", offset: -5, style: { fontSize: 10, fill: "var(--color-text-tertiary)", fontFamily: "var(--font-jetbrains)" } }}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fontFamily: "var(--font-jetbrains)",
                    }}
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
                              <span className="text-[var(--color-green)]">
                                Growth
                              </span>
                              <span className="text-t1">
                                {fmt(d.yearGrowth)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">
                                Contributions
                              </span>
                              <span className="text-t1">
                                {fmt(d.yearContributions)}
                              </span>
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
                  {/* Inflection point — growth exceeds contributions */}
                  {inflectionAge && (
                    <ReferenceLine
                      x={inflectionAge}
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
                  {/* Contributions-end reference line on bar chart */}
                  {inputs.growthOnlyYears > 0 && (
                    <ReferenceLine
                      x={contributionEndAge}
                      stroke="var(--color-text-tertiary)"
                      strokeDasharray="4 4"
                      label={{
                        value: `Age ${contributionEndAge}`,
                        position: "top",
                        fill: "var(--color-text-tertiary)",
                        fontSize: 10,
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
                Every 5 years
              </button>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-s2">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium text-t3 text-[11px]">
                      Year
                    </th>
                    <th className="text-left py-2 px-4 font-medium text-t3 text-[11px]">
                      Age
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">
                      Starting
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">
                      Contributions
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">
                      Growth
                    </th>
                    {lifeEvents.length > 0 && (
                      <th className="text-right py-2 px-4 font-medium text-t3 text-[11px]">
                        Events
                      </th>
                    )}
                    <th className="text-right py-2 pl-4 font-medium text-t3 text-[11px]">
                      Ending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((p, i) => {
                    const showDivider =
                      inputs.growthOnlyYears > 0 &&
                      !p.isContributionPhase &&
                      (i === 0 || tableRows[i - 1].isContributionPhase);
                    const colSpan = lifeEvents.length > 0 ? 7 : 6;

                    return (
                      <Fragment key={p.year}>
                        {showDivider && (
                          <tr>
                            <td colSpan={colSpan} className="py-2">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 border-t border-dashed border-border" />
                                <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-t3">
                                  Growth only
                                </span>
                                <div className="flex-1 border-t border-dashed border-border" />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`border-b border-border last:border-b-0 transition-all duration-[120ms] hover:bg-surface even:bg-surface/50 ${
                            !p.isContributionPhase ? "opacity-75" : ""
                          }`}
                        >
                          <td className="py-2 pr-4 font-mono text-t2">
                            {p.year}
                          </td>
                          <td className="py-2 px-4 font-mono text-t2">
                            {inputs.currentAge + p.year - 1}
                          </td>
                          <td className="py-2 px-4 font-mono text-t1 text-right">
                            {fmt(p.startingBalance)}
                          </td>
                          <td className="py-2 px-4 font-mono text-[var(--color-blue)] text-right">
                            {fmt(p.contributions)}
                          </td>
                          <td className="py-2 px-4 font-mono text-[var(--color-green)] text-right">
                            {fmt(p.growth)}
                          </td>
                          {lifeEvents.length > 0 && (
                            <td className={`py-2 px-4 font-mono text-right ${
                              p.lifeEventImpact > 0
                                ? "text-[var(--color-green)]"
                                : p.lifeEventImpact < 0
                                ? "text-[var(--color-red)]"
                                : "text-t3"
                            }`}>
                              {p.lifeEventImpact !== 0
                                ? `${p.lifeEventImpact > 0 ? "+" : ""}${fmt(p.lifeEventImpact)}`
                                : "—"}
                            </td>
                          )}
                          <td className="py-2 pl-4 font-mono text-t1 font-medium text-right">
                            {fmt(p.endingBalance)}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-s2 border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="py-2 pr-4 font-mono text-t2 font-semibold text-[11px]">
                      TOTAL
                    </td>
                    <td className="py-2 px-4 font-mono text-[var(--color-blue)] text-right font-semibold">
                      {fmt(display.totalContributed)}
                    </td>
                    <td className="py-2 px-4 font-mono text-[var(--color-green)] text-right font-semibold">
                      {fmt(display.totalGrowth)}
                    </td>
                    {lifeEvents.length > 0 && (
                      <td className={`py-2 px-4 font-mono text-right font-semibold ${
                        display.totalLifeEvents > 0
                          ? "text-[var(--color-green)]"
                          : display.totalLifeEvents < 0
                          ? "text-[var(--color-red)]"
                          : "text-t2"
                      }`}>
                        {display.totalLifeEvents !== 0
                          ? `${display.totalLifeEvents > 0 ? "+" : ""}${fmt(display.totalLifeEvents)}`
                          : "—"}
                      </td>
                    )}
                    <td className="py-2 pl-4 font-mono text-t1 text-right font-semibold">
                      {fmt(display.finalValue)}
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
            {inputs.growthOnlyYears > 0
              ? `${inputs.contributionYears}yr contribute + ${inputs.growthOnlyYears}yr grow`
              : `${inputs.contributionYears} year projection`}
            {" · "}
            {fmt(display.finalValue)} final value
            {showReal ? " (real)" : ""}
          </span>
        }
        right={<span>Cmd+Enter to reset defaults</span>}
      />
    </ToolShell>
  );
}
