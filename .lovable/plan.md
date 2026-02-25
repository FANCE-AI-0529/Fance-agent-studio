

# Plan: Replace All Logos with New Uploaded Image (image-45.png)

## Overview

Replace the current logo assets with the user's newly uploaded image (`image-45.png` — the holographic hexagonal chip with circuit board elements) across the entire system. This is the same process as before but with a different source image.

## Asset Replacement (3 files, parallel)

Copy `user-uploads://image-45.png` to:
- `src/assets/logo-icon.png` — used by React component imports across Studio, Consumer, Runtime
- `src/assets/logo-full.png` — used by Auth page, Landing navbar
- `public/favicon.png` — browser tab favicon

## Component Review

Based on the last diff, all 6 component files already have the correct styling from the previous logo swap:

| File | Current State | Action Needed |
|------|--------------|---------------|
| `AppSidebar.tsx` | `w-9 h-9 rounded-lg object-cover` | No change |
| `ConsumerHeader.tsx` | `w-9 h-9 rounded-xl object-cover` | No change |
| `ConsumerRuntime.tsx` | `w-7 h-7 rounded-lg object-cover` | No change |
| `MainLayout.tsx` | `w-7 h-7 rounded-lg object-cover` | No change |
| `GlassNavbar.tsx` | `h-8 sm:h-9 rounded-lg object-cover` | No change |
| `Auth.tsx` | `h-14 w-14 rounded-xl object-cover` | No change |

All filters (`brightness-0 invert`) were already removed and `object-cover` is already applied everywhere. The new image has a similar dark background with glowing cyan-purple elements, so the existing styling will integrate seamlessly.

## Execution

1. Copy `image-45.png` → 3 asset locations (parallel)
2. No component code changes needed — styling is already optimized from previous swap

## Technical Notes

- The new image has a slightly different composition (circuit board chip vs. core sphere) but the same color palette and dark background
- `rounded-lg`/`rounded-xl` will softly crop the corners
- `object-cover` ensures proper scaling in all size contexts

