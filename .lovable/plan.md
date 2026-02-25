

# Plan: Replace All Logos with New Uploaded Image

## Overview

Replace the current logo assets (`logo-icon.png`, `logo-full.png`, `favicon.png`) with the user's uploaded image (the holographic hexagonal core — `image-44.png`) across the entire system.

## Asset Preparation

1. **Copy the uploaded image** to two asset locations:
   - `src/assets/logo-icon.png` — overwrite existing (used in React component imports)
   - `src/assets/logo-full.png` — overwrite existing (used in Auth page, Landing navbar)
   - `public/favicon.png` — overwrite existing (browser tab favicon)

All three will use the same source: `user-uploads://image-44.png`

## Files Requiring Updates

The image imports remain the same (`@/assets/logo-icon.png`, `@/assets/logo-full.png`), so the core change is the asset files themselves. However, some components need sizing/styling adjustments to ensure the new logo (which is square with a dark background and glowing center) fits seamlessly:

### Component Adjustments (6 files)

| File | Current Style | Adjustment |
|------|--------------|------------|
| `src/components/layout/AppSidebar.tsx` | `w-6 h-6` icon in `w-9 h-9` container with `bg-primary/10` | Change to `w-9 h-9 rounded-lg` directly, remove wrapper background (image has its own dark bg) |
| `src/components/consumer/ConsumerHeader.tsx` | `w-9 h-9 rounded-xl` with overlay ring | Keep size, ensure `object-cover` for clean fit |
| `src/components/runtime/ConsumerRuntime.tsx` | `w-7 h-7 rounded-lg`, alt text says "Fance OS" | Fix alt text to "Agent Studio", adjust sizing |
| `src/components/layout/MainLayout.tsx` | `w-7 h-7 rounded-lg` | Keep, add `object-cover` |
| `src/components/landing/GlassNavbar.tsx` | Uses `logo-full.png` with `brightness-0 invert` filter | Remove the `brightness-0 invert` filter (new logo is already bright on dark), adjust height |
| `src/pages/Auth.tsx` | Uses `logo-full.png` at `h-16`, alt says "FANCE.AI" | Fix alt text, remove any filters, adjust size to `h-14 w-14 rounded-xl` for square logo |

### HTML Meta (1 file)

| File | Change |
|------|--------|
| `index.html` | No code change needed — `favicon.png` path stays the same, just the file content changes |

## Technical Details

- The new logo is a square image with a dark/black background and a glowing cyan-purple hexagonal core
- Since it has a dark background, it integrates naturally with the dark theme without needing `brightness-0 invert` or `bg-primary/10` wrappers
- All `rounded-lg` / `rounded-xl` classes will create a subtle border-radius crop on the square image
- The `object-cover` class ensures proper scaling without distortion
- No new imports are needed since the filenames remain the same

## Execution Order

1. Copy `image-44.png` → `src/assets/logo-icon.png`, `src/assets/logo-full.png`, `public/favicon.png` (3 copies, parallel)
2. Update all 6 component files in parallel to adjust styling

