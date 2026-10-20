/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#13201a",
        muted: "#56635c",
        paper: "#f5f6f2",
        line: "#dfe4dc",
        brand: { 50: "#e4f1ea", 100: "#cfe3d7", 600: "#146b47", 800: "#0b3f2a", 900: "#0b2a1d" },
        flame: { 50: "#fbe7e4", 600: "#c8372d", 800: "#8e241c" },
      },
    },
  },
  plugins: [],
};
