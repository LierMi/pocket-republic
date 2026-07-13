# Pocket Republic Fantasy Nation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-column treasury demo with an immersive, structured personal-nation product while preserving the existing Kite governance flow.

**Architecture:** `index.html` owns semantic screen structure, `styles.css` owns the fantasy product system and responsive layouts, `app.js` retains product state and Kite logic, and a new `effects.js` owns optional WebGL and pointer effects. A structural verifier protects the product information architecture independently of visual QA.

**Tech Stack:** Static HTML5, CSS, ES modules, WebGL 1, Canvas fallback, browser localStorage, existing Kite provider adapter.

## Global Constraints

- All functional UI text remains Chinese.
- No protected animation characters, logos, or copied scene designs.
- No package or network runtime dependencies.
- Preserve `createKiteProvider()` and the payment trace envelope.
- All motion honors `prefers-reduced-motion`.
- The primary navigation has exactly five destinations.
- The permanent three-column shell is removed.

---

### Task 1: Structural Contract

**Files:**
- Create: `scripts/verify-product-structure.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: the static page markup.
- Produces: a command that exits non-zero when required views, image slots, or navigation contracts are missing.

- [ ] Write assertions for five `data-view-panel` values, seven `data-art-slot` values, the `nationStatusRibbon`, and the absence of `treasury-app` three-column shell markup.
- [ ] Run `node scripts/verify-product-structure.mjs` and confirm it fails against the old page.
- [ ] Replace the old shell with the approved full-stage information architecture.
- [ ] Run the verifier and confirm it passes.

### Task 2: Visual System And Responsive Layout

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Consumes: semantic classes and data attributes from `index.html`.
- Produces: one coherent dark fantasy theme, desktop stage layouts, mobile single-column layouts, and stable image aspect ratios.

- [ ] Add color, type, spacing, radius, elevation, and motion tokens.
- [ ] Build the opening stage, nation ribbon, top navigation, and five view-specific layouts.
- [ ] Add desktop asymmetry and mobile bottom dock behavior.
- [ ] Add accessible focus, hover, pressed, disabled, and reduced-motion states.

### Task 3: Motion And Fluid Interaction Layer

**Files:**
- Create: `effects.js`
- Modify: `index.html`
- Modify: `app.js`

**Interfaces:**
- Produces: `initVisualEffects({ onEnterComplete })`, `playEntryExit()`, `playViewTransition(panel)`, and `pulseElement(element)`.
- Consumes: the entry canvas, entry screen, buttons, navigation, and active view panel.

- [ ] Implement WebGL capability detection and a procedural fragment shader with time, pointer, and reveal uniforms.
- [ ] Add a no-WebGL CSS fallback and page-visibility pause.
- [ ] Add ripple and press feedback to buttons.
- [ ] Trigger organic entry exit and per-view transitions from the existing state machine.
- [ ] Disable nonessential motion for reduced-motion users.

### Task 4: Product State Rebinding

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: existing nation state, constitution articles, requests, agents, and Kite provider.
- Produces: the same setup, constitution, review, map, and trace behaviors in the new DOM.

- [ ] Rebind new nation ribbon, citizen rail, proposal stage, decision stage, map hotspots, and gazette nodes.
- [ ] Preserve setup save, article editing, proposal submission, review, override, trace download, and history.
- [ ] Keep hidden demo query behavior without adding evaluator-facing UI.

### Task 5: Asset Handoff

**Files:**
- Modify: `assets/UI_ASSET_BRIEF.md`
- Modify: `README.md`

**Interfaces:**
- Produces: a one-to-one mapping from each visible image slot to content, dimensions, cropping, and replacement instructions.

- [ ] Document ART-00 through ART-06 with prompts and negative constraints.
- [ ] Explain that visual references are mood references only and must not be copied literally.
- [ ] Update the project structure and demo flow.

### Task 6: Verification

**Files:**
- Test: `scripts/verify-product-structure.mjs`
- Test: `scripts/verify-kite-envelope.mjs`

**Interfaces:**
- Produces: fresh structural, syntax, Kite envelope, browser-flow, and responsive evidence.

- [ ] Run both Node verifiers and JavaScript syntax checks.
- [ ] Start or reuse the local server on port 5180.
- [ ] Verify the complete product flow in the browser.
- [ ] Capture and inspect desktop and mobile screenshots.
- [ ] Inspect console errors and reduced-motion behavior.

