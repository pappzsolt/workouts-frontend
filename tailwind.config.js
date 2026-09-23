const primary = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};

const blue = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
};

const search = {
  50: '#F0FDF4',
  100: '#DCFCE7',
  200: '#BBF7D0',
  600: '#16A34A',
  700: '#15803D',
  800: '#166534',
};

const add = {
  50: '#FEFCE8',
  100: '#FEF9C3',
  200: '#FEF08A',
  600: '#CA8A04',
  700: '#A16207',
};

const neutral = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
};

const indigo = {
  50: '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#6366F1',
  600: '#4F46E5',
  700: '#4338CA',
};

const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
};

const danger = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        primary,
        success: primary,
        edit: blue,
        info: blue,
        search,
        add,
        save: primary,
        surface: neutral,
        content: neutral,
        sort: indigo,
        pagination: indigo,
        warning,
        delete: danger,
      },
      boxShadow: {
        sm: '0 1px 2px 0 color-mix(in srgb, var(--app-shadow-color) 5%, transparent)',
        DEFAULT:
          '0 1px 3px 0 color-mix(in srgb, var(--app-shadow-color) 10%, transparent), 0 1px 2px -1px color-mix(in srgb, var(--app-shadow-color) 10%, transparent)',
        md: '0 4px 6px -1px color-mix(in srgb, var(--app-shadow-color) 10%, transparent), 0 2px 4px -2px color-mix(in srgb, var(--app-shadow-color) 10%, transparent)',
        lg: '0 10px 15px -3px color-mix(in srgb, var(--app-shadow-color) 10%, transparent), 0 4px 6px -4px color-mix(in srgb, var(--app-shadow-color) 10%, transparent)',
        xl: '0 20px 25px -5px color-mix(in srgb, var(--app-shadow-color) 10%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--app-shadow-color) 10%, transparent)',
        '2xl': '0 25px 50px -12px color-mix(in srgb, var(--app-shadow-color) 25%, transparent)',
        inner: 'inset 0 2px 4px 0 color-mix(in srgb, var(--app-shadow-color) 5%, transparent)',
      },
    },
  },
  plugins: [],
};
