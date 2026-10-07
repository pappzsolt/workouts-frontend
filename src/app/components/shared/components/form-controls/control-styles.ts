// Keep native controls and validators; presets contain only shared presentation.
export const INPUT_STYLES = {
  admin:
    'min-h-11 w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-base text-content-800 shadow-sm outline-none transition-all duration-200 hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm',
  editor:
    'min-h-11 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-900 shadow-sm outline-none transition duration-150 hover:border-primary-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm',
  compact:
    'min-h-10 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-content-800 shadow-sm outline-none transition duration-200 hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
  builder:
    'block w-full rounded-lg border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 sm:text-sm',
  default:
    'block min-h-11 w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm',
  login:
    'w-full rounded-xl border border-surface-300 px-4 py-3 text-content-900 focus:outline-none focus:ring-2 focus:ring-primary-500',
  readonly:
    'w-full rounded-xl border border-surface-300 bg-surface-100 px-3.5 py-2.5 text-base text-content-600 shadow-sm outline-none sm:text-sm',
  readonlyBuilder:
    'block w-full rounded-lg border border-surface-300 bg-surface-100 px-3.5 py-2.5 text-base text-content-600 shadow-sm outline-none sm:text-sm',
  plain: '',
  filter:
    'min-h-11 w-full rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm text-content-800 outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-600/10',
} as const;
export const TEXTAREA_STYLES = {
  admin:
    'w-full rounded-xl border border-surface-300 bg-white px-4 py-3 text-base text-content-800 shadow-sm outline-none transition-all duration-200 hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm resize-y',
  editor:
    'w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-900 shadow-sm outline-none transition duration-150 hover:border-primary-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm resize-y',
  compact:
    'w-full min-w-0 resize-y rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-sm leading-5 text-content-800 shadow-sm outline-none transition duration-200 hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
  builder:
    'block w-full rounded-lg border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 sm:text-sm resize-y',
  default:
    'block w-full min-w-0 rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-base text-content-800 shadow-sm outline-none transition hover:border-surface-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 sm:text-sm resize-y',
  login:
    'w-full rounded-xl border border-surface-300 px-4 py-3 text-content-900 focus:outline-none focus:ring-2 focus:ring-primary-500',
  plain: '',
} as const;
