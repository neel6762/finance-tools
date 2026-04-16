/**
 * Goal-Based Investment Planner
 *
 * Answers: "How much do I need to invest monthly to reach my target amount by my target age?"
 */

export interface GoalPlannerInputs {
  targetAmount: number;
  currentAge: number;
  targetAge: number;
  expectedReturn: number; // annual % (e.g., 8 for 8%)
  startingCapital: number;
  stepUpPercent: number; // annual increase in SIP (e.g., 5 for 5%)
  inflationRate: number; // for real value calculations
}

export interface YearlyProjection {
  year: number;
  age: number;
  startingBalance: number;
  monthlyContribution: number;
  yearContributions: number;
  yearGrowth: number;
  endingBalance: number;
  cumulativeContributions: number;
  cumulativeGrowth: number;
  realValue: number; // inflation-adjusted
}

export interface ScenarioResult {
  label: string;
  rate: number;
  requiredMonthly: number;
  finalValue: number;
}

export interface GoalPlannerResult {
  // Primary answer
  requiredMonthly: number;
  
  // Summary stats
  yearsToGoal: number;
  finalValue: number;
  totalInvested: number;
  totalReturns: number;
  wealthGain: number; // finalValue - totalInvested
  finalMonthlyContribution: number; // after step-ups

  // Projections
  projections: YearlyProjection[];

  // Scenario comparison (conservative, base, optimistic)
  scenarios: ScenarioResult[];
}

/**
 * Calculate Future Value of a lump sum
 * FV = P × (1 + r)^n
 */
function futureValueLumpSum(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (years <= 0) return principal;
  return principal * Math.pow(1 + annualRate, years);
}

/**
 * Calculate Future Value with step-up SIP
 * Each year, the monthly contribution increases by stepUpPercent
 */
function futureValueStepUpSIP(
  initialMonthly: number,
  annualRate: number,
  years: number,
  stepUpPercent: number
): number {
  if (years <= 0 || initialMonthly <= 0) return 0;

  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  let totalFV = 0;
  let currentMonthly = initialMonthly;

  for (let year = 1; year <= years; year++) {
    const yearsRemaining = years - year + 1;
    const monthsRemaining = yearsRemaining * 12;

    for (let month = 1; month <= 12; month++) {
      const monthsToCompound = monthsRemaining - month + 12;
      totalFV += currentMonthly * Math.pow(1 + monthlyRate, monthsToCompound);
    }

    currentMonthly *= 1 + stepUpPercent / 100;
  }

  return totalFV;
}

/**
 * Calculate required monthly investment to reach target
 * Solves: Target = LumpSumFV + SIPFV for PMT
 */
function solveForMonthly(
  target: number,
  startingCapital: number,
  annualRate: number,
  years: number,
  stepUpPercent: number
): number {
  if (years <= 0) return 0;

  const lumpSumFV = futureValueLumpSum(startingCapital, annualRate, years);
  const remainingTarget = target - lumpSumFV;

  if (remainingTarget <= 0) return 0;

  // Binary search for the required monthly (works with or without step-up)
  let low = 0;
  let high = remainingTarget;
  const tolerance = 0.01;

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const fv = futureValueStepUpSIP(mid, annualRate, years, stepUpPercent);
    if (fv < remainingTarget) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Generate year-by-year projections
 */
function generateProjections(
  startingCapital: number,
  monthlyInvestment: number,
  annualRate: number,
  years: number,
  stepUpPercent: number,
  inflationRate: number,
  currentAge: number
): YearlyProjection[] {
  const projections: YearlyProjection[] = [];
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

  let balance = startingCapital;
  let currentMonthly = monthlyInvestment;
  let cumulativeContributions = startingCapital;
  let cumulativeGrowth = 0;

  for (let year = 1; year <= years; year++) {
    const startingBalance = balance;
    let yearContributions = 0;
    let yearGrowth = 0;

    for (let month = 1; month <= 12; month++) {
      const monthGrowth = balance * monthlyRate;
      yearGrowth += monthGrowth;
      balance += monthGrowth + currentMonthly;
      yearContributions += currentMonthly;
    }

    cumulativeContributions += yearContributions;
    cumulativeGrowth += yearGrowth;

    const inflationDeflator = Math.pow(1 + inflationRate / 100, year);
    const realValue = balance / inflationDeflator;

    projections.push({
      year,
      age: currentAge + year,
      startingBalance,
      monthlyContribution: currentMonthly,
      yearContributions,
      yearGrowth,
      endingBalance: balance,
      cumulativeContributions,
      cumulativeGrowth,
      realValue,
    });

    currentMonthly *= 1 + stepUpPercent / 100;
  }

  return projections;
}

/**
 * Generate scenario comparisons at different return rates
 */
function generateScenarios(
  target: number,
  startingCapital: number,
  years: number,
  stepUpPercent: number,
  baseRate: number
): ScenarioResult[] {
  const rates = [
    { label: "Conservative", rate: Math.max(baseRate - 2, 4) },
    { label: "Base Case", rate: baseRate },
    { label: "Optimistic", rate: baseRate + 2 },
  ];

  return rates.map(({ label, rate }) => {
    const rateDecimal = rate / 100;
    const requiredMonthly = solveForMonthly(
      target,
      startingCapital,
      rateDecimal,
      years,
      stepUpPercent
    );
    const lumpSumFV = futureValueLumpSum(startingCapital, rateDecimal, years);
    const sipFV = futureValueStepUpSIP(requiredMonthly, rateDecimal, years, stepUpPercent);

    return {
      label,
      rate,
      requiredMonthly,
      finalValue: lumpSumFV + sipFV,
    };
  });
}

/**
 * Main calculation function
 */
export function calculateGoalPlan(inputs: GoalPlannerInputs): GoalPlannerResult {
  const {
    targetAmount,
    currentAge,
    targetAge,
    expectedReturn,
    startingCapital,
    stepUpPercent,
    inflationRate,
  } = inputs;

  const yearsToGoal = Math.max(targetAge - currentAge, 1);
  const annualRate = expectedReturn / 100;

  // Solve for required monthly investment
  const requiredMonthly = solveForMonthly(
    targetAmount,
    startingCapital,
    annualRate,
    yearsToGoal,
    stepUpPercent
  );

  // Generate projections
  const projections = generateProjections(
    startingCapital,
    requiredMonthly,
    annualRate,
    yearsToGoal,
    stepUpPercent,
    inflationRate,
    currentAge
  );

  const lastProjection = projections[projections.length - 1];
  const finalValue = lastProjection?.endingBalance ?? startingCapital;
  const totalInvested = lastProjection?.cumulativeContributions ?? startingCapital;
  const totalReturns = lastProjection?.cumulativeGrowth ?? 0;
  const wealthGain = finalValue - totalInvested;
  const finalMonthlyContribution = lastProjection?.monthlyContribution ?? requiredMonthly;

  // Generate scenarios
  const scenarios = generateScenarios(
    targetAmount,
    startingCapital,
    yearsToGoal,
    stepUpPercent,
    expectedReturn
  );

  return {
    requiredMonthly,
    yearsToGoal,
    finalValue,
    totalInvested,
    totalReturns,
    wealthGain,
    finalMonthlyContribution,
    projections,
    scenarios,
  };
}

/**
 * Preset return rates by risk profile
 */
export const RETURN_PRESETS = {
  conservative: 6,
  moderate: 8,
  aggressive: 12,
};
