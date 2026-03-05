
# דשבורד אדריכלית העיר — Implementation Plan

## Overview
A fully RTL Hebrew city architect dashboard for managing projects across 5 domains, with localStorage persistence, search, and a slide-in project panel.

## Pages & Layout

### Home Page (single page app)
- **Sticky top nav bar** — action buttons (home, back, print, email) on the left; dashboard title on the right
- **Hero banner** — gradient teal-to-green card with title "מרחב ביניים", subtitle, and a global search input
- **Stats bar** — conditionally shown summary of project counts by status
- **Domain grid** — top row: 2 equal cards (בינוי, פיתוח); bottom row: 3 cards (מיידעים, פעולות, אפליקציות)

## Key Components

1. **DomainCard** — gradient header with icon/name/description/count badge, body lists categories with SubButton grids
2. **SubButton** — white bordered button per item (or category if no items), shows project count, opens ProjectPanel on click
3. **ProjectPanel** — slide-in overlay from left (420px), with:
   - Colored header with breadcrumb + close
   - Add project input row
   - Search/filter input
   - Scrollable project list (name, date, status dropdown, delete with confirm)
   - Footer with status counts
4. **GlobalSearch** — searches all localStorage projects, shows dropdown results with domain color dot and breadcrumb, clicking opens the relevant ProjectPanel
5. **EmailModal** — form dialog with recipient/subject/body fields, generates mailto: link

## Data & State
- All data in localStorage with key pattern `{domain}__{category}__{sub}`
- Project shape: id, name, status, created (Hebrew date), note, history
- No external state library — React useState + localStorage read/write
- Hardcoded HIERARCHY constant defines the domain tree

## Styling
- RTL direction globally, Heebo font from Google Fonts
- Background #F2F1EE, domain-specific color palette
- Status colors: planning (blue), inprogress (amber), review (orange), done (green)
- Custom thin scrollbar, hover animations on SubButtons, fadeIn on grid sections, slideIn on panel
- Print CSS: hide nav, white background, A4-friendly layout

## Files to Create/Modify
- `index.html` — add Heebo font link
- `src/index.css` — RTL base styles, custom scrollbar, print styles, animations
- `src/lib/hierarchy.ts` — HIERARCHY constant + types
- `src/lib/storage.ts` — localStorage helpers (getProjects, saveProjects, searchAll)
- `src/components/TopNav.tsx` — sticky navigation bar
- `src/components/HeroBanner.tsx` — gradient banner with GlobalSearch
- `src/components/GlobalSearch.tsx` — search input + results dropdown
- `src/components/StatsBar.tsx` — conditional stats summary
- `src/components/DomainCard.tsx` — domain card with categories
- `src/components/SubButton.tsx` — item button with count
- `src/components/ProjectPanel.tsx` — slide-in project management panel
- `src/components/EmailModal.tsx` — email compose dialog
- `src/pages/Index.tsx` — compose all components into the dashboard layout
