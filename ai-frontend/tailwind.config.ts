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
          '"Inter"',
          '-apple-system',
          '"Segoe UI"',
          '"Sylfaen"',
          '"Helvetica Neue"',
          'Arial',
          ...defaultTheme.fontFamily.sans,
        ],
        georgian: ['"Inter"', '"Segoe UI"', '"Sylfaen"', 'sans-serif'],
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
