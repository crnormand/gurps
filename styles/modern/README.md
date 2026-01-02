# Modern Sheet Design System

A design system for the GURPS Foundry VTT modern character sheet, optimized for data-dense TTRPG interfaces.

## Core Principles

### Data-Dense Interface Design

GURPS character sheets are **functional tools for expert users**. Users scan for specific values (skill levels, modifiers, equipment weights) rather than reading linearly. This demands:

- Compressed type scales (1.125 ratio vs editorial 1.25-1.333)
- High information density with clear visual hierarchy
- Hierarchy through weight and color, not size

### Foundational Rules

| Principle | Why |
|-----------|-----|
| **12px Minimum** | WCAG accessibility compliance |
| **8px Grid** | Consistent visual rhythm |
| **Tabular Figures** | Numeric columns align properly |
| **CSS Variables** | Runtime theme switching (light/dark) |
| **No Hardcoded Colors** | Theme support requires variables |
| **No `!important`** | Maintainable specificity |

---

## File Structure

```
modern/
├── _variables.scss      # Design tokens (SCSS + CSS custom properties)
├── _mixins.scss         # Reusable style patterns
├── _utilities.scss      # Utility classes
├── _base.scss           # Core styles + theme switching
├── _index.scss          # Module forwards
└── components/          # Component-specific styles
```

---

## CSS Variables

CSS variables (`var(--ms-*)`) are defined at `body` level and automatically switch between light and dark themes.

**All components** (sheet and dialogs): Use CSS variables. No manual dark theme handling needed.

SCSS variables (`$ms-*`) exist only as source definitions in `_variables.scss` for the theme mixins. Do not use them directly in component styles.

---

## Typography

### Scale (1.125 Major Second)

| Token | Size | Use |
|-------|------|-----|
| `--ms-font-xs` | 12px | Labels, table headers (minimum allowed) |
| `--ms-font-sm` | 13px | Table content, descriptions |
| `--ms-font-md` | 14px | Primary content (base) |
| `--ms-font-lg` | 16px | Emphasis |
| `--ms-font-xl` | 18px | Character name only |

### Weight Hierarchy

```
Body (400) → Labels (500) → Headers (600) → Key values (700)
```

Use weight as primary hierarchy tool. Size changes should be minimal.

### Rules

- Always use `font-variant-numeric: tabular-nums` for numbers
- Always add `letter-spacing: 0.03em` to uppercase text
- Never use font sizes below 12px

---

## Color System

### Light Theme

| Category | Token | Hex | Purpose |
|----------|-------|-----|---------|
| Background | `--ms-bg` | #f8f6f2 | Main background |
| | `--ms-bg-card` | #ffffff | Elevated cards |
| | `--ms-bg-hover` | #f0ede8 | Hover states |
| | `--ms-bg-section` | #fafaf8 | Zebra striping |
| Text | `--ms-text` | #1a1a1a | Primary (16:1 contrast) |
| | `--ms-text-muted` | #555555 | Secondary (7:1) |
| | `--ms-text-dim` | #888888 | Tertiary (4.5:1) |
| Semantic | `--ms-accent` | #3e6a4d | Interactive elements |
| | `--ms-advantage` | #2e5a3e | Positive values |
| | `--ms-disadvantage` | #8b3a3a | Negative values |
| | `--ms-hp` | #b83232 | Hit points |
| | `--ms-fp` | #3268a8 | Fatigue points |

### Dark Theme

Activates via `body.theme-dark` (Foundry setting) or `prefers-color-scheme: dark` (system preference).

Design principles:
- **Warm base** (#1c1a17) - no pure black
- **Warm text** (#e8e4dc) - no pure white
- **Lightened semantics** - colors brightened for dark background visibility
- **Inverted borders** - lighter than background, not darker

---

## Spacing

### 8px Grid

| Token | Value | Use |
|-------|-------|-----|
| `--ms-space-1` | 2px | Micro gaps |
| `--ms-space-2` | 4px | Tight padding |
| `--ms-space-3` | 6px | Row padding |
| `--ms-space-4` | 8px | Standard (default) |
| `--ms-space-6` | 12px | Section gaps |
| `--ms-space-8` | 16px | Large gaps |
| `--ms-space-12` | 24px | Section margins |

### Rule: Internal < External

Gaps within elements must be smaller than gaps between elements. This creates visual grouping without borders.

---

## Adding Components

1. Create `components/_my-component.scss`
2. Import mixins: `@use '../mixins' as *;`
3. Use CSS variables for all themeable values
4. Follow `ms-` class naming convention

---

## Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Minimum font | 12px (`--ms-font-xs`) |
| Color contrast | WCAG AA (4.5:1 minimum) |
| Focus visibility | Accent border + shadow ring |
| Numeric alignment | Tabular figures |
| Text scaling | rem units (not px) |
