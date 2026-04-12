/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'islamic-blue': '#2563EB', // Royal Blue
        'islamic-green': '#10B981', // Emerald
        'islamic-gold': '#FBBF24', // Amber
        'islamic-light': '#EFF6FF', // Blue-50
        'islamic-dark': '#1E3A8A', // Dark Blue
        
        // Explicit Kids Palette
        'kids-primary': '#3B82F6', // Bright Blue
        'kids-secondary': '#60A5FA', // Sky Blue
        'kids-accent': '#FBBF24', // Amber/Gold
        'kids-purple': '#8B5CF6', // Violet
        'kids-pink': '#EC4899', // Pink
        'kids-bg': '#EFF6FF', // Light Blue Background
      },
      fontFamily: {
        'sans': ['Fredoka', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        'kids': '0 4px 0 rgba(0,0,0,0.15)',
        'kids-hover': '0 6px 0 rgba(0,0,0,0.15)',
        'kids-active': '0 0 0 rgba(0,0,0,0.15)',
        'modern': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(147, 51, 234, 0.3)',
        'glow-yellow': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3)',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'rainbow': 'rainbow 3s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(147, 51, 234, 0.6)' },
        },
        rainbow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}