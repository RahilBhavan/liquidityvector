import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS/macOS System Colors approximation
        background: '#F5F5F7',
        surface: '#FFFFFF',
        'surface-secondary': '#F2F2F7',
        primary: '#1D1D1F', // Text primary
        secondary: '#86868B', // Text secondary
        accent: '#0071E3', // Action Blue
        success: '#34C759',
        warning: '#FF9F0A',
        critical: '#FF3B30',
        divider: 'rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"Menlo"', '"Monaco"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 8px 24px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 16px 48px rgba(0, 0, 0, 0.12)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
