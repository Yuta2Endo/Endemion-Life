# Google Play visual assets

Source artwork follows the existing Endemion Life mark from `apps/web/src/app/icon.svg`:
dark cosmic background, gold compass/diamond, and restrained serif typography.

## Required exports

- `endemion-life-icon.png`: 512 × 512 px, PNG, opaque background.
- `endemion-life-feature-graphic.png`: 1024 × 500 px, PNG, feature graphic.

The SVG files in this directory are the editable source artwork and the PNG files are
the current exports. Keep the icon artwork centered because Play may apply its own
adaptive mask.

## Google Play upload

- Store listing app icon: `endemion-life-icon.png`.
- Store listing feature graphic: `endemion-life-feature-graphic.png`.

The Android launcher now uses this same icon through the adaptive and legacy launcher
resources under `android/app/src/main/res/`. The store-listing PNG and launcher icon
therefore stay visually consistent.

## Smartphone screenshots

The portrait screenshot exports are in `assets/google-play/screenshots/`:

1. `01-live-in-endemion.png` — current mobile app screen.
2. `02-choices-shape-life.png` — events, choices, and gameplay outcomes.
3. `03-legacy-lives-on.png` — ending, chronicle, and generational legacy.

Each export is 1080 × 1920 px. The SVG files with the same names are editable
composition sources; the embedded gameplay images come from the repository's real
game captures or the connected Android device.
