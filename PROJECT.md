# Project: Material Design 3 (M3 / Material You) Frontend Refactoring for wallpaper_app

## Architecture
- **Runtime**: Tauri v2 Desktop Application on Windows 11 (Mica vibrancy, custom window controls).
- **Frontend Stack**: Vanilla HTML5, CSS3, Modern ES6+ JavaScript served from `ui/` directory (`index.html`, `styles.css`, `app.js`, `assets/icons/`).
- **Styling Architecture**: M3 Design Token Architecture in `ui/styles.css`:
  - Section 1: M3 Root Color Tokens, Dynamic Palettes, Shape Tokens, Elevation Levels 0-5, Typography.
  - Section 2: Window Frame, Title Bar, Navigation Rail with Pill Active Indicators.
  - Section 3: Surface Containers & Layout Grids (Gallery, Explore, Settings).
  - Section 4: M3 Component System (Wallpaper Cards, State Layers, Buttons, Chips, Segmented Controls, Switches, Sliders, Inputs, Dropdowns).
  - Section 5: Dialogs & Overlays (M3 Details Modal with 28px corners, Fullscreen Photo Viewer Lightbox, SnackBar Toast).
  - Section 6: Motion System (M3 Standard/Emphasized Easing, Duration Tokens, Keyframe Animations, State Layers, Zero-Dependency Ripple Engine).
- **IPC Contract**: 18 Tauri v2 backend IPC commands in `src/main.rs` referenced via `invoke` in `ui/app.js`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | M3 Color System & Dynamic Tokens | Complete `--md-sys-color-*` tokens for light & dark themes, tonal role mappings | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 2 | 8 Dynamic Theme Palettes | 7 Material You colorways (Indigo, Ocean, Emerald, Sunset, Crimson, Lavender, Amber) + AMOLED Black | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 3 | M3 Shape Corner System | 4px xs, 8px sm, 12px md, 16px lg, 28px xl, 9999px full pill | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 4 | M3 Elevation System | Level 0 to Level 5 multi-layer ambient + key composite shadows | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 5 | M3 Typography System | 5 font family presets + M3 scale tokens (Display, Headline, Title, Body, Label) | M1 | ORIGINAL_REQUEST §R1 | DONE |
| 6 | M3 Navigation Rail | Vertical rail with active pill capsule indicator (`.indicator-pill`), label alignment | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 7 | Window Titlebar & Drag Region | Custom Titlebar with Tauri `data-tauri-drag-region`, window buttons & search integration | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 8 | Surface Container Hierarchy | Surface container progression (surface-container-lowest..highest) for tabs & cards | M2 | ORIGINAL_REQUEST §R2 | DONE |
| 9 | M3 Wallpaper Cards | Elevated & Outlined cards, uniform 16:10 / original ratio, skeleton shimmer, hover action overlay | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 10 | M3 Buttons & Controls | Filled, Filled Tonal, Outlined, Text, Danger, Icon buttons, FAB | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 11 | Segmented Source Control | Pexels, Bing, Unsplash, Wallhaven segmented pill button group with active container | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 12 | Contextual Filter Chips | Tag, Market, Category, Sort filter chips with selected tonal container & check icon | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 13 | Form Controls & Switch | M3 Text Inputs, Custom Dropdown Select, M3 Switch toggle with icon/state layer, Slider | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 14 | Details Modal Dialog | 28px corner radius, `surface-container-high`, tonal elevation, responsive layout, full metadata display | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 15 | Fullscreen Photo Viewer Lightbox | 40%-600% zoom, pan/drag, toolbar controls, keyboard shortcuts (Esc, Arrow keys, +, -) | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 16 | SnackBar Toast | M3 standard radius, `inverse-surface` + `inverse-on-surface`, entrance/exit motion | M3 | ORIGINAL_REQUEST §R3 | DONE |
| 17 | M3 Motion Curves & Durations | Easing curves (`cubic-bezier(0.2, 0, 0, 1)`), duration tokens (200ms, 400ms, 600ms) | M4 | ORIGINAL_REQUEST §R4 | DONE |
| 18 | State Layers & Ripple Effect | Hover 8%, Focus 12%, Active 12% opacity state layers + click ripple feedback | M4 | ORIGINAL_REQUEST §R4 | DONE |
| 19 | Tab Switching & Page Motion | Smooth cross-fade and slide transitions between Gallery, Explore, Settings tabs | M4 | ORIGINAL_REQUEST §R4 | DONE |
| 20 | Rust IPC Functional Integrity | 18 Tauri IPC commands verified and preserved | M5 | ORIGINAL_REQUEST §AC | DONE |
| 21 | Settings Persistence | Live theme and font switching, auto-saving config to backend | M1, M5 | ORIGINAL_REQUEST §AC | DONE |
| 22 | Local Wallpaper Management | Scan directory, image previews, delete, set desktop wallpaper | M5 | ORIGINAL_REQUEST §AC | DONE |
| 23 | Online Wallpaper Search & Pagination | Keyword search, source switching, pagination / infinite scroll for 4 providers | M5 | ORIGINAL_REQUEST §AC | DONE |
| 24 | E2E Opaque-Box Test Suite | Comprehensive 4-tier automated test suite covering all features | TEST | ORIGINAL_REQUEST §AC | DONE |
| 25 | Adversarial Coverage Hardening & Forensic Audit | White-box edge case stress testing and integrity verification (890 checks pass) | M5 | Iteration Policy | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| TEST | E2E Testing Track | Automated M3 Token Validator, Vitest/JSDOM Test Harness, Playwright E2E Suite | none | DONE |
| M1 | M3 Color System & Design Tokens | CSS Custom Properties, 8 Themes, Shapes, Elevations, Typography, Theme Engine in app.js | none | DONE |
| M2 | Navigation Rail, Titlebar & Containers | Custom Titlebar drag segregation, Navigation Rail with Pill active capsule, Surface Containers | M1 | DONE |
| M3 | M3 Components, Cards & Dialogs | Wallpaper Cards, Buttons, Segmented Controls, Chips, Form Inputs/Switch/Slider, Details Modal, Lightbox, SnackBar | M1, M2 | DONE |
| M4 | Motion System, State Layers & Transitions | Easing curves, Duration tokens, Hover/Focus/Pressed State Layers, Ripple effect, Tab Transitions | M1, M2, M3 | DONE |
| M5 | Final Integration, 100% E2E Pass & Audit | Full verification across all test tiers, adversarial hardening, forensic integrity audit | TEST, M1-M4 | DONE |
