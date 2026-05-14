/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core semantic colors — light paper default
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

        // Sidebar colors
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

        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },

        // ── Scrapbook / Stationery Palette ──
        paper: {
          DEFAULT: '#fdfbf7',
          ruled: '#f7f5f0',
          grid: '#f5f3ee',
        },
        ink: {
          DEFAULT: '#2d2d2d',
          light: '#5a5a5a',
          muted: '#8a8a8a',
        },
        cardstock: {
          DEFAULT: '#ffffff',
          yellow: '#fef9e7',
          mint: '#e8f5e9',
          pink: '#fce4ec',
          lavender: '#f3e5f5',
          blue: '#e3f2fd',
          peach: '#fff3e0',
        },
        craft: {
          mint: '#81c784',
          yellow: '#ffd54f',
          pink: '#f06292',
          lavender: '#ba68c8',
          blue: '#64b5f6',
          orange: '#ff8a65',
        },

        // Legacy aliases for smooth migration
        pink: {
          DEFAULT: '#f06292',
          50: '#fce4ec',
          100: '#f8bbd0',
          200: '#f48fb1',
          300: '#f06292',
          400: '#ec407a',
          500: '#d81b60',
        },
        green: {
          DEFAULT: '#81c784',
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#4caf50',
        },
        blue: '#64b5f6',
        yellow: '#ffd54f',
        purple: '#ba68c8',
        cream: '#fdfbf7',
        'text-dark': '#2d2d2d',
      },

      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        'paper': '2rem',
        'paper-lg': '2.5rem',
      },

      fontSize: {
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em', fontWeight: '700' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '800' }],
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'soft': '0 4px 20px -2px rgb(0 0 0 / 0.08)',
        'glow': '0 0 20px -5px hsl(var(--primary) / 0.3)',
        'paper': '4px 4px 0 rgba(45, 45, 45, 0.08)',
        'paper-lg': '6px 6px 0 rgba(45, 45, 45, 0.1)',
        'paper-hover': '6px 6px 0 rgba(45, 45, 45, 0.12)',
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "wiggle": "wiggle 0.3s ease-in-out infinite",
      },

      transitionTimingFunction: {
        'soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
