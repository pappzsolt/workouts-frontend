const plugin = require('tailwindcss/plugin');

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
        // Modal backdrops and shadows can be adjusted independently.
        overlay: neutral[900],
        shadow: neutral[900],
        // Egységes paletta: egy márkaszín (zöld) + semleges szürkék.
        // Kék csak tájékoztató üzenetekhez (info), sárga a figyelmeztetéshez,
        // piros a törléshez/hibához. A régi szerep-nevek (edit, add, search,
        // sort, pagination) megmaradnak, de a márkaszínre / semlegesre mutatnak.
        primary,
        success: primary,
        edit: primary,
        info: blue,
        search: primary,
        add: primary,
        save: primary,
        surface: neutral,
        content: neutral,
        sort: neutral,
        pagination: primary,
        warning,
        delete: danger,
      },
      // Tailwind's implicit border and focus colors also follow the palette.
      borderColor: ({ theme }) => ({ DEFAULT: theme('colors.surface.300') }),
      ringColor: ({ theme }) => ({ DEFAULT: theme('colors.primary.500') }),
      ringOffsetColor: ({ theme }) => ({ DEFAULT: theme('colors.white') }),
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
  plugins: [
    plugin(({ addBase, theme }) => {
      // Export the same palette for component CSS and Angular Material.
      // Adding a shade here automatically makes --app-<palette>-<shade> available.
      const variables = {};
      for (const name of Object.keys(module.exports.theme.extend.colors)) {
        const palette = theme(`colors.${name}`);
        if (typeof palette === 'string') {
          variables[`--app-${name === 'shadow' ? 'shadow-color' : name}`] = palette;
        } else {
          for (const [shade, value] of Object.entries(palette)) {
            variables[`--app-${name}-${shade}`] = value;
          }
        }
      }
      addBase({ ':root': variables });
    }),
  ],
};
