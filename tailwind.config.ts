import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#2f2f2f",
        muted: "#707070",
        line: "#d9d9d9",
        panel: "#efefef"
      },
      fontFamily: {
        sans: ["PingFang SC", "Microsoft YaHei", "Helvetica Neue", "sans-serif"]
      },
      boxShadow: {
        card: "0 10px 30px rgba(0, 0, 0, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
