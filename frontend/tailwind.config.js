/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1437',
          800: '#111c44',
          700: '#1a1f4e',
        }
      },
      backgroundImage: {
        'vision-gradient': 'linear-gradient(127deg, #0b1437 0%, #1a1f4e 50%, #0b1437 100%)',
        'card-gradient': 'linear-gradient(127deg, rgba(6, 11, 40, 0.94) 19.41%, rgba(10, 14, 35, 0.49) 76.65%)',
        'cyan-gradient': 'linear-gradient(135deg, #0075FF 0%, #00D1FF 100%)',
        'green-gradient': 'linear-gradient(135deg, #01B574 0%, #00F7BF 100%)',
      }
    },
  },
  plugins: [],
}
