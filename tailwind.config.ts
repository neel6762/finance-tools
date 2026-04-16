import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        app: "var(--color-bg-app)",
        shell: "var(--color-bg-shell)",
        content: "var(--color-bg-content)",
        surface: "var(--color-bg-surface)",
        s2: "var(--color-bg-surface-2)",
        hover: "var(--color-bg-hover)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        t1: "var(--color-text-primary)",
        t2: "var(--color-text-secondary)",
        t3: "var(--color-text-tertiary)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
