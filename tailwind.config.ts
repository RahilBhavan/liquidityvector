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
        'bit-bg': 'var(--bit-bg)',
        'bit-fg': 'var(--bit-fg)',
        'bit-dim': 'var(--bit-dim)',
        'bit-accent': 'var(--bit-accent)',
        'scan': 'var(--scan-color)',
        'bit-white': 'var(--bit-bg)', // Backward compatibility alias
        'bit-black': 'var(--bit-fg)', // Backward compatibility alias
      },
      fontFamily: {
        sans: ['"Courier Prime"', '"Courier New"', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"Courier Prime"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'hard': '4px 4px 0 0 var(--bit-fg)',
        'hard-sm': '2px 2px 0 0 var(--bit-fg)',
        'hard-inv': '4px 4px 0 0 var(--bit-bg)',
        'none': 'none',
      },
      borderWidth: {
        DEFAULT: '2px',
        '1': '1px',
        '2': '2px',
        '4': '4px',
      },
      backgroundImage: {
        // Dither patterns handled in CSS layers now for theming support
        // Keeping these for legacy if needed, but globals.css handles the dynamic vars
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
