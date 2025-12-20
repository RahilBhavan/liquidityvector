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
        'lv-indigo': '#371E7B',
        'lv-lime': '#CCFF00',
        'lv-offwhite': '#F9F9F5',
        'lv-indigo-light': '#4C2A9E',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'lv': '4px 4px 0px 0px #371E7B',
        'lv-lg': '8px 8px 0px 0px #371E7B',
        'lv-xl': '12px 12px 0px 0px #371E7B',
        'lv-lime': '4px 4px 0px 0px #CCFF00',
        'lv-active': '2px 2px 0px 0px #371E7B',
      },
    },
  },
  plugins: [],
};

export default config;
