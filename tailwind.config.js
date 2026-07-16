/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- design.md §2.1 tokens (site/vitrine)
        "night-950": "#07030F",
        "night-900": "#0D0618",
        "night-800": "#150A26",
        "night-700": "#1E1033",
        "violet-haze": "#2A1548",
        "vice-pink": "#FF2E88",
        "vice-pink-soft": "#FF6BB0",
        "sunset-orange": "#FF7A29",
        "sunset-gold": "#FFB347",
        "teal-neon": "#00E5C7",
        "teal-deep": "#0899A8",
        "star-gold": "#FFD60A",
        "police-red": "#FF3B3B",
        "police-blue": "#3B82FF",
        "cash-green": "#7CFF6B",
        "health-red": "#FF4757",
        "armor-blue": "#4CC9F0",
        "text-hi": "#FFF7F0",
        "text-mid": "#C9B8E8",
        "text-dim": "#8A7BA8",
        // ---- shadcn/ui vars
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["Anton", "'Arial Narrow'", "sans-serif"],
        sans: ["'Space Grotesk'", "Arial", "sans-serif"],
        pixel: ["'Press Start 2P'", "'Courier New'", "monospace"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "glow-pink": "0 0 24px rgba(255,46,136,.45), 0 0 80px rgba(255,46,136,.18)",
        "glow-teal": "0 0 24px rgba(0,229,199,.4)",
        "glow-gold": "0 0 16px rgba(255,214,10,.6), 0 0 48px rgba(255,214,10,.25)",
        card: "0 16px 48px rgba(0,0,0,.5)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        marquee: {
          to: { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.9" },
        },
        "police-pulse": {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "0.6" },
        },
        "star-pop": {
          "0%": { transform: "scale(1.6)" },
          "100%": { transform: "scale(1)" },
        },
        "wanted-blink": {
          "0%, 49%": { fill: "#FFD60A" },
          "50%, 100%": { fill: "#FFF7F0" },
        },
        "cue-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        marquee: "marquee 22s linear infinite",
        twinkle: "twinkle 2.2s ease-in-out infinite",
        "police-pulse": "police-pulse 1.2s ease-in-out infinite",
        "star-pop": "star-pop 200ms cubic-bezier(0.34, 1.8, 0.64, 1) both",
        "wanted-blink": "wanted-blink 0.5s step-end infinite",
        "cue-bounce": "cue-bounce 1s ease-in-out infinite",
        "glow-breathe": "glow-breathe 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
