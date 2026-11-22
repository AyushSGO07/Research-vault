import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: "#FFFFFF",
        bgSecondary: "#F7F8FA",
        bgSidebar: "#FAFBFC",
        textPrimary: "#202733",
        textSecondary: "#697586",
        textMuted: "#98A2B3",
        accent: "#315EAB",
        accentHover: "#244B91",
        borderNeutral: "#E6E9EF",
        statusSuccess: "#25845B",
        statusWarning: "#C58A32",
        statusError: "#C44747",
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Verdana", "sans-serif"],
        meta: ["Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
