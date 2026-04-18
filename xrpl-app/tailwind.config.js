/** @type {import('tailwindcss').Config} */
module.exports = {
     content: ['./src/**/*.{html,ts}'],
     theme: {
          extend: {
               gridTemplateColumns: {
                    24: 'repeat(24, minmax(0, 1fr))',
               },
          },
     },
     plugins: [],
};
