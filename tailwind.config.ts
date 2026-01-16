import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  // Safelist to protect dynamic classes from being purged in production
  safelist: [
    // Dynamic color classes used in UserStatsCards, ScenarioCards
    { pattern: /^bg-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    { pattern: /^bg-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)\/(10|15|20|30)$/ },
    { pattern: /^text-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    { pattern: /^border-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    // Agent role palette classes
    { pattern: /^(bg|text|border)-role-(architect|engineer|researcher|auditor)-(border|bg|text|highlight)$/ },
    // Lucide color classes used in TypingIndicator and AgentAvatarAnimated
    { pattern: /^bg-(blue|amber|green|purple|red|orange|yellow|cyan|indigo|violet)-(400|500|600)$/ },
    { pattern: /^text-(blue|amber|green|purple|red|orange|yellow|cyan|indigo|violet)-(400|500|600)$/ },
    { pattern: /^border-(blue|amber|green|purple|red|orange|yellow|cyan|indigo|violet)-(400|500|600)$/ },
    // Z-index values
    'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-[100]', 'z-[110]',
    // Animation classes
    'animate-bounce', 'animate-pulse', 'animate-spin', 'animate-flow', 'animate-fade-in', 'animate-scale-in', 'animate-pulse-warning',
    // Grid columns for ManusMemoryPanel
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6',
    // Glassmorphism
    'backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl',
    // Smart bubble classes
    'bubble-architect', 'bubble-engineer', 'bubble-researcher', 'bubble-auditor',
    'highlight-pill', 'highlight-pill-architect', 'highlight-pill-engineer', 'highlight-pill-researcher', 'highlight-pill-auditor', 'highlight-pill-default',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        cognitive: 'hsl(var(--cognitive))',
        governance: 'hsl(var(--governance))',
        'status-planning': 'hsl(var(--status-planning))',
        'status-confirm': 'hsl(var(--status-confirm))',
        'status-executing': 'hsl(var(--status-executing))',
        'status-idle': 'hsl(var(--status-idle))',
        'port-data': 'hsl(var(--port-data))',
        'port-control': 'hsl(var(--port-control))',
        'port-perception': 'hsl(var(--port-perception))',
        // Agent role palettes
        'role-architect': {
          border: 'hsl(var(--role-architect-border))',
          bg: 'hsl(var(--role-architect-bg))',
          text: 'hsl(var(--role-architect-text))',
          highlight: 'hsl(var(--role-architect-highlight))',
        },
        'role-engineer': {
          border: 'hsl(var(--role-engineer-border))',
          bg: 'hsl(var(--role-engineer-bg))',
          text: 'hsl(var(--role-engineer-text))',
          highlight: 'hsl(var(--role-engineer-highlight))',
        },
        'role-researcher': {
          border: 'hsl(var(--role-researcher-border))',
          bg: 'hsl(var(--role-researcher-bg))',
          text: 'hsl(var(--role-researcher-text))',
          highlight: 'hsl(var(--role-researcher-highlight))',
        },
        'role-auditor': {
          border: 'hsl(var(--role-auditor-border))',
          bg: 'hsl(var(--role-auditor-bg))',
          text: 'hsl(var(--role-auditor-text))',
          highlight: 'hsl(var(--role-auditor-highlight))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.4)' },
          '50%': { boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.2)' }
        },
        'flow': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flow': 'flow 0.6s linear infinite'
      },
      boxShadow: {
        '2xs': 'var(--shadow-2xs)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)'
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans SC',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      // Standardized Z-Index layer management
      zIndex: {
        'canvas': '0',
        'content': '10',
        'sidebar': '20',
        'header': '30',
        'dropdown': '40',
        'modal': '50',
        'toast': '100',
        'tooltip': '110',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
