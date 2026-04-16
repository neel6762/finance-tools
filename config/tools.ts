export interface Tool {
  slug: string;
  label: string;
  icon: string;
  description: string;
}

export const TOOLS: Tool[] = [
  {
    slug: "investment-simulator",
    label: "Investment Simulator",
    icon: "TrendingUp",
    description: "Compound growth projections with contributions",
  },
  {
    slug: "mortgage-simulator",
    label: "Mortgage Simulator",
    icon: "Home",
    description: "Canadian mortgage calculator with fixed vs variable comparison",
  },
  {
    slug: "retirement-simulator",
    label: "Retirement Simulator",
    icon: "Wallet",
    description: "Simulate retirement withdrawals and fund longevity",
  },
  {
    slug: "goal-planner",
    label: "Goal Planner",
    icon: "Target",
    description: "Calculate investments needed to reach financial goals",
  },
];
