# E2E Test Infra: Material Design 3 (M3) Refactoring for wallpaper_app

## Test Philosophy
- Opaque-box, requirement-driven testing. Validates compliance with `ORIGINAL_REQUEST.md`.
- Methodology: Category-Partition + Boundary Value Analysis + State Transition + Visual & DOM Verification.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Unit/Token) | Tier 2 (Boundary/Edge) | Tier 3 (Cross-Feature) | Tier 4 (Workload/Workflow) |
|---|---------|-------------|:-------------------:|:----------------------:|:----------------------:|:--------------------------:|
| 1 | M3 Color Tokens | R1 | 5 | 5 | ✓ | ✓ |
| 2 | 8 Theme Palettes | R1 | 5 | 5 | ✓ | ✓ |
| 3 | M3 Corner Radii (4-9999px) | R1 | 5 | 5 | ✓ | ✓ |
| 4 | M3 Elevation Levels 0-5 | R1 | 5 | 5 | ✓ | ✓ |
| 5 | M3 Typography System | R1 | 5 | 5 | ✓ | ✓ |
| 6 | Navigation Rail & Pill Indicator | R2 | 5 | 5 | ✓ | ✓ |
| 7 | Custom Titlebar & Drag Region | R2 | 5 | 5 | ✓ | ✓ |
| 8 | Surface Container Progression | R2 | 5 | 5 | ✓ | ✓ |
| 9 | M3 Wallpaper Cards & Skeleton | R3 | 5 | 5 | ✓ | ✓ |
| 10 | M3 Buttons & Controls | R3 | 5 | 5 | ✓ | ✓ |
| 11 | Segmented Source Control | R3 | 5 | 5 | ✓ | ✓ |
| 12 | Contextual Filter Chips | R3 | 5 | 5 | ✓ | ✓ |
| 13 | M3 Form Controls & Switch | R3 | 5 | 5 | ✓ | ✓ |
| 14 | Details Modal (28px radius) | R3 | 5 | 5 | ✓ | ✓ |
| 15 | Fullscreen Photo Viewer Lightbox | R3 | 5 | 5 | ✓ | ✓ |
| 16 | SnackBar Notification Toast | R3 | 5 | 5 | ✓ | ✓ |
| 17 | Motion Curves & Durations | R4 | 5 | 5 | ✓ | ✓ |
| 18 | State Layers & Ripple Effect | R4 | 5 | 5 | ✓ | ✓ |
| 19 | Tab Switching & Transitions | R4 | 5 | 5 | ✓ | ✓ |
| 20 | Tauri IPC Functional Integrity | AC | 5 | 5 | ✓ | ✓ |

## Test Architecture
1. **Tier 1 — M3 Token & Static Style Validator (`scripts/verify-tokens.mjs`)**:
   - Parses `ui/styles.css` AST/tokens.
   - Verifies all `--md-sys-color-*`, `--md-shape-corner-*`, `--md-elevation-*`, and `--md-sys-motion-*` definitions.
   - Verifies 8 theme palettes (`.theme-indigo`, `.theme-ocean`, `.theme-emerald`, `.theme-sunset`, `.theme-crimson`, `.theme-lavender`, `.theme-amber`, `.theme-amoled`).
2. **Tier 2 — Component DOM & Interaction Test Suite (`test/component-m3.test.js` via Vitest + JSDOM)**:
   - Sets up mock Tauri IPC bridge and loads `ui/index.html` + `ui/app.js`.
   - Tests Navigation rail tab switching and active pill capsule positioning.
   - Tests Segmented source buttons and dynamic filter chip toggles.
   - Tests Details modal dialog opening, data binding, and closing.
   - Tests Fullscreen lightbox zoom levels (40% to 600%), pan bounds, and keyboard shortcuts.
   - Tests SnackBar trigger and auto-dismiss timing.
3. **Tier 3 — Cross-Feature State Integration (`test/integration.test.js`)**:
   - Tests dynamic theme switching combined with modal/card rendering.
   - Tests online source search -> card grid render -> details modal -> download & set wallpaper.
   - Tests local wallpaper scanning -> card hover actions -> delete wallpaper.
4. **Tier 4 — End-to-End Workflow & Visual Scenario Tests (`test/e2e-workflow.test.js`)**:
   - Complete user lifecycle: startup -> settings theme switch to AMOLED -> explore Unsplash -> open photo lightbox -> zoom in -> close -> gallery tab -> verify state persistence.

## Verification Commands
- `node scripts/verify-tokens.mjs`
- `npx vitest run`
- `cargo check && cargo test`
