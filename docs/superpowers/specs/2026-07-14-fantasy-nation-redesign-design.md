# Pocket Republic Fantasy Nation Redesign

## Product Goal

Turn the existing three-column treasury demo into a coherent personal-nation product. The experience should preserve the full Pocket Republic world while keeping the hackathon executable scope centered on Kite treasury governance.

## Design Read

Pocket Republic is an immersive consumer product for hackathon judges and early Web3 users. Its visual language combines surreal utopia, whimsical digital-circus energy, dreamlike fantasy landscapes, and a stable financial-governance core.

Design dials:

- Design variance: 9/10
- Motion intensity: 8/10 on the opening screen, 5/10 inside the product
- Visual density: 4/10

This is an original visual system. It may borrow broad qualities such as theatrical staging, elastic motion, saturated toy-like color, fog, noise reveals, and asymmetric editorial composition, but it must not reproduce protected characters, logos, or scene designs from any animation or reference site.

## Information Architecture

The product has one top-level navigation with five destinations:

1. 建国
2. 个人宪法
3. 财政议案
4. 国家地图
5. 国家公报

The former permanent left citizen column and right wallet column are removed. Shared status moves into a compact nation status ribbon. Agent citizens appear where their role is relevant, especially in nation setup and fiscal review.

## Screen Structure

### Opening Screen

- Full-viewport theatrical stage.
- Large original fantasy-nation image slot with a precise art brief.
- Procedural WebGL fluid color field behind the image slot.
- Noise-driven reveal inspired by the technique described in the Codrops Sleepers article.
- Two clear actions: 开始建国 and 查看国库如何运作.
- No evaluator shortcuts or technical proof language.

### Nation Setup

- Nation identity banner with country name, mission, protected assets, and compact Kite treasury status.
- Asymmetric template selector that feels like choosing a territory.
- User-model form for mission and three budget limits.
- Agent citizen passport rail with portrait slots and job descriptions.

### Constitution

- One ceremonial constitution-hall image slot.
- Editable constitutional articles rendered as a charter, not generic dashboard cards.
- Saving remains local and immediately affects treasury decisions.

### Fiscal Proposal

- Proposal form and current proposal occupy one focused review stage.
- Decision summary, constitution triggers, and action buttons remain visible before the debate.
- Agent debate is a horizontal or staggered council sequence.
- Running review keeps the existing Kite provider flow and trace generation.

### Nation Map

- The map becomes the clearest expression of the long-term product.
- One large 16:10 nation-map image slot with interactive department hotspots.
- Kite Treasury is active; 心灵花园, 创作工坊, 学院, 外交邮局, 道具铺, and 国家档案馆 are visible future entrances.
- Each future entrance states its future product role and possible monetization without pretending it is already implemented.

### Gazette

- Editorial receipt layout.
- National gazette receipt, Kite trace, and history are presented as one official record.
- Download trace remains available.

## Image Slots

Every image-dependent region uses an `.art-slot` element with an ID, aspect ratio, title, recommended content, and recommended output dimensions. Slots are intentionally visible during the UI handoff and can later be replaced with `<picture>` or CSS background images without changing the layout.

Required slots:

- ART-00: opening fantasy nation, 1920x1200
- ART-01: nation seed landscape, 1200x900
- ART-02: group portrait of seven Agent citizens, 1600x900
- ART-03: constitution hall, 1400x1000
- ART-04: Kite treasury chamber, 1400x1000
- ART-05: complete department map, 2000x1250
- ART-06: gazette seal and archival ornament, 1000x1000 with transparent background

## Motion System

- Opening reveal: WebGL procedural noise moves the scene from low-saturation dusk to full color.
- Enter transition: an organic iris closes over the opening screen, then reveals the product.
- View transition: fade and translate only, 360ms maximum.
- Buttons: pointer-position ripple plus 0.98 press scale.
- Navigation: one liquid active indicator.
- Cards and hotspots: subtle pointer tilt or spring, disabled on touch and reduced-motion devices.
- Council: opinions reveal in constitutional decision order.
- All continuous effects pause when the page is hidden and honor `prefers-reduced-motion`.

## Color And Type

- Base: deep ink and smoky blue-black for legibility.
- Primary accent: vivid coral red.
- Supporting scene colors: cyan, chartreuse, warm yellow, and pink used in imagery and small artifacts, not as competing CTA colors.
- Primary text: soft white.
- Display type: wide, playful system sans with heavy weight.
- Body type: readable Chinese system sans.
- Financial numbers: monospaced system stack.

## Responsive Behavior

- Desktop uses asymmetry and wide stage layouts.
- Below 900px, each view becomes a strict single column.
- Navigation becomes a five-item bottom dock on mobile.
- All touch targets are at least 44px.
- Image slots preserve their aspect ratio and never cause layout shift.
- No horizontal scrolling is required for primary actions.

## Technical Constraints

- Keep static HTML, CSS, and ES modules.
- Do not add a package manager or network runtime dependency.
- Preserve the Kite provider interface and existing state machine.
- Add a small standalone `effects.js` module for WebGL and interaction effects.
- Fall back to CSS color fields when WebGL is unavailable.
- Keep all functional text in Chinese.

## Verification

- Structural test confirms five main views, seven image slots, no permanent three-column app shell, and one navigation system.
- Existing Kite envelope verification still passes.
- Browser flow verifies entry, setup, constitution editing, proposal review, trace generation, and map navigation.
- Desktop and mobile screenshots verify no overlap, blank canvas, clipped text, or hidden actions.
- Reduced-motion behavior is checked through CSS and runtime guards.

