# X3D — A new perspective on anatomy

A working educational recreation inspired by the supplied X3D screenshots. Built with Vite, vanilla JavaScript, Three.js, and Lucide. It is independent of the original X3D project.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a static site in `dist/`. `npm run preview` serves the production build.

## What works

- Three interactive example studies: fifth metacarpal fracture, distal radius fracture, and hand anatomy.
- Procedural 3D hand and wrist atlases with bone selection, orbit/pan/zoom, frontal/lateral/oblique camera presets, opacity, highlight, annotations, auto-rotation, and fullscreen.
- Image upload by browse, drag/drop, and clipboard paste. Supports PNG, JPEG, and WEBP, up to 12 MB per file and six views. DICOM is not supported.
- Projection labeling and full image previews. Imported images are resized to a maximum edge of 2,400 pixels for local reference storage; original dimensions are displayed, and the original file is not modified.
- Resident-oriented mock reports and plain-language explanations for the synthetic cases. Uploaded studies support user-authored notes.
- Current study and images persist in browser IndexedDB; settings allow clearing saved images and notes. No images or notes are sent to a server. Hosted site assets and fonts still require network access.
- Export a watermarked PNG illustration, a GLB 3D atlas, an educational TXT report, or a JSON study containing the reference images and notes.
- Responsive desktop and mobile layouts, labeled controls, keyboard-operable camera presets, dialog focus trapping, and reduced-motion support for CSS transitions.

## What this version does not do

**It does not analyze radiographs, identify the anatomy automatically, detect fractures, reconstruct patient-specific geometry, or generate clinical interpretations.**

The demo projections are synthetic renders of the procedural atlas, not acquired X-rays. The example findings are prewritten. The model's fragments and proportions are illustrative. A manually selected atlas for an uploaded study is unrelated to any diagnostic finding in those images. It is possible to select an atlas that does not match the reference images.

There are no calibrated measurements, confidence scores, imaging recommendations, validated physics simulations, treatment comparisons, or personalized rehabilitation predictions. No medical AI weights or provider credentials are bundled. This is a functional educational prototype, not a medical device.

Two radiographic projections can constrain visible anatomy and relationships, but cannot uniquely determine an arbitrary 3D volume. Unseen surfaces require assumptions. Clinically usable reconstruction would require appropriate acquisition geometry, reconstruction methods and priors, validation against ground truth such as CT, and explicit uncertainty assessment. See the [NIH introduction to CT](https://www.nibib.nih.gov/science-education/science-topics/computed-tomography-ct) and research on [biplanar 3D reconstruction](https://arxiv.org/abs/2303.05297). Research results are not validation of this app.

## Source guide

- `src/main.js`: workspace UI, uploads, IndexedDB persistence, reports, dialogs, and exports.
- `src/viewer.js`: Three.js viewer, synthetic reference rendering, PNG capture, and GLB export.
- `src/anatomy.js`: approximate atlas geometry in arbitrary units, with named bones and illustrative fragments.
- `src/cases.js`: synthetic example case descriptions. These must never be presented as findings for user-uploaded images.
- `src/style.css`: responsive workspace design.
- `tests/smoke.mjs`: end-to-end browser checks, including actual WebGL rendering and file exports.

## Extending toward the research concept

An image-analysis service should be a separate server-side component, with model weights and secrets outside the frontend. Add it only after selecting models whose anatomy coverage, intended use, licenses, output semantics, and evaluation results are understood. A 2D vision model and a patient-specific 3D reconstruction model are separate capabilities.

A future response contract should keep these fields distinct:

1. Observations tied to image IDs and locations, with provenance.
2. Anatomy and projection identification, with explicit unknowns.
3. Validated patient-specific geometry, including coordinate system and calibration, or an explicit unavailable result.
4. Uncertainty and unresolved anatomy, supported by calibration data rather than invented percentages.
5. Report text that distinguishes observations, assumptions, and limitations.

If no validated reconstruction is returned, keep the atlas labeled as an illustration. Additional-view optimization would need a validated acquisition model and uncertainty objective. A digital injury twin would also need material properties, boundary conditions, and independent validation of its mechanical behavior; it cannot be inferred from surface shape alone.

## Browser verification

With the dev server running:

```sh
npm test
```

The smoke script uses an installed Chrome on macOS by default. Set `X3D_BROWSER_PATH` to another Chromium executable or install Playwright's Chromium using `npx playwright install chromium`. Override the test origin with `X3D_BASE_URL`. Screenshots and exported fixtures are written to ignored `test-results/`.
