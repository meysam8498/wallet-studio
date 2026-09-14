---
name: Daftaram (دفتر من)
description: Personal Persian accounting app — ledger-first, RTL, mobile-to-desktop
version: "1.0"
colors:
  background: "oklch(0.984 0.004 85)"
  foreground: "oklch(0.27 0.008 75)"
  card: "oklch(0.999 0.002 85)"
  primary: "oklch(0.3 0.01 75)"
  secondary: "oklch(0.952 0.006 85)"
  muted-foreground: "oklch(0.52 0.012 75)"
  accent: "oklch(0.94 0.008 85)"
  destructive: "oklch(0.55 0.18 27)"
  chart-1: "oklch(0.62 0.09 130)"
  chart-2: "oklch(0.6 0.1 250)"
  chart-3: "oklch(0.68 0.12 85)"
  chart-4: "oklch(0.58 0.08 320)"
  chart-5: "oklch(0.55 0.12 30)"
typography:
  display:
    fontFamily: Vazirmatn
    fontWeight: 500
  body:
    fontFamily: Vazirmatn
    fontSize: 0.875rem
    lineHeight: 1.6
  eyebrow:
    fontFamily: Vazirmatn
    fontSize: 0.6875rem
    letterSpacing: 0.08em
  money:
    fontFamily: Vazirmatn
    fontFeature: "tnum"
rounded:
  sm: 3px
  md: 4px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.sm}"
  page-padding:
    padding: "16px (mobile: always 16px, never 24px)"
---

# Daftaram Design System

## Overview

A calm paper ledger: warm off-whites, hairline borders, ink typography. One
glance shows the month's money; everything else steps back. Persian-first,
RTL always, digits always Persian (Tabular).

## Colors

Ink on warm paper. A single destructive red is the only saturated interrupt —
used for negative balances and delete confirmations only.

## Typography

Vazirmatn everywhere. Display sizes shrink one step on `<400px` viewports
(text-4xl → text-3xl, text-2xl → text-xl). Money values use tabular numerals
(`tabular-nums`) and must never wrap: give them `truncate` with a bounded
container, never a fixed width.

## Layout — mobile first (360px is the design floor)

- Page padding: **16px on mobile, 24px from `sm:` up** (`px-4 sm:px-6`).
- No horizontal scroll, ever. Every money value sits in a `min-w-0` flex
  child with `truncate`; every button row wraps (`flex-wrap`) or becomes a
  horizontally scrollable rail (`overflow-x-auto` with edge fade).
- Breakpoints: single column below `sm`; 3-col stats from `sm`; two-pane
  ledger grid only from `lg`.
- Sticky header is `h-14` on mobile with `px-4`; brand text hides below
  `xs` if space is tight, never the actions.
- Sheets/dialogs: `w-[calc(100%-2rem)] sm:max-w-lg`, content scrolls with
  `max-h-[85dvh] overflow-y-auto`, footer buttons full-width on mobile.
- Respect safe areas: viewport-fit=cover + `env(safe-area-inset-*)`
  padding for Android edge-to-edge and future iOS.

## Components

Buttons `h-9` (sm `h-8`); touch targets never below 40px effective on
mobile. Cards use hairline borders, no shadows. Tabs are segmented
controls. Empty states are centered dashed boxes with one action.

## Do's and Don'ts

- DO keep every screen usable at 360×740 without horizontal scroll.
- DO use Persian digits via `faDigits()` for all user-facing numbers.
- DON'T fix widths on text containers (`min-w-[350px]` is forbidden — use
  `w-full max-w-sm`).
- DON'T let a money string break a layout: truncate + title, full value in
  the detail view.
