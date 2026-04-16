export interface LifeEvent {
  id: string;
  name: string;
  age: number;
  amount: number;
  type: "expense" | "income";
}

export interface SimulatorInputs {
  initialBalance: number;
  annualGrowthRate: number;
  contributionYears: number;
  growthOnlyYears: number;
  monthlyContribution: number;
  annualContributionIncrease: number;
  currentAge?: number;
  lifeEvents?: LifeEvent[];
}

export interface YearProjection {
  year: number;
  startingBalance: number;
  contributions: number;
  growth: number;
  endingBalance: number;
  cumulativeContributions: number;
  cumulativeGrowth: number;
  cumulativeLifeEvents: number;
  isContributionPhase: boolean;
  lifeEventImpact: number;
  lifeEvents: LifeEvent[];
}

export interface SimulatorResult {
  projections: YearProjection[];
  finalValue: number;
  totalContributed: number; // includes net life event impacts
  totalGrowth: number;
  totalLifeEvents: number; // net life event impact (for breakdown display)
  effectiveCAGR: number;
  growthMultiple: number;
  finalMonthlyContribution: number;
  contributionPeriodEndValue: number;
}

export function simulate(inputs: SimulatorInputs): SimulatorResult {
  const {
    initialBalance,
    annualGrowthRate,
    contributionYears,
    growthOnlyYears,
    monthlyContribution,
    annualContributionIncrease,
    currentAge,
    lifeEvents = [],
  } = inputs;

  const totalYears = contributionYears + growthOnlyYears;
  const monthlyRate = Math.pow(1 + annualGrowthRate / 100, 1 / 12) - 1;
  const projections: YearProjection[] = [];

  let balance = initialBalance;
  let currentMonthlyContribution = monthlyContribution;
  let cumulativeContributions = initialBalance;
  let cumulativeGrowth = 0;
  let cumulativeLifeEvents = 0;
  let contributionPeriodEndValue = initialBalance;

  for (let year = 1; year <= totalYears; year++) {
    const startingBalance = balance;
    const isContributionPhase = year <= contributionYears;
    const age = currentAge != null ? currentAge + year - 1 : undefined;
    let yearContributions = 0;
    let yearGrowth = 0;

    for (let month = 1; month <= 12; month++) {
      const monthGrowth = balance * monthlyRate;
      yearGrowth += monthGrowth;
      balance += monthGrowth;

      if (isContributionPhase) {
        balance += currentMonthlyContribution;
        yearContributions += currentMonthlyContribution;
      }
    }

    // Apply life events at end of year
    const eventsThisYear = age != null ? lifeEvents.filter((e) => e.age === age) : [];
    const lifeEventImpact = eventsThisYear.reduce(
      (sum, e) => sum + (e.type === "income" ? e.amount : -e.amount),
      0
    );
    balance += lifeEventImpact;

    cumulativeContributions += yearContributions;
    cumulativeGrowth += yearGrowth;
    cumulativeLifeEvents += lifeEventImpact;

    projections.push({
      year,
      startingBalance,
      contributions: yearContributions,
      growth: yearGrowth,
      endingBalance: balance,
      cumulativeContributions,
      cumulativeGrowth,
      cumulativeLifeEvents,
      isContributionPhase,
      lifeEventImpact,
      lifeEvents: eventsThisYear,
    });

    // Capture portfolio value when contributions stop
    if (year === contributionYears) {
      contributionPeriodEndValue = balance;
    }

    // Apply annual contribution increase only during contribution phase
    if (isContributionPhase) {
      currentMonthlyContribution *= 1 + annualContributionIncrease / 100;
    }
  }

  const finalValue = balance;
  // Include net life events so totalContributed + totalGrowth = finalValue always
  const totalLifeEvents = cumulativeLifeEvents;
  const totalContributed = cumulativeContributions + totalLifeEvents;
  const totalGrowth = finalValue - totalContributed; // == cumulativeGrowth

  // Effective CAGR over total years
  const effectiveCAGR =
    initialBalance > 0 && totalYears > 0
      ? (Math.pow(finalValue / initialBalance, 1 / totalYears) - 1) * 100
      : 0;

  const growthMultiple = totalContributed > 0 ? finalValue / totalContributed : 0;

  // Final monthly contribution based on contribution years
  const finalMonthlyContribution =
    contributionYears > 0
      ? monthlyContribution *
        Math.pow(1 + annualContributionIncrease / 100, contributionYears - 1)
      : monthlyContribution;

  return {
    projections,
    finalValue,
    totalContributed,
    totalGrowth,
    totalLifeEvents,
    effectiveCAGR,
    growthMultiple,
    finalMonthlyContribution,
    contributionPeriodEndValue,
  };
}
