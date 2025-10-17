import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans Georgian"',
          '"Inter"',
          '"Manrope"',
          ...defaultTheme.fontFamily.sans,
        ],
        georgian: ['"Noto Sans Georgian"', '"Inter"', '"Manrope"', 'sans-serif'],
      },
      letterSpacing: {
        georgian: '0.015em',
      },
      colors: {
        gray: {
          850: '#1f2937',
        }
      }
    },
  },
  plugins: [],
};

export default config;
