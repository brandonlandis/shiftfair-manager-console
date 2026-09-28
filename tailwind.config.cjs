/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0f2942',
        teal: '#0d9488',
        warning: '#d97706',
        danger: '#dc2626',
        approve: '#16a34a'
      },
      boxShadow: {
        soft: '0 6px 20px rgba(15, 41, 66, 0.08)'
      }
    }
  },
  plugins: []
};
