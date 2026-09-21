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

        // Edit gombok
        edit: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2563eb',
          700: '#1d4ed8',
        },

        // Search gombok
        search: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          600: '#16a34a',
          700: '#15803d',
        },

        // Sort gombok
        sort: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          600: '#4f46e5',
          700: '#4338ca',
        },

        // Add gombok
        add: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          600: '#ca8a04',
          700: '#a16207',
        },

        // Save gombok
        save: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          600: '#9333ea',
          700: '#7e22ce',
        },

        // Delete gombok
        delete: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          600: '#dc2626',
          700: '#b91c1c',
        },

        // Pagination gombok
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
