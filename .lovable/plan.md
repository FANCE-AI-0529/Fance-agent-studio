

# Plan: Landing Page Visual Polish and Interaction Enhancement

## Analysis

After reviewing all landing components, the current implementation already covers most of the requirements. Here are the specific gaps to address:

### What Already Exists (No Changes Needed)
- 3D particle background with parallax (ParticleField.tsx) -- fully implemented
- Staggered fade-in entry animations (framer-motion, duration 0.8s) -- implemented
- Spotlight hover effect on Bento cards (BentoFeatures.tsx) -- implemented
- Gradient text clip on headings -- implemented
- Glass navbar with backdrop-blur -- implemented

### What Needs Enhancement

## Changes

### 1. GlassNavbar.tsx -- Add "开发者文档" Button + Glowing Border

Current nav items: 平台架构, MPLP 协议, 技术文档, Login, Book a Demo

Changes:
- Rename "技术文档" to "开发者文档" and style it as a secondary ghost button (border border-white/10, hover:border-cyan-500/30) to make it visually distinct from plain nav links
- Add a persistent subtle glowing bottom border on scroll: `border-b border-[#22d3ee]/15 shadow-[0_1px_15px_rgba(34,211,238,0.08)]` (enhance existing scrolled state)
- Ensure the glass effect uses `backdrop-blur-md` minimum (currently xl, which is fine)

### 2. HeroSection.tsx -- Neon Glow CTA Button + Hover Pulse

Current CTA button has gradient fill but no glow shadow or hover scale.

Changes:
- Add neon glow shadow to the "获取内测邀请码" submit button: `shadow-[0_0_25px_rgba(34,211,238,0.4),0_0_60px_rgba(129,140,248,0.2)]`
- Add hover pulse scale: `transition-transform hover:scale-[1.05] active:scale-[0.97]`
- Add the same glow treatment to the email input's focus state: `focus:shadow-[0_0_15px_rgba(34,211,238,0.15)]`

### 3. BentoFeatures.tsx -- Fix Reactive Spotlight

Current spotlight hover uses `x.get()` and `y.get()` in a static style object, which does not update reactively with framer-motion. The spotlight circle position is frozen.

Changes:
- Use `useMotionTemplate` from framer-motion to create a reactive radial-gradient background string that updates as the mouse moves
- This makes the "searchlight sweeping across glass" effect actually work

### 4. Global Card Hover Border Glow

The requirement specifies `hover:border-cyan-500/50` on all glass cards. The current BentoFeatures cards use `hover:border-[#22d3ee]/30`.

Changes:
- Increase to `hover:border-[#22d3ee]/50` for stronger visual feedback on all SpotlightCard instances

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/GlassNavbar.tsx` | Rename "技术文档" to "开发者文档" as styled ghost button; enhance scroll glow border |
| `src/components/landing/HeroSection.tsx` | Add neon glow shadow + hover pulse to CTA button; add focus glow to input |
| `src/components/landing/BentoFeatures.tsx` | Fix spotlight with `useMotionTemplate`; increase hover border opacity to /50 |

## Technical Details

### Spotlight Fix (BentoFeatures.tsx)
The current implementation builds the gradient string once:
```tsx
style={{
  background: `radial-gradient(400px circle at ${x.get()}px ${y.get()}px, ...)`,
}}
```
This captures the initial value only. The fix uses:
```tsx
import { useMotionTemplate } from "framer-motion";
const bg = useMotionTemplate`radial-gradient(400px circle at ${x}px ${y}px, rgba(34,211,238,0.06), transparent 60%)`;
// Then: <motion.div style={{ background: bg }} />
```

### CTA Glow (HeroSection.tsx)
The button gets a persistent dual-layer glow shadow plus an absolute-positioned blur element behind it for the "neon halo":
```
shadow-[0_0_25px_rgba(34,211,238,0.4),0_0_60px_rgba(129,140,248,0.2)]
hover:shadow-[0_0_35px_rgba(34,211,238,0.6),0_0_80px_rgba(129,140,248,0.3)]
```

