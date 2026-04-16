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
  ReferenceLine,
} from "recharts";
import { RotateCcw, BookOpen, X, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

import { ToolShell } from "@/components/shell/ToolShell";
import { ToolToolbar } from "@/components/shell/ToolToolbar";
import { ToolStatusBar } from "@/components/shell/ToolStatusBar";
import { ToolCard } from "@/components/ui/ToolCard";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { StatDisplay } from "@/components/ui/StatDisplay";
import { Button } from "@/components/ui/Button";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatCAD, formatCompactCAD, formatINR, formatCompactINR, getYAxisTickFormatter, type Currency } from "@/lib/finance/format";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { ChartTooltipShell } from "@/components/ui/ChartTooltipShell";
import { ChartLegend } from "@/components/ui/ChartLegend";
import { RechartsViewport } from "@/components/ui/RechartsViewport";

interface LifeEvent {
  id: string;
  name: string;
  age: number;
  amount: number;
  type: "expense" | "income";
}

interface FormValues {
  currentAge: string;
  investments: string;
  otherFunds: string;
  monthlyPension: string;
  yearsToLast: string;
  inflationRate: string;
  investmentGrowthRate: string;
  withdrawalRate: string;
  monthlyWithdrawal: string;
  lifeEvents: LifeEvent[];
}

const DEFAULTS: FormValues = {
  currentAge: "55",
  investments: "600000",
  otherFunds: "100000",
  monthlyPension: "2000",
  yearsToLast: "30",
  inflationRate: "5",
  investmentGrowthRate: "8",
  withdrawalRate: "4",
  monthlyWithdrawal: "0",
  lifeEvents: [],
};

interface YearProjection {
  year: number;
  age: number;
  startingBalance: number;
  investmentGrowth: number;
  annualPensionIncome: number;
  lifeEventImpact: number;
  lifeEvents: LifeEvent[];
  totalBalance: number;
  annualWithdrawal: number;
  endingBalance: number;
  realValue: number;
}

function parseField(value: string, fallback: number): number {
  if (value === "" || value === "-" || value === ".") return fallback;
  const n = parseFloat(value);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

function simulateRetirement(form: FormValues): YearProjection[] {
  const currentAge = parseField(form.currentAge, 55);
  const investments = parseField(form.investments, 600000);
  const otherFunds = parseField(form.otherFunds, 100000);
  const monthlyPension = parseField(form.monthlyPension, 2000);
  const yearsToLast = parseField(form.yearsToLast, 30);
  const inflationRate = parseField(form.inflationRate, 5) / 100;
  const investmentGrowthRate = parseField(form.investmentGrowthRate, 8) / 100;
  const withdrawalRate = parseField(form.withdrawalRate, 4) / 100;
  const monthlyWithdrawal = parseField(form.monthlyWithdrawal, 0);
  const lifeEvents = form.lifeEvents || [];

  const projections: YearProjection[] = [];
  let balance = investments + otherFunds;
  const baseAnnualPension = monthlyPension * 12;
  const baseAnnualWithdrawal = monthlyWithdrawal > 0 ? monthlyWithdrawal * 12 : 0;

  for (let year = 1; year <= yearsToLast; year++) {
    const age = currentAge + year - 1;
    const startingBalance = balance;
    
    const investmentGrowth = startingBalance * investmentGrowthRate;
    
    // Pension income inflates each year (compounded from year 1)
    const annualPensionIncome = baseAnnualPension * Math.pow(1 + inflationRate, year - 1);
    
    // Find life events for this age
    const eventsThisYear = lifeEvents.filter((e) => e.age === age);
    const lifeEventImpact = eventsThisYear.reduce(
      (sum, e) => sum + (e.type === "income" ? e.amount : -e.amount),
      0
    );
    
    const totalBalance = startingBalance + investmentGrowth + annualPensionIncome + lifeEventImpact;
    
    // If monthly withdrawal is set, use it (fixed amount, not inflating)
    // Otherwise use withdrawal rate on starting balance
    const annualWithdrawal = monthlyWithdrawal > 0 
      ? baseAnnualWithdrawal 
      : startingBalance * withdrawalRate;
    
    const endingBalance = Math.max(0, totalBalance - annualWithdrawal);
    
    const realValue = endingBalance / Math.pow(1 + inflationRate, year);

    projections.push({
      year,
      age,
      startingBalance,
      investmentGrowth,
      annualPensionIncome,
      lifeEventImpact,
      lifeEvents: eventsThisYear,
      totalBalance,
      annualWithdrawal,
      endingBalance,
      realValue,
    });

    balance = endingBalance;
    
    if (balance <= 0) break;
  }

  return projections;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-t2 hover:text-t1"
    >
      <span
        className={`w-[30px] h-[16px] rounded-full relative transition-all duration-[120ms] ${
          checked
            ? "bg-[var(--color-blue)]"
            : "bg-surface border border-border"
        }`}
      >
        <span
          className={`absolute top-[2px] w-[12px] h-[12px] rounded-full transition-all duration-[120ms] ${
            checked ? "left-[15px] bg-white" : "left-[2px] bg-t3"
          }`}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

function LifeEventsCard({
  events,
  onAdd,
  onDelete,
  currentAge,
  yearsToLast,
  formatAmount,
  currencyPrefix,
  locale,
}: {
  events: LifeEvent[];
  onAdd: (event: LifeEvent) => void;
  onDelete: (id: string) => void;
  currentAge: number;
  yearsToLast: number;
  formatAmount: (value: number) => string;
  currencyPrefix: string;
  locale: "en-CA" | "en-IN";
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    age: currentAge + 5,
    amount: "",
    type: "expense" as "expense" | "income",
  });

  const maxAge = currentAge + yearsToLast - 1;

  const handleAdd = () => {
    if (!newEvent.name.trim() || !newEvent.amount) return;
    
    const amount = parseFloat(newEvent.amount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) return;

    onAdd({
      id: crypto.randomUUID(),
      name: newEvent.name.trim(),
      age: newEvent.age,
      amount: amount,
      type: newEvent.type,
    });

    setNewEvent({
      name: "",
      age: currentAge + 5,
      amount: "",
      type: "expense",
    });
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
          Life Events
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
                    placeholder="e.g., Child's Wedding"
                    className="w-full px-2.5 py-1.5 rounded-[5px] text-[12px] bg-s2 border border-border text-t1 placeholder:text-t3 outline-none focus:border-[var(--color-blue)]"
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
                    className="w-full px-2.5 py-1.5 rounded-[5px] text-[12px] bg-s2 border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-t3 mb-1">
                    At Age
                  </label>
                  <input
                    type="number"
                    value={newEvent.age}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        age: parseInt(e.target.value) || currentAge,
                      }))
                    }
                    min={currentAge}
                    max={maxAge}
                    className="w-full px-2.5 py-1.5 rounded-[5px] text-[12px] bg-s2 border border-border text-t1 outline-none focus:border-[var(--color-blue)]"
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
                      placeholder="50,000"
                      className="w-full pl-6 pr-2.5 py-1.5 rounded-[5px] text-[12px] bg-s2 border border-border text-t1 placeholder:text-t3 outline-none focus:border-[var(--color-blue)]"
                    />
                  </div>
                </div>
                <div className="col-span-2 flex items-end gap-2">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-3 py-1.5 text-[11px] font-medium text-t2 bg-surface border border-border rounded-[5px] hover:bg-hover transition-all duration-[120ms]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newEvent.name.trim() || !newEvent.amount}
                    className="flex-1 px-3 py-1.5 text-[11px] font-medium text-white bg-[var(--color-blue)] rounded-[5px] hover:opacity-90 transition-all duration-[120ms] disabled:opacity-50 disabled:cursor-not-allowed"
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
                No life events added. Add events like education expenses, weddings, 
                property sales, or inheritances to see their impact on your retirement.
              </p>
            )
          )}
        </div>
      )}
    </ToolCard>
  );
}

export default function RetirementSimulatorPage() {
  const [savedInputs, setSavedInputs] = useLocalStorage<FormValues>(
    "helm:retirement-simulator:v4",
    DEFAULTS
  );
  const [formValues, setFormValues] = useState<FormValues>(() => DEFAULTS);
  const [summarized, setSummarized] = useState(true);
  const [currency, setCurrency] = useLocalStorage<Currency>("helm:retirement-simulator:currency", "CAD");
  const [showPanel, setShowPanel] = useState(false);

  const fmt = useCallback((value: number) => {
    return currency === "INR" ? formatINR(value) : formatCAD(value);
  }, [currency]);

  const fmtCompact = useCallback((value: number) => {
    return currency === "INR" ? formatCompactINR(value) : formatCompactCAD(value);
  }, [currency]);

  const currencySymbol = currency === "INR" ? "₹" : "$";
  const currencyPrefix = currency === "INR" ? "₹" : "$";

  useEffect(() => {
    setFormValues(savedInputs);
  }, [savedInputs]);

  const handleFieldChange = useCallback(
    <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
      setFormValues((prev) => {
        const next = { ...prev, [field]: value };
        setSavedInputs(next);
        return next;
      });
    },
    [setSavedInputs]
  );

  const resetDefaults = useCallback(() => {
    setSavedInputs(DEFAULTS);
  }, [setSavedInputs]);

  const handleAddLifeEvent = useCallback(
    (event: LifeEvent) => {
      setFormValues((prev) => {
        const next = { ...prev, lifeEvents: [...(prev.lifeEvents || []), event] };
        setSavedInputs(next);
        return next;
      });
    },
    [setSavedInputs]
  );

  const handleDeleteLifeEvent = useCallback(
    (id: string) => {
      setFormValues((prev) => {
        const next = { ...prev, lifeEvents: (prev.lifeEvents || []).filter((e) => e.id !== id) };
        setSavedInputs(next);
        return next;
      });
    },
    [setSavedInputs]
  );

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

  const projections = useMemo(() => simulateRetirement(formValues), [formValues]);

  const chartData = useMemo(() => {
    return projections.map((p) => ({
      age: p.age,
      year: p.year,
      balance: Math.round(p.endingBalance),
      realValue: Math.round(p.realValue),
    }));
  }, [projections]);

  const ageTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const first = chartData[0].age;
    const last = chartData[chartData.length - 1].age;
    const ticks: number[] = [];
    const start = Math.ceil(first / 5) * 5;
    for (let a = start; a <= last; a += 5) ticks.push(a);
    if (ticks.length === 0 || ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartData]);

  const annualBreakdownData = useMemo(() => {
    return projections.map((p) => ({
      age: p.age,
      year: p.year,
      investmentGrowth: Math.round(p.investmentGrowth),
      pensionIncome: Math.round(p.annualPensionIncome),
      lifeEventsPos: Math.round(Math.max(0, p.lifeEventImpact)),
      lifeEventsNeg: Math.round(Math.min(0, p.lifeEventImpact)),
      withdrawal: Math.round(-p.annualWithdrawal),
    }));
  }, [projections]);

  const tableRows = useMemo(() => {
    if (!summarized) return projections;
    return projections.filter(
      (p) =>
        p.age % 5 === 0 ||
        p.year === 1 ||
        p.year === projections.length
    );
  }, [projections, summarized]);

  const totalInitialFunds = parseField(formValues.investments, 0) + parseField(formValues.otherFunds, 0);
  const finalBalance = projections.length > 0 ? projections[projections.length - 1].endingBalance : 0;
  const finalRealValue = projections.length > 0 ? projections[projections.length - 1].realValue : 0;
  const fundsDepleted = finalBalance <= 0;
  const depletionYear = projections.find(p => p.endingBalance <= 0)?.year;
  const yearsMoneyLasts = depletionYear ? depletionYear : parseField(formValues.yearsToLast, 30);

  const withdrawalMode = parseField(formValues.monthlyWithdrawal, 0) > 0 
    ? `${fmtCompact(parseField(formValues.monthlyWithdrawal, 0) * 12)}/yr fixed` 
    : `${formValues.withdrawalRate}% rate`;

  return (
    <ToolShell>
      <ToolToolbar title="Retirement Simulator" icon="Wallet">
        <CurrencyToggle value={currency} onChange={setCurrency} />
        <Button variant="subtle" onClick={() => setShowPanel((s) => !s)}>
          <BookOpen size={12} />
          {showPanel ? "Hide" : "Guide"}
        </Button>
        <Button variant="subtle" onClick={resetDefaults}>
          <RotateCcw size={12} />
          Reset
        </Button>
      </ToolToolbar>

      <div className="flex-1 flex overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-5">
        <div className="flex flex-col gap-5">
          {/* Inputs */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider text-t3 font-medium">
                Inputs
              </span>
              <span className="text-[12px] font-mono text-t2">
                Total Funds: {fmtCompact(totalInitialFunds)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <Input
                label="Current Age"
                suffix="yrs"
                type="number"
                value={formValues.currentAge}
                onChange={(e) => handleFieldChange("currentAge", e.target.value)}
                min={18}
                max={100}
              />
              <MoneyInput
                label="Investments"
                prefix={currencyPrefix}
                value={formValues.investments}
                onChange={(e) => handleFieldChange("investments", e.target.value)}
                locale={currency === "INR" ? "en-IN" : "en-CA"}
                min={0}
              />
              <MoneyInput
                label="Other Funds"
                prefix={currencyPrefix}
                value={formValues.otherFunds}
                onChange={(e) => handleFieldChange("otherFunds", e.target.value)}
                locale={currency === "INR" ? "en-IN" : "en-CA"}
                min={0}
              />
              <MoneyInput
                label="Monthly Pension"
                prefix={currencyPrefix}
                value={formValues.monthlyPension}
                onChange={(e) => handleFieldChange("monthlyPension", e.target.value)}
                locale={currency === "INR" ? "en-IN" : "en-CA"}
                min={0}
              />
              <Input
                label="Years to Last"
                suffix="yrs"
                type="number"
                value={formValues.yearsToLast}
                onChange={(e) => handleFieldChange("yearsToLast", e.target.value)}
                min={1}
                max={100}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
              <Input
                label="Annual Inflation Rate"
                suffix="%"
                type="number"
                value={formValues.inflationRate}
                onChange={(e) => handleFieldChange("inflationRate", e.target.value)}
                min={0}
                max={20}
                step={0.5}
              />
              <Input
                label="Investment Growth Rate"
                suffix="%"
                type="number"
                value={formValues.investmentGrowthRate}
                onChange={(e) => handleFieldChange("investmentGrowthRate", e.target.value)}
                min={0}
                max={30}
                step={0.5}
              />
              <Input
                label="Withdrawal Rate"
                suffix="%"
                type="number"
                value={formValues.withdrawalRate}
                onChange={(e) => handleFieldChange("withdrawalRate", e.target.value)}
                min={0}
                max={20}
                step={0.5}
              />
              <MoneyInput
                label="Monthly Withdrawal"
                prefix={currencyPrefix}
                value={formValues.monthlyWithdrawal}
                onChange={(e) => handleFieldChange("monthlyWithdrawal", e.target.value)}
                locale={currency === "INR" ? "en-IN" : "en-CA"}
                min={0}
              />
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-t3">Active withdrawal mode:</span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    parseField(formValues.monthlyWithdrawal, 0) > 0
                      ? "bg-[var(--color-blue-dim)] text-[var(--color-blue)]"
                      : "bg-surface text-t2 border border-border"
                  }`}
                >
                  {parseField(formValues.monthlyWithdrawal, 0) > 0
                    ? `Fixed ${fmtCompact(parseField(formValues.monthlyWithdrawal, 0) * 12)}/yr`
                    : `Rate-based ${formValues.withdrawalRate}%`}
                </span>
                {parseField(formValues.monthlyWithdrawal, 0) > 0 && (
                  <span className="text-[10px] text-t3">· Monthly Withdrawal overrides Withdrawal Rate</span>
                )}
              </div>
              <p className="text-[11px] text-t3">
                Inflation rate also applies to pension income (compounded annually). For a fixed pension, set inflation to 0.
              </p>
            </div>
          </ToolCard>

          {/* Life Events */}
          <LifeEventsCard
            events={formValues.lifeEvents || []}
            onAdd={handleAddLifeEvent}
            onDelete={handleDeleteLifeEvent}
            currentAge={parseField(formValues.currentAge, 55)}
            yearsToLast={parseField(formValues.yearsToLast, 30)}
            formatAmount={fmt}
            currencyPrefix={currencyPrefix}
            locale={currency === "INR" ? "en-IN" : "en-CA"}
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatDisplay
              label="Years Funded"
              value={`${yearsMoneyLasts}`}
              subLabel={
                fundsDepleted
                  ? `Runs out in year ${depletionYear}`
                  : `Through ${formValues.yearsToLast} years`
              }
              valueClassName={
                fundsDepleted
                  ? "text-[var(--color-red)]"
                  : "text-[var(--color-green)]"
              }
            />
            <StatDisplay
              label="Starting Funds"
              value={fmtCompact(totalInitialFunds)}
              subLabel={`At age ${formValues.currentAge}`}
            />
            <StatDisplay
              label="Final Balance"
              value={fmtCompact(Math.max(0, finalBalance))}
              subLabel={`At age ${parseField(formValues.currentAge, 55) + parseField(formValues.yearsToLast, 30) - 1}`}
              valueClassName={
                finalBalance > 0
                  ? "text-[var(--color-green)]"
                  : "text-[var(--color-red)]"
              }
            />
            <StatDisplay
              label="Final Real Value"
              value={fmtCompact(Math.max(0, finalRealValue))}
              subLabel={
                currency === "INR" ? "In today's rupees" : "In today's Canadian dollars"
              }
              valueClassName={
                finalRealValue > 0
                  ? "text-[var(--color-teal)]"
                  : "text-[var(--color-red)]"
              }
            />
          </div>

          {/* Balance Chart */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Balance Over Time
              </span>
              <div className="flex items-center gap-3">
                {(() => {
                  const growthRate = parseField(formValues.investmentGrowthRate, 8);
                  const inflation = parseField(formValues.inflationRate, 5);
                  const realReturn = growthRate - inflation;
                  const wdRate = parseField(formValues.monthlyWithdrawal, 0) > 0
                    ? (parseField(formValues.monthlyWithdrawal, 0) * 12 / Math.max(totalInitialFunds, 1)) * 100
                    : parseField(formValues.withdrawalRate, 4);
                  const sustainable = wdRate <= realReturn;
                  return (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      sustainable
                        ? "bg-[var(--color-green-dim)] text-[var(--color-green)]"
                        : "bg-[var(--color-orange-dim)] text-[var(--color-orange)]"
                    }`}>
                      {sustainable ? "Sustainable" : "Drawdown risk"} · {wdRate.toFixed(1)}% withdrawal vs {realReturn.toFixed(1)}% real return
                    </span>
                  );
                })()}
                <ChartLegend
                  items={[
                    { color: "var(--color-blue)", label: "Nominal Balance" },
                    { color: "var(--color-teal)", label: `Real Value (Today's ${currencySymbol})`, type: "dashed-line" },
                  ]}
                />
              </div>
            </div>
            <RechartsViewport height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    ticks={ageTicks}
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
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
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">Balance</span>
                              <span className="text-t1">{fmt(d.balance)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-teal)]">Real Value</span>
                              <span className="text-t1">{fmt(d.realValue)}</span>
                            </div>
                          </div>
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  {depletionYear && (
                    <ReferenceLine
                      x={parseField(formValues.currentAge, 55) + depletionYear - 1}
                      stroke="var(--color-red)"
                      strokeDasharray="4 4"
                      label={{
                        value: "Funds depleted",
                        position: "top",
                        fill: "var(--color-red)",
                        fontSize: 10,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  )}
                  {(formValues.lifeEvents || []).map((event) => (
                    <ReferenceLine
                      key={event.id}
                      x={event.age}
                      stroke={event.type === "expense" ? "var(--color-orange)" : "var(--color-green)"}
                      strokeDasharray="3 3"
                      label={{
                        value: event.name,
                        position: "insideTopRight",
                        fill: event.type === "expense" ? "var(--color-orange)" : "var(--color-green)",
                        fontSize: 9,
                        fontFamily: "var(--font-jetbrains)",
                      }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--color-blue)"
                    fill="var(--color-blue-dim)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="realValue"
                    stroke="var(--color-teal)"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 3"
                  />
                </ComposedChart>
            </RechartsViewport>
          </ToolCard>

          {/* Annual Breakdown */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Annual Breakdown
              </span>
              <ChartLegend
                items={[
                  { color: "var(--color-green)", label: "Growth" },
                  { color: "var(--color-blue)", label: "Pension" },
                  { color: "var(--color-purple)", label: "Life Events" },
                  { color: "var(--color-orange)", label: "Withdrawals" },
                ]}
              />
            </div>
            <RechartsViewport height={220}>
                <BarChart data={annualBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="age"
                    tick={{ fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    stroke="var(--color-text-tertiary)"
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    interval={Math.max(0, Math.ceil(annualBreakdownData.length / 10) - 1)}
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
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-green)]">Growth</span>
                              <span className="text-t1">{fmt(d.investmentGrowth)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-blue)]">Pension</span>
                              <span className="text-t1">{fmt(d.pensionIncome)}</span>
                            </div>
                            {(d.lifeEventsPos > 0 || d.lifeEventsNeg < 0) && (
                              <div className="flex justify-between gap-6">
                                <span className="text-[var(--color-purple)]">Life Events</span>
                                <span className="text-t1">{fmt(d.lifeEventsPos + d.lifeEventsNeg)}</span>
                              </div>
                            )}
                            <div className="flex justify-between gap-6">
                              <span className="text-[var(--color-orange)]">Withdrawals</span>
                              <span className="text-t1">{fmt(d.withdrawal)}</span>
                            </div>
                          </div>
                        </ChartTooltipShell>
                      );
                    }}
                  />
                  <Bar dataKey="investmentGrowth" stackId="pos" fill="var(--color-green)" fillOpacity={0.7} />
                  <Bar dataKey="pensionIncome" stackId="pos" fill="var(--color-blue)" fillOpacity={0.7} />
                  <Bar dataKey="lifeEventsPos" stackId="pos" fill="var(--color-purple)" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="lifeEventsNeg" stackId="neg" fill="var(--color-purple)" fillOpacity={0.7} />
                  <Bar dataKey="withdrawal" stackId="neg" fill="var(--color-orange)" fillOpacity={0.7} radius={[0, 0, 2, 2]} />
                </BarChart>
            </RechartsViewport>
          </ToolCard>

          {/* Year-by-Year Table */}
          <ToolCard>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-t2">
                Year-by-Year Projection
              </span>
              <Toggle checked={summarized} onChange={setSummarized} label="Every 5 years" />
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-s2">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-medium text-t3 text-[11px]">Year</th>
                    <th className="text-left py-2 px-3 font-medium text-t3 text-[11px]">Age</th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Starting Balance</th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Investment Growth</th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Annual Pension Income</th>
                    {(formValues.lifeEvents || []).length > 0 && (
                      <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Life Events</th>
                    )}
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Total Balance</th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Annual Withdrawal</th>
                    <th className="text-right py-2 px-3 font-medium text-t3 text-[11px]">Ending Balance</th>
                    <th className="text-right py-2 pl-3 font-medium text-t3 text-[11px]">Real Value (Today&apos;s {currencySymbol})</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((p) => {
                    const hasLifeEvents = p.lifeEvents && p.lifeEvents.length > 0;
                    return (
                      <tr
                        key={p.year}
                        className={`border-b border-border last:border-b-0 transition-all duration-[120ms] hover:bg-surface ${
                          p.endingBalance <= 0
                            ? "bg-[var(--color-red-dim)]"
                            : hasLifeEvents
                              ? p.lifeEventImpact >= 0
                                ? "bg-[var(--color-green-dim)]/50"
                                : "bg-[var(--color-orange-dim)]/50"
                              : "even:bg-surface/50"
                        }`}
                      >
                        <td className="py-2 pr-3 font-mono text-t2">{p.year}</td>
                        <td className="py-2 px-3 font-mono text-t2">
                          {p.age}
                          {hasLifeEvents && (
                            <span className="ml-1 text-[9px] text-[var(--color-purple)]">●</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-t1 text-right">
                          {fmt(p.startingBalance)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[var(--color-green)] text-right">
                          {fmt(p.investmentGrowth)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[var(--color-blue)] text-right">
                          {fmt(p.annualPensionIncome)}
                        </td>
                        {(formValues.lifeEvents || []).length > 0 && (
                          <td className="py-2 px-3 font-mono text-right">
                            {hasLifeEvents ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {p.lifeEvents.map((event) => (
                                  <span
                                    key={event.id}
                                    className={`text-[10px] ${
                                      event.type === "expense"
                                        ? "text-[var(--color-orange)]"
                                        : "text-[var(--color-green)]"
                                    }`}
                                    title={event.name}
                                  >
                                    {event.type === "expense" ? "-" : "+"}
                                    {fmt(event.amount)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-t3">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-2 px-3 font-mono text-t1 text-right">
                          {fmt(p.totalBalance)}
                        </td>
                        <td className="py-2 px-3 font-mono text-[var(--color-orange)] text-right">
                          {fmt(p.annualWithdrawal)}
                        </td>
                        <td
                          className={`py-2 px-3 font-mono font-medium text-right ${
                            p.endingBalance > 0 ? "text-t1" : "text-[var(--color-red)]"
                          }`}
                        >
                          {fmt(p.endingBalance)}
                        </td>
                        <td className="py-2 pl-3 font-mono text-[var(--color-teal)] text-right">
                          {fmt(p.realValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-s2 border-t-2 border-border">
                  <tr>
                    <td colSpan={2} className="py-2 pr-3 font-mono text-t2 font-semibold text-[11px]">
                      TOTAL
                    </td>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 font-mono text-[var(--color-green)] text-right font-semibold">
                      {fmt(projections.reduce((s, p) => s + p.investmentGrowth, 0))}
                    </td>
                    <td className="py-2 px-3 font-mono text-[var(--color-blue)] text-right font-semibold">
                      {fmt(projections.reduce((s, p) => s + p.annualPensionIncome, 0))}
                    </td>
                    {(formValues.lifeEvents || []).length > 0 && (
                      <td className="py-2 px-3 font-mono text-[var(--color-purple)] text-right font-semibold">
                        {fmt(projections.reduce((s, p) => s + p.lifeEventImpact, 0))}
                      </td>
                    )}
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 font-mono text-[var(--color-orange)] text-right font-semibold">
                      {fmt(projections.reduce((s, p) => s + p.annualWithdrawal, 0))}
                    </td>
                    <td className="py-2 px-3 font-mono text-t1 text-right font-semibold">
                      {fmt(projections.length > 0 ? projections[projections.length - 1].endingBalance : 0)}
                    </td>
                    <td className="py-2 pl-3 font-mono text-[var(--color-teal)] text-right font-semibold">
                      {fmt(projections.length > 0 ? projections[projections.length - 1].realValue : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ToolCard>
        </div>
      </div>

      {/* Definitions & Assumptions Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto w-full md:w-[360px] shrink-0 border-l border-border bg-surface overflow-y-auto">
          <div className="p-4 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-t1">
                Definitions &amp; Guide
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1 rounded-[5px] hover:bg-hover transition-all duration-[120ms]"
              >
                <X size={14} className="text-t3" />
              </button>
            </div>

            {/* How It Works */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                How The Simulation Works
              </span>
              <div className="flex flex-col gap-1.5 text-[12px] text-t2">
                <p>
                  This simulator projects your retirement funds year-by-year, accounting for
                  investment growth, pension income, life events, withdrawals, and inflation.
                </p>
                <div className="bg-s2 rounded-[7px] p-2.5 font-mono text-[11px] text-t1 mt-1">
                  <div>Starting Balance</div>
                  <div className="text-[var(--color-green)]">+ Investment Growth</div>
                  <div className="text-[var(--color-blue)]">+ Annual Pension Income</div>
                  <div className="text-[var(--color-purple)]">± Life Events</div>
                  <div className="text-t3">= Total Balance</div>
                  <div className="text-[var(--color-orange)]">− Annual Withdrawal</div>
                  <div className="border-t border-border mt-1 pt-1 font-medium">= Ending Balance</div>
                </div>
              </div>
            </div>

            {/* Life Events */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Life Events
              </span>
              <div className="flex flex-col gap-1.5 text-[12px] text-t2">
                <p>
                  Life events are significant one-time financial changes that occur at specific ages
                  during your retirement.
                </p>
                <div className="flex flex-col gap-1.5 text-[11px] mt-1">
                  <div>
                    <span className="font-medium text-[var(--color-orange)]">Expenses</span>
                    <span className="text-t3"> — Large withdrawals like education costs, weddings, 
                    medical emergencies, home renovations, or major purchases.</span>
                  </div>
                  <div>
                    <span className="font-medium text-[var(--color-green)]">Income</span>
                    <span className="text-t3"> — One-time additions like inheritance, property sale, 
                    insurance maturity, or gifts received.</span>
                  </div>
                </div>
                <p className="text-[11px] text-t3 mt-1">
                  Events are applied at the specified age and affect the Total Balance for that year.
                  They appear as vertical markers on the chart and highlighted rows in the table.
                </p>
              </div>
            </div>

            {/* Input Definitions */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Input Definitions
              </span>
              <div className="flex flex-col gap-2 text-[11px]">
                <div>
                  <span className="font-medium text-t1">Investments</span>
                  <p className="text-t3 mt-0.5">
                    Your total invested assets (stocks, bonds, mutual funds, retirement accounts like RRSP/401k/NPS).
                    This is the primary corpus that will grow and be drawn down.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Other Funds</span>
                  <p className="text-t3 mt-0.5">
                    Additional liquid assets like savings accounts, fixed deposits, or cash reserves.
                    Combined with Investments to form your total starting balance.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Monthly Pension</span>
                  <p className="text-t3 mt-0.5">
                    Regular pension income you expect to receive (government pension, employer pension, annuity payments).
                    This amount <strong>increases each year</strong> at the inflation rate to maintain purchasing power.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Years to Last</span>
                  <p className="text-t3 mt-0.5">
                    How many years you want your funds to last. Typically calculated as 
                    (life expectancy − current age). For a 55-year-old planning to age 85, this would be 30 years.
                  </p>
                </div>
              </div>
            </div>

            {/* Rate Definitions */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Rate Definitions
              </span>
              <div className="flex flex-col gap-2 text-[11px]">
                <div>
                  <span className="font-medium text-t1">Annual Inflation Rate</span>
                  <p className="text-t3 mt-0.5">
                    Expected average annual inflation. Used for two purposes:
                  </p>
                  <ul className="list-disc pl-4 mt-1 text-t3">
                    <li>Increases pension income each year (pension keeps pace with inflation)</li>
                    <li>Calculates Real Value (what your future balance is worth in today&apos;s money)</li>
                  </ul>
                </div>
                <div>
                  <span className="font-medium text-t1">Investment Growth Rate</span>
                  <p className="text-t3 mt-0.5">
                    Expected annual return on your investments. Applied to the starting balance each year.
                    Typical long-term stock market returns average 7-10% nominal, 4-7% real (after inflation).
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Withdrawal Rate</span>
                  <p className="text-t3 mt-0.5">
                    Percentage of your <strong>starting balance</strong> withdrawn each year for living expenses.
                    The &quot;4% rule&quot; is a common guideline — withdraw 4% annually for a high probability 
                    your funds last 30 years.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Monthly Withdrawal</span>
                  <p className="text-t3 mt-0.5">
                    If set {">"} 0, this <strong>fixed amount</strong> is withdrawn annually instead of using the
                    withdrawal rate percentage. Useful if you have a specific monthly budget in mind.
                    Note: This amount does NOT inflate — you withdraw the same nominal amount each year.
                  </p>
                </div>
              </div>
            </div>

            {/* Output Definitions */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Output Columns Explained
              </span>
              <div className="flex flex-col gap-2 text-[11px]">
                <div>
                  <span className="font-medium text-t1">Starting Balance</span>
                  <p className="text-t3 mt-0.5">
                    Balance at the beginning of the year (= previous year&apos;s ending balance).
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[var(--color-green)]">Investment Growth</span>
                  <p className="text-t3 mt-0.5">
                    Starting Balance × Investment Growth Rate. The return earned on your investments this year.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[var(--color-blue)]">Annual Pension Income</span>
                  <p className="text-t3 mt-0.5">
                    Monthly Pension × 12, adjusted for inflation since year 1. Grows each year to maintain purchasing power.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Total Balance</span>
                  <p className="text-t3 mt-0.5">
                    Starting Balance + Investment Growth + Annual Pension Income. Total available before withdrawals.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[var(--color-orange)]">Annual Withdrawal</span>
                  <p className="text-t3 mt-0.5">
                    Amount withdrawn for living expenses. Either (Monthly Withdrawal × 12) if set, 
                    or (Starting Balance × Withdrawal Rate).
                  </p>
                </div>
                <div>
                  <span className="font-medium text-t1">Ending Balance</span>
                  <p className="text-t3 mt-0.5">
                    Total Balance − Annual Withdrawal. What remains at year end, becoming next year&apos;s starting balance.
                  </p>
                </div>
                <div>
                  <span className="font-medium text-[var(--color-teal)]">Real Value (Today&apos;s {currencySymbol})</span>
                  <p className="text-t3 mt-0.5">
                    Ending Balance discounted back to today&apos;s purchasing power using inflation.
                    Formula: Ending Balance ÷ (1 + Inflation Rate)^Year.
                    Shows what your future balance would be worth if you had it today.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Assumptions */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Model Assumptions
              </span>
              <ul className="list-disc pl-4 flex flex-col gap-1 text-[11px] text-t3">
                <li>
                  Investment returns are applied as a <strong>constant annual rate</strong> — 
                  no market volatility or sequence-of-returns risk is modeled.
                </li>
                <li>
                  Pension income <strong>grows with inflation</strong> each year to maintain real purchasing power.
                </li>
                <li>
                  If using Withdrawal Rate %, the withdrawal amount <strong>changes each year</strong> 
                  based on the current starting balance.
                </li>
                <li>
                  If using Monthly Withdrawal, the amount stays <strong>fixed in nominal terms</strong> — 
                  it does not adjust for inflation.
                </li>
                <li>
                  No taxes, fees, or transaction costs are modeled. Returns are assumed to be net.
                </li>
                <li>
                  Once funds are depleted (Ending Balance = 0), the simulation stops.
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div>
              <span className="text-[10px] font-medium text-t3 uppercase tracking-wider mb-2 block">
                Planning Tips
              </span>
              <ul className="list-disc pl-4 flex flex-col gap-1 text-[11px] text-t3">
                <li>
                  <strong>4% Rule:</strong> Withdrawing 4% annually has historically given a 95%+ chance
                  of funds lasting 30 years. Consider 3-3.5% for more safety margin.
                </li>
                <li>
                  <strong>Real vs Nominal:</strong> Focus on Real Value to understand actual purchasing power.
                  A growing nominal balance may still lose value in real terms if inflation is high.
                </li>
                <li>
                  <strong>Growth vs Inflation:</strong> The gap between Investment Growth Rate and Inflation Rate
                  determines real growth. If they&apos;re equal, your real purchasing power stays flat.
                </li>
                <li>
                  <strong>Stress Test:</strong> Try higher inflation (7-8%) or lower returns (4-5%) to see 
                  how your plan holds up in adverse conditions.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      </div>

      <ToolStatusBar
        left={
          <span>
            Age {formValues.currentAge} · {formValues.investmentGrowthRate}% growth · {formValues.inflationRate}% inflation · {withdrawalMode}
          </span>
        }
        right={<span>Cmd+Enter to reset</span>}
      />
    </ToolShell>
  );
}
