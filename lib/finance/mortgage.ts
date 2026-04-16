export type PaymentFrequency =
  | "monthly"
  | "semi-monthly"
  | "bi-weekly"
  | "weekly"
  | "accelerated-bi-weekly"
  | "accelerated-weekly";

export interface MortgageInputs {
  homePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  amortizationYears: number;
  paymentFrequency: PaymentFrequency;
}

export interface PaymentRow {
  paymentNumber: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface AmortizationSchedule {
  payment: number;
  totalPayments: number;
  totalInterest: number;
  totalPaid: number;
  effectiveAmortizationYears: number;
  schedule: PaymentRow[];
}

export interface MortgageResult {
  principal: number;
  downPayment: number;
  payment: number;
  totalPayments: number;
  totalInterest: number;
  totalPaid: number;
  effectiveAmortizationYears: number;
  schedule: PaymentRow[];
}

const PAYMENTS_PER_YEAR: Record<PaymentFrequency, number> = {
  monthly: 12,
  "semi-monthly": 24,
  "bi-weekly": 26,
  weekly: 52,
  "accelerated-bi-weekly": 26,
  "accelerated-weekly": 52,
};

/**
 * Convert annual interest rate to periodic rate using Canadian semi-annual compounding.
 * Canadian mortgages compound semi-annually, not monthly like US mortgages.
 *
 * Formula: periodicRate = (1 + annualRate/2)^(2/paymentsPerYear) - 1
 */
function getCanadianPeriodicRate(
  annualRate: number,
  paymentsPerYear: number
): number {
  if (annualRate <= 0) return 0;
  const semiAnnualRate = annualRate / 100 / 2;
  return Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
}

/**
 * Calculate the periodic payment amount using the standard amortization formula.
 */
function calculatePayment(
  principal: number,
  periodicRate: number,
  totalPayments: number
): number {
  if (principal <= 0 || totalPayments <= 0) return 0;
  if (periodicRate === 0) {
    return principal / totalPayments;
  }
  const factor = Math.pow(1 + periodicRate, totalPayments);
  return (principal * periodicRate * factor) / (factor - 1);
}

/**
 * Calculate the monthly payment first, then derive the accelerated payment.
 * Accelerated payments are based on monthly payment divided by frequency factor.
 */
function getAcceleratedPayment(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency
): number {
  const monthlyRate = getCanadianPeriodicRate(annualRate, 12);
  const monthlyPayments = amortizationYears * 12;
  const monthlyPayment = calculatePayment(principal, monthlyRate, monthlyPayments);

  if (frequency === "accelerated-bi-weekly") {
    return monthlyPayment / 2;
  } else if (frequency === "accelerated-weekly") {
    return monthlyPayment / 4;
  }
  return monthlyPayment;
}

/**
 * Generate full amortization schedule for a given rate and payment frequency.
 */
function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency
): AmortizationSchedule {
  // Handle edge case: no principal means no mortgage
  if (principal <= 0 || amortizationYears <= 0) {
    return {
      payment: 0,
      totalPayments: 0,
      totalInterest: 0,
      totalPaid: 0,
      effectiveAmortizationYears: 0,
      schedule: [],
    };
  }

  const paymentsPerYear = PAYMENTS_PER_YEAR[frequency];
  const periodicRate = getCanadianPeriodicRate(annualRate, paymentsPerYear);
  const isAccelerated =
    frequency === "accelerated-bi-weekly" || frequency === "accelerated-weekly";

  let payment: number;
  if (isAccelerated) {
    payment = getAcceleratedPayment(
      principal,
      annualRate,
      amortizationYears,
      frequency
    );
  } else {
    const totalPayments = amortizationYears * paymentsPerYear;
    payment = calculatePayment(principal, periodicRate, totalPayments);
  }

  const schedule: PaymentRow[] = [];
  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  let paymentNumber = 0;

  const maxPayments = amortizationYears * paymentsPerYear * 2;

  while (balance > 0.01 && paymentNumber < maxPayments) {
    paymentNumber++;
    const interestPortion = balance * periodicRate;
    let principalPortion = payment - interestPortion;

    if (principalPortion > balance) {
      principalPortion = balance;
    }

    const actualPayment = principalPortion + interestPortion;
    balance -= principalPortion;
    cumulativePrincipal += principalPortion;
    cumulativeInterest += interestPortion;

    schedule.push({
      paymentNumber,
      payment: actualPayment,
      principal: principalPortion,
      interest: interestPortion,
      balance: Math.max(0, balance),
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  const totalPaymentsCount = schedule.length;
  const totalInterest = cumulativeInterest;
  const totalPaid = cumulativePrincipal + cumulativeInterest;
  const effectiveAmortizationYears = paymentsPerYear > 0 ? totalPaymentsCount / paymentsPerYear : 0;

  return {
    payment,
    totalPayments: totalPaymentsCount,
    totalInterest,
    totalPaid,
    effectiveAmortizationYears,
    schedule,
  };
}

/**
 * Main mortgage calculation function.
 */
export function calculateMortgage(inputs: MortgageInputs): MortgageResult {
  const {
    homePrice,
    downPaymentPercent,
    interestRate,
    amortizationYears,
    paymentFrequency,
  } = inputs;

  const downPayment = homePrice * (downPaymentPercent / 100);
  const principal = homePrice - downPayment;

  const amortization = generateAmortizationSchedule(
    principal,
    interestRate,
    amortizationYears,
    paymentFrequency
  );

  return {
    principal,
    downPayment,
    payment: amortization.payment,
    totalPayments: amortization.totalPayments,
    totalInterest: amortization.totalInterest,
    totalPaid: amortization.totalPaid,
    effectiveAmortizationYears: amortization.effectiveAmortizationYears,
    schedule: amortization.schedule,
  };
}

/**
 * Get the equivalent monthly payment for display purposes.
 */
export function getMonthlyEquivalent(
  payment: number,
  frequency: PaymentFrequency
): number {
  const paymentsPerYear = PAYMENTS_PER_YEAR[frequency];
  return (payment * paymentsPerYear) / 12;
}

/**
 * Get human-readable label for payment frequency.
 */
export function getFrequencyLabel(frequency: PaymentFrequency): string {
  const labels: Record<PaymentFrequency, string> = {
    monthly: "Monthly",
    "semi-monthly": "Semi-Monthly",
    "bi-weekly": "Bi-Weekly",
    weekly: "Weekly",
    "accelerated-bi-weekly": "Accelerated Bi-Weekly",
    "accelerated-weekly": "Accelerated Weekly",
  };
  return labels[frequency];
}

/**
 * Get payments per year for a given frequency.
 */
export function getPaymentsPerYear(frequency: PaymentFrequency): number {
  return PAYMENTS_PER_YEAR[frequency];
}
