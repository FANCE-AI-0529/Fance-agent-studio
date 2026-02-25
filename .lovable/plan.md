

# Plan: Adapt FloatUI Layout Structure to Landing Page

## Goal
Apply the FloatUI template's layout and structural patterns to the existing HIVE landing page. All existing content (text, CTAs, terminal, sections) is preserved — only the layout format changes.

## Changes Overview

### 1. GlassNavbar.tsx — Adopt FloatUI Navbar Structure

**Current**: Floating glass pill (`rounded-2xl`) centered in viewport
**Target**: Full-width navbar with `max-w-screen-xl mx-auto px-4 md:px-8` container, nav links and CTA inline on desktop, overlay panel on mobile (matching FloatUI's `bg-gray-800 rounded-xl mx-2 mt-2` mobile pattern)

Changes:
- Replace floating pill container with `max-w-screen-xl mx-auto px-4 md:px-8` full-width layout
- Move nav links and CTAs into a single flex row with `flex-1 justify-end` for right-alignment
- Mobile menu: Use FloatUI's overlay pattern (`absolute z-20 top-0 inset-x-0 rounded-xl mx-2 mt-2`) instead of the current fixed dropdown
- Keep glass blur + scroll darkening effect, keep `framer-motion` entry animation
- Keep all existing nav items: 平台架构, MPLP 协议, 技术文档, Login, Book a Demo
- CTA "Book a Demo" uses `rounded-full` pill style (FloatUI's `bg-sky-500 rounded-full`) adapted to HIVE gradient colors

### 2. HeroSection.tsx — Adopt FloatUI Hero Layout

**Current**: `max-w-5xl` centered, badge + heading + subtitle + two buttons + terminal
**Target**: `max-w-screen-xl` outer container with `max-w-4xl` text block, add email input form row alongside existing CTA, add star-rating social proof row, add FloatUI's gradient blur orb background element

Changes:
- Wrap in `max-w-screen-xl mx-auto px-4 md:px-8` with `py-28` spacing (FloatUI pattern)
- Keep status badge, heading, and subtitle exactly as-is
- Replace the two-button CTA row with FloatUI-style inline form: email input + gradient CTA button (styled with HIVE's cyan-indigo gradient instead of sky-500), plus keep "查看技术白皮书" as secondary link below
- Add star-rating social proof row below the form (5 stars + "5.0 by over 200 users" adapted to Chinese: "5.0 · 超过 200 位用户信赖")
- Add FloatUI's gradient blur orb (`absolute inset-0 m-auto max-w-xs h-[357px] blur-[118px]`) behind the hero content, using HIVE's color palette (#c084fc, #22d3ee, #818cf8)
- Keep terminal preview section below, unchanged

### 3. Landing.tsx — Minor Wrapper Adjustment

- Add a `relative` section wrapper around `HeroSection` to properly contain the gradient blur orb (matching FloatUI's `<section className="relative">` pattern)

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/GlassNavbar.tsx` | Full rewrite of layout structure |
| `src/components/landing/HeroSection.tsx` | Layout restructure + email form + social proof |
| `src/pages/Landing.tsx` | Minor wrapper adjustment |

## What Stays the Same

- All text content (Chinese headings, descriptions, nav labels)
- All section components: BentoFeatures, DetailedFeatures, PricingSection, TestimonialsSection, FAQSection, Footer, InviteModal
- ParticleField 3D background
- Color palette and branding
- Terminal preview block
- Framer Motion animations (adapted to new structure)
- All functionality (onBookDemo, onLogin, mobile toggle)

## Technical Notes

- The FloatUI template uses `document.onclick` for closing menus — we will keep our current React state approach which is cleaner
- FloatUI uses `javascript:void(0)` hrefs — we keep our existing `#features` anchors and button `onClick` handlers
- The email form input will be non-functional (visual only, `e.preventDefault()`) and trigger `onBookDemo` on submit, matching the existing invite flow

