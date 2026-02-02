/**
 * Unified spacing system for consistent layouts across Studio and Consumer views
 * All values are Tailwind CSS class names
 */

export const spacing = {
  /** Section-level vertical spacing */
  section: 'space-y-8',
  /** Card internal spacing */
  card: 'space-y-4',
  /** Group of related items */
  group: 'space-y-3',
  /** Individual items */
  item: 'space-y-2',

  /** Gap utilities for flex/grid */
  gap: {
    section: 'gap-6',
    card: 'gap-4',
    item: 'gap-2',
    tight: 'gap-1',
  },

  /** Padding utilities */
  padding: {
    page: 'p-6',
    card: 'p-5',
    compact: 'p-4',
    tight: 'p-3',
  },

  /** Margin utilities */
  margin: {
    section: 'mb-8',
    card: 'mb-4',
    item: 'mb-2',
  },
} as const;

/**
 * Common container widths
 */
export const containers = {
  /** Maximum width for content areas */
  content: 'max-w-7xl',
  /** Maximum width for forms/dialogs */
  form: 'max-w-2xl',
  /** Maximum width for narrow content */
  narrow: 'max-w-md',
  /** Maximum width for cards grid */
  cards: 'max-w-6xl',
} as const;

export type SpacingKey = keyof typeof spacing;
export type GapKey = keyof typeof spacing.gap;
export type PaddingKey = keyof typeof spacing.padding;
