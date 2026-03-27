/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'glass-bg': 'rgba(15, 23, 42, 0.75)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'cyber-neon': '#0FF0FC',
        'cyber-purple': '#8A2BE2',
        'minerva-dark': '#0B0F19',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(15, 240, 252, 0.5)',
        'neon-purple': '0 0 15px rgba(138, 43, 226, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-gradient': 'linear-gradient(135deg, rgba(15,240,252,0.1) 0%, rgba(138,43,226,0.1) 100%)',
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
