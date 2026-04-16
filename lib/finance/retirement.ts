export type RiskLevel = "conservative" | "balanced" | "aggressive";

export interface PersonalTimeline {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
}

export interface RetirementWealth {
  cash: number;
  investments: number;
  retirementAccounts: number;
  lumpSum: number;
}

export interface InvestmentAssumptions {
  expectedReturn: number;
  riskLevel: RiskLevel;
}

export interface PropertyAssets {
  enabled: boolean;
  primaryResidenceValue: number;
  mortgageRemaining: number;
  rentalPropertyValue: number;
  annualRentalIncome: number;
  appreciationRate: number;
  sellDuringRetirement: boolean;
  sellYear: number;
}

export interface SpendingNeeds {
  annualSpending: number;
  essentialPortion: number;
  healthcareCosts: number;
  oneTimeExpenses: number;
}

export interface InflationSettings {
  enabled: boolean;
  generalRate: number;
  healthcareRate: number;
}

export interface GuaranteedIncome {
  governmentPension: number;
  employerPension: number;
  otherIncome: number;
  incomeStartAge: number;
}

export interface ScenarioControls {
  marketCrash: boolean;
  liveLonger: boolean;
  highInflation: boolean;
}

export interface RetirementInputs {
  timeline: PersonalTimeline;
  wealth: RetirementWealth;
  investment: InvestmentAssumptions;
  property: PropertyAssets;
  spending: SpendingNeeds;
  inflation: InflationSettings;
  income: GuaranteedIncome;
  scenarios: ScenarioControls;
}

export interface YearProjection {
  age: number;
  year: number;
  guaranteedIncome: number;
  rentalIncome: number;
  totalIncome: number;
  livingExpenses: number;
  healthcareExpenses: number;
  totalExpenses: number;
  withdrawalNeeded: number;
  investmentValue: number;
  cashValue: number;
  propertyEquity: number;
  netWorth: number;
  fundsDepleted: boolean;
}

export interface RetirementResult {
  projections: YearProjection[];
  totalRetirementAssets: number;
  yearsMoneyLasts: number;
  fundsDepleted: boolean;
  depletionAge: number | null;
  totalLifetimeIncome: number;
  totalLifetimeExpenses: number;
  finalNetWorth: number;
}

export interface MonteCarloResult {
  successProbability: number;
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  iterations: number;
}

export type ReadinessStatus = "prepared" | "caution" | "insufficient";

export interface ReadinessScore {
  status: ReadinessStatus;
  probability: number;
  label: string;
}

export interface Recommendation {
  id: string;
  type: "spending" | "timing" | "investment" | "property" | "income";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export interface RiskIndicator {
  id: string;
  label: string;
  triggered: boolean;
  description: string;
}

const RISK_PARAMS: Record<RiskLevel, { mean: number; stdDev: number }> = {
  conservative: { mean: 0.05, stdDev: 0.08 },
  balanced: { mean: 0.06, stdDev: 0.12 },
  aggressive: { mean: 0.075, stdDev: 0.18 },
};

function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function simulateRetirement(inputs: RetirementInputs): RetirementResult {
  const {
    timeline,
    wealth,
    investment,
    property,
    spending,
    inflation,
    income,
    scenarios,
  } = inputs;

  const effectiveLifeExpectancy = scenarios.liveLonger
    ? timeline.lifeExpectancy + 5
    : timeline.lifeExpectancy;
  const totalYears = effectiveLifeExpectancy - timeline.retirementAge;

  const baseInflation = scenarios.highInflation
    ? (inflation.enabled ? inflation.generalRate : 2.5) + 2
    : inflation.enabled
      ? inflation.generalRate
      : 0;
  const healthcareInflation = scenarios.highInflation
    ? (inflation.enabled ? inflation.healthcareRate : 4) + 2
    : inflation.enabled
      ? inflation.healthcareRate
      : 0;

  let investmentValue =
    wealth.investments + wealth.retirementAccounts + wealth.lumpSum;
  let cashValue = wealth.cash;
  let primaryResidenceValue = property.enabled ? property.primaryResidenceValue : 0;
  let rentalPropertyValue = property.enabled ? property.rentalPropertyValue : 0;
  let mortgageRemaining = property.enabled ? property.mortgageRemaining : 0;

  const totalRetirementAssets =
    investmentValue +
    cashValue +
    (property.enabled
      ? primaryResidenceValue + rentalPropertyValue - mortgageRemaining
      : 0);

  const projections: YearProjection[] = [];
  let fundsDepleted = false;
  let depletionAge: number | null = null;
  let totalLifetimeIncome = 0;
  let totalLifetimeExpenses = 0;
  let oneTimeExpensesRemaining = spending.oneTimeExpenses;

  for (let year = 1; year <= totalYears; year++) {
    const age = timeline.retirementAge + year - 1;
    const yearsFromStart = year - 1;

    const pensionActive = age >= income.incomeStartAge;
    const guaranteedIncome = pensionActive
      ? income.governmentPension + income.employerPension + income.otherIncome
      : 0;

    let rentalIncome = 0;
    if (property.enabled && rentalPropertyValue > 0) {
      rentalIncome =
        property.annualRentalIncome *
        Math.pow(1 + baseInflation / 100, yearsFromStart);
    }

    const totalIncome = guaranteedIncome + rentalIncome;

    const livingExpenses =
      spending.annualSpending * Math.pow(1 + baseInflation / 100, yearsFromStart);
    const healthcareExpenses =
      spending.healthcareCosts *
      Math.pow(1 + healthcareInflation / 100, yearsFromStart);

    let oneTimeThisYear = 0;
    if (year <= 5 && oneTimeExpensesRemaining > 0) {
      oneTimeThisYear = Math.min(
        oneTimeExpensesRemaining,
        spending.oneTimeExpenses / 5
      );
      oneTimeExpensesRemaining -= oneTimeThisYear;
    }

    const totalExpenses = livingExpenses + healthcareExpenses + oneTimeThisYear;

    totalLifetimeIncome += totalIncome;
    totalLifetimeExpenses += totalExpenses;

    const withdrawalNeeded = Math.max(0, totalExpenses - totalIncome);

    if (
      property.enabled &&
      property.sellDuringRetirement &&
      year === property.sellYear - timeline.retirementAge + 1
    ) {
      const saleProceeds =
        (primaryResidenceValue + rentalPropertyValue - mortgageRemaining) *
        Math.pow(1 + property.appreciationRate / 100, yearsFromStart);
      cashValue += saleProceeds;
      primaryResidenceValue = 0;
      rentalPropertyValue = 0;
      mortgageRemaining = 0;
    }

    if (withdrawalNeeded > 0) {
      if (cashValue >= withdrawalNeeded) {
        cashValue -= withdrawalNeeded;
      } else {
        const fromCash = cashValue;
        cashValue = 0;
        const fromInvestments = withdrawalNeeded - fromCash;
        if (investmentValue >= fromInvestments) {
          investmentValue -= fromInvestments;
        } else {
          investmentValue = 0;
          if (!fundsDepleted) {
            fundsDepleted = true;
            depletionAge = age;
          }
        }
      }
    }

    let returnRate = investment.expectedReturn / 100;
    if (scenarios.marketCrash && year >= 3 && year <= 5) {
      returnRate = -0.15;
    }

    investmentValue *= 1 + returnRate;

    if (property.enabled) {
      primaryResidenceValue *= 1 + property.appreciationRate / 100;
      rentalPropertyValue *= 1 + property.appreciationRate / 100;
    }

    const propertyEquity =
      primaryResidenceValue + rentalPropertyValue - mortgageRemaining;
    const netWorth = investmentValue + cashValue + propertyEquity;

    projections.push({
      age,
      year,
      guaranteedIncome,
      rentalIncome,
      totalIncome,
      livingExpenses,
      healthcareExpenses,
      totalExpenses,
      withdrawalNeeded,
      investmentValue,
      cashValue,
      propertyEquity,
      netWorth,
      fundsDepleted: fundsDepleted && age >= (depletionAge || 0),
    });
  }

  const yearsMoneyLasts = fundsDepleted
    ? (depletionAge || timeline.retirementAge) - timeline.retirementAge
    : totalYears;

  const finalProjection = projections[projections.length - 1];
  const finalNetWorth = finalProjection?.netWorth || 0;

  return {
    projections,
    totalRetirementAssets,
    yearsMoneyLasts,
    fundsDepleted,
    depletionAge,
    totalLifetimeIncome,
    totalLifetimeExpenses,
    finalNetWorth,
  };
}

export function runMonteCarloSimulation(
  inputs: RetirementInputs,
  iterations: number = 1000
): MonteCarloResult {
  const { mean, stdDev } = RISK_PARAMS[inputs.investment.riskLevel];
  const finalValues: number[] = [];
  let successCount = 0;

  for (let i = 0; i < iterations; i++) {
    const simulationInputs = { ...inputs };
    const randomReturn = (mean + gaussianRandom() * stdDev) * 100;
    simulationInputs.investment = {
      ...inputs.investment,
      expectedReturn: Math.max(-20, Math.min(30, randomReturn)),
    };

    const result = simulateRetirement(simulationInputs);
    finalValues.push(result.finalNetWorth);

    if (!result.fundsDepleted) {
      successCount++;
    }
  }

  finalValues.sort((a, b) => a - b);

  const getPercentile = (p: number) => {
    const index = Math.floor((p / 100) * finalValues.length);
    return finalValues[Math.min(index, finalValues.length - 1)];
  };

  return {
    successProbability: (successCount / iterations) * 100,
    percentile10: getPercentile(10),
    percentile25: getPercentile(25),
    percentile50: getPercentile(50),
    percentile75: getPercentile(75),
    percentile90: getPercentile(90),
    iterations,
  };
}

export function calculateReadinessScore(
  result: RetirementResult,
  monteCarlo: MonteCarloResult
): ReadinessScore {
  const probability = monteCarlo.successProbability;

  if (probability >= 80) {
    return {
      status: "prepared",
      probability,
      label: "Fully Prepared",
    };
  } else if (probability >= 50) {
    return {
      status: "caution",
      probability,
      label: "Minor Adjustments Needed",
    };
  } else {
    return {
      status: "insufficient",
      probability,
      label: "Savings Likely Insufficient",
    };
  }
}

export function generateRiskIndicators(
  inputs: RetirementInputs,
  result: RetirementResult
): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];

  indicators.push({
    id: "funds-depleted",
    label: "Funds depleted before life expectancy",
    triggered: result.fundsDepleted,
    description: result.depletionAge
      ? `Funds may run out at age ${result.depletionAge}`
      : "Funds projected to last through retirement",
  });

  const investmentReliance =
    result.totalRetirementAssets > 0
      ? ((inputs.wealth.investments + inputs.wealth.retirementAccounts) /
          result.totalRetirementAssets) *
        100
      : 0;
  indicators.push({
    id: "investment-reliance",
    label: "Over-reliance on investment performance",
    triggered: investmentReliance > 70,
    description: `${investmentReliance.toFixed(0)}% of retirement assets are market-dependent`,
  });

  if (inputs.property.enabled) {
    const propertyReliance =
      result.totalRetirementAssets > 0
        ? ((inputs.property.primaryResidenceValue +
            inputs.property.rentalPropertyValue -
            inputs.property.mortgageRemaining) /
            result.totalRetirementAssets) *
          100
        : 0;
    indicators.push({
      id: "property-reliance",
      label: "Heavy dependence on property value",
      triggered: propertyReliance > 50,
      description: `${propertyReliance.toFixed(0)}% of retirement assets are in property`,
    });
  }

  if (inputs.inflation.enabled) {
    const inflationImpact =
      inputs.inflation.generalRate > 3 || inputs.inflation.healthcareRate > 5;
    indicators.push({
      id: "inflation-sensitivity",
      label: "High inflation sensitivity",
      triggered: inflationImpact,
      description: inflationImpact
        ? "High inflation assumptions may significantly impact purchasing power"
        : "Inflation assumptions are within normal ranges",
    });
  }

  const incomeGap =
    inputs.income.governmentPension +
      inputs.income.employerPension +
      inputs.income.otherIncome <
    inputs.spending.annualSpending * 0.4;
  indicators.push({
    id: "income-gap",
    label: "Low guaranteed income coverage",
    triggered: incomeGap,
    description: incomeGap
      ? "Guaranteed income covers less than 40% of annual spending"
      : "Guaranteed income provides reasonable spending coverage",
  });

  return indicators;
}

export function generateRecommendations(
  inputs: RetirementInputs,
  result: RetirementResult,
  monteCarlo: MonteCarloResult
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (result.fundsDepleted) {
    const shortfall =
      (result.depletionAge || inputs.timeline.lifeExpectancy) -
      inputs.timeline.retirementAge;
    const targetYears =
      inputs.timeline.lifeExpectancy - inputs.timeline.retirementAge;
    const yearsShort = targetYears - shortfall;

    recommendations.push({
      id: "delay-retirement",
      type: "timing",
      severity: "critical",
      title: `Delay retirement by ${Math.min(yearsShort, 5)} years`,
      description: `Working ${Math.min(yearsShort, 5)} more years would add to your savings and reduce withdrawal years.`,
    });

    const spendingReduction = Math.round(
      inputs.spending.annualSpending * 0.1
    );
    recommendations.push({
      id: "reduce-spending",
      type: "spending",
      severity: "critical",
      title: `Reduce annual spending by $${spendingReduction.toLocaleString()}`,
      description: `A 10% reduction in spending could significantly extend your funds.`,
    });
  }

  if (monteCarlo.successProbability < 80) {
    if (inputs.investment.riskLevel === "aggressive") {
      recommendations.push({
        id: "reduce-risk",
        type: "investment",
        severity: "warning",
        title: "Consider a more balanced portfolio",
        description:
          "Reducing investment risk may provide more stable retirement income.",
      });
    }

    if (
      inputs.property.enabled &&
      !inputs.property.sellDuringRetirement &&
      inputs.property.primaryResidenceValue > 0
    ) {
      recommendations.push({
        id: "sell-property",
        type: "property",
        severity: "warning",
        title: "Consider selling property for liquidity",
        description:
          "Converting home equity to liquid assets could provide additional retirement funding.",
      });
    }
  }

  if (
    inputs.income.governmentPension +
      inputs.income.employerPension +
      inputs.income.otherIncome <
    inputs.spending.annualSpending * 0.3
  ) {
    recommendations.push({
      id: "increase-guaranteed",
      type: "income",
      severity: "info",
      title: "Increase safe-income investments",
      description:
        "Consider annuities or GICs to boost guaranteed retirement income.",
    });
  }

  if (
    inputs.property.enabled &&
    inputs.property.sellDuringRetirement &&
    inputs.property.sellYear > inputs.timeline.retirementAge + 10
  ) {
    recommendations.push({
      id: "sell-earlier",
      type: "property",
      severity: "info",
      title: "Consider selling property earlier",
      description:
        "Selling property earlier could provide funds when they're most needed.",
    });
  }

  if (recommendations.length === 0 && monteCarlo.successProbability >= 80) {
    recommendations.push({
      id: "on-track",
      type: "investment",
      severity: "info",
      title: "Your retirement plan looks solid",
      description:
        "Continue monitoring and adjusting as your circumstances change.",
    });
  }

  return recommendations;
}
