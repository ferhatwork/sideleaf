/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sideleaf: {
          dark: {
            bg: '#0f1117',
            surface: '#161922',
            elevated: '#1f2330',
            border: '#2b3042',
            subtle: '#373e55',
            text: '#f1f3f7',
            muted: '#8e96aa',
          },
          light: {
            bg: '#f8f9fa',
            surface: '#ffffff',
            elevated: '#f1f3f5',
            border: '#e2e5e9',
            subtle: '#cbd1d8',
            text: '#191d24',
            muted: '#687282',
          },
          accent: {
            DEFAULT: '#3b82f6',
            hover: '#2563eb',
            subtle: 'rgba(59, 130, 246, 0.12)',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
