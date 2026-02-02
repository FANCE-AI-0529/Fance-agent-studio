/**
 * Unified responsive grid system for consistent layouts
 * All values are Tailwind CSS class names
 */

export const gridCols = {
  /** Standard card grid: 1 → 2 → 3 columns */
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  
  /** Small card grid: 2 → 3 → 4 columns */
  smallCards: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  
  /** Wide card grid: 1 → 2 columns */
  wideCards: 'grid-cols-1 md:grid-cols-2',
  
  /** Stats/metric cards: 2 → 4 columns */
  stats: 'grid-cols-2 lg:grid-cols-4',
  
  /** Feature cards: 1 → 2 → 3 columns */
  features: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  
  /** Compact list: 1 → 2 → 3 columns */
  list: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
} as const;

/**
 * Common gap configurations for grids
 */
export const gridGaps = {
  /** Standard gap for card grids */
  cards: 'gap-4',
  /** Compact gap for dense layouts */
  compact: 'gap-3',
  /** Wide gap for spacious layouts */
  wide: 'gap-6',
} as const;

/**
 * Combined grid utilities
 */
export const grids = {
  cards: `grid ${gridCols.cards} ${gridGaps.cards}`,
  smallCards: `grid ${gridCols.smallCards} ${gridGaps.compact}`,
  wideCards: `grid ${gridCols.wideCards} ${gridGaps.cards}`,
  stats: `grid ${gridCols.stats} ${gridGaps.cards}`,
  features: `grid ${gridCols.features} ${gridGaps.cards}`,
} as const;

export type GridColsKey = keyof typeof gridCols;
export type GridGapsKey = keyof typeof gridGaps;
