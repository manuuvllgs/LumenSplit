// LumenSplit Tailwind preset. En frontend/tailwind.config.js:
//   presets: [require('../docs/brand/tailwind.preset.js')]
// o copia `theme.extend` dentro de tu config.
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#5B4BFF', hover: '#4A3BE6', soft: '#EEECFF' },
        accent: { DEFAULT: '#FFC23D', soft: '#FFF4D6' },
        ink: '#15132E',
        positive: { DEFAULT: '#067647', soft: '#E7F8EF' },
        negative: { DEFAULT: '#D92D20', soft: '#FEECEB' },
        zero: '#667085',
        bg: '#F7F7FB',
        surface: '#FFFFFF',
        line: '#E4E4EE',
        muted: '#667085',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px', btn: '10px' },
      boxShadow: { card: '0 1px 2px rgba(21,19,46,.06), 0 4px 16px rgba(21,19,46,.06)' },
    },
  },
};
