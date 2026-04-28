/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#080806', 2: '#0D0B09', 3: '#12100D', 4: '#1A1815' },
        paper: { DEFAULT: '#F2EDE4', 2: '#E8E0D0' },
        signal: { DEFAULT: '#E8622A', bright: '#FF7A42' },
        acid: '#C8FF3F',
        rule: 'rgba(242,237,228,0.08)',
        'rule-2': 'rgba(242,237,228,0.04)',
        'paper-mute': 'rgba(242,237,228,0.55)',
        'paper-dim': 'rgba(242,237,228,0.18)',
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jb)', 'monospace'],
      },
    },
  },
  plugins: [],
};
