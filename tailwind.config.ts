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
        'bit-bg': '#FFFFFF',
        'bit-fg': '#000000',
        'bit-white': '#FFFFFF',
        'bit-black': '#000000',
        'bit-dim': '#E5E5E5', // For disabled states, technically gray but used sparingly or dithering fallback
      },
      fontFamily: {
        sans: ['"Courier Prime"', '"Courier New"', 'monospace'], // Default to mono for everything
        pixel: ['"Press Start 2P"', 'monospace'], // Headers
        mono: ['"Courier Prime"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0 0 #000000',
        'hard-sm': '2px 2px 0 0 #000000',
        'hard-inv': '4px 4px 0 0 #FFFFFF',
        'none': 'none',
      },
      borderWidth: {
        DEFAULT: '2px',
        '1': '1px',
        '2': '2px',
        '4': '4px',
      },
      backgroundImage: {
        // CSS-only dither patterns
        'dither-checker': 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)',
        'dither-light': 'radial-gradient(#000 1px, transparent 1px)',
        'dither-scanline': 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))',
        'grid-paper': "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
      },
      backgroundSize: {
        'dither-light': '4px 4px',
        'dither-scanline': '100% 4px',
        'grid-20': '20px 20px',
      }
    },
  },
  plugins: [],
};

export default config;
