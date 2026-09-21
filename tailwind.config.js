/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],

  theme: {
    extend: {
      colors: {
        // Fő alkalmazásszín – sportos smaragdzöld
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          600: '#059669',
          700: '#047857',
        },

        // Edit gombok – kék
        edit: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2563eb',
          700: '#1d4ed8',
        },

        // Search gombok – zöld
        search: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          600: '#16a34a',
          700: '#15803d',
        },

        // Sort gombok – indigókék
        sort: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          600: '#4f46e5',
          700: '#4338ca',
        },

        // Add gombok – sárga
        add: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          600: '#ca8a04',
          700: '#a16207',
        },

        // Save gombok – smaragdzöld (lila helyett)
        save: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          600: '#059669',
          700: '#047857',
        },

        // Delete gombok – piros
        delete: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          600: '#dc2626',
          700: '#b91c1c',
        },

        // Pagination gombok – indigókék
        pagination: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          600: '#6366f1',
          700: '#4f46e5',
        },
      },
    },
  },

  plugins: [],
};
