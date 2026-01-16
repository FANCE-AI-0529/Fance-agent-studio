import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./pages/**/*.{ts,tsx}", 
    "./components/**/*.{ts,tsx}", 
    "./app/**/*.{ts,tsx}", 
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  // NUCLEAR FIX: Aggressive regex-based safelist to prevent any purging issues
  safelist: [
    // Force keep ALL standard Tailwind colors with all shades
    {
      pattern: /^(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
      variants: ['hover', 'focus', 'active', 'group-hover', 'dark'],
    },
    // Force keep opacity variants
    {
      pattern: /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\/(5|10|15|20|25|30|40|50|60|70|75|80|90|95)$/,
    },
    // Custom semantic colors with opacity
    { pattern: /^bg-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    { pattern: /^bg-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)\/(5|10|15|20|25|30|40|50|60|70|75|80|90|95)$/ },
    { pattern: /^text-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    { pattern: /^border-(primary|cognitive|governance|status-planning|status-confirm|status-executing|status-idle|port-data|port-control|port-perception)$/ },
    // Force keep all width/height utilities
    { pattern: /^(w|h|min-w|min-h|max-w|max-h)-.+/ },
    // Force keep all spacing utilities
    { pattern: /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-.+/ },
    // Z-index - all common values
    'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-[100]', 'z-[110]', 'z-[999]', 'z-[9999]',
    // Animation classes
    'animate-in', 'animate-out', 'fade-in', 'fade-out', 'zoom-in', 'zoom-out', 'slide-in-from-top', 'slide-in-from-bottom',
    'animate-bounce', 'animate-pulse', 'animate-spin', 'animate-flow', 'animate-fade-in', 'animate-scale-in',
    // Grid columns - all common values
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6', 'grid-cols-7', 'grid-cols-8', 'grid-cols-9', 'grid-cols-10', 'grid-cols-11', 'grid-cols-12',
    // Flex utilities
    'flex-1', 'flex-auto', 'flex-none', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap',
    // Glassmorphism
    'backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg', 'backdrop-blur-xl', 'backdrop-blur-2xl', 'backdrop-blur-3xl',
    // Opacity
    'opacity-0', 'opacity-5', 'opacity-10', 'opacity-20', 'opacity-25', 'opacity-30', 'opacity-40', 'opacity-50', 'opacity-60', 'opacity-70', 'opacity-75', 'opacity-80', 'opacity-90', 'opacity-95', 'opacity-100',
    // Transform
    'scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125', 'scale-150',
    'translate-x-0', 'translate-y-0', '-translate-x-1/2', '-translate-y-1/2',
    // Display
    'hidden', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid',
    // Position
    'static', 'fixed', 'absolute', 'relative', 'sticky',
    // Overflow
    'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll', 'overflow-x-auto', 'overflow-y-auto', 'overflow-x-hidden', 'overflow-y-hidden',
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
