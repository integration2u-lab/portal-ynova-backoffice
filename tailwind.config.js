/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        yn: {
          orange: '#FE5200',
          blue: '#010088',
          blue2: '#191BDF',
          blue3: '#013DF5',
          grayDark: '#1E1E1E',
          gray: '#3E3E3E',
          grayLight: '#DDDDDD',
        },
      },
    },
  },
  plugins: [],
};
