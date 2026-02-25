

# Plan: Add "HIVE" Text Next to Logo

## Change

In `src/components/landing/GlassNavbar.tsx`, update the `Brand` component's logo link (line 29-31) to include "HIVE" text beside the logo image.

### Current (line 29-31):
```tsx
<a href="#">
  <img src={logoFull} alt="HIVE" className="h-8 sm:h-9 rounded-lg object-cover" />
</a>
```

### Updated:
```tsx
<a href="#" className="flex items-center gap-2">
  <img src={logoFull} alt="HIVE" className="h-8 sm:h-9 rounded-lg object-cover" />
  <span className="text-white font-bold text-xl tracking-wider">HIVE</span>
</a>
```

The text will be white, bold, and use wide letter-spacing to match the tech aesthetic of the landing page.

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/GlassNavbar.tsx` | Add "HIVE" text span next to logo image |

