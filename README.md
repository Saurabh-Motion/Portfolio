# Freelance Motion Designer & 3D Art Director Portfolio

A minimalist, high-end portfolio website inspired by modern Awwwards and FWA winning creative studios. Designed with a dark neutral palette, bold oversized typography, an introductory preloader animation, and a frosted glass fixed navigation bar.

---

## Visual & Technical Highlights

1. **Awwwards-Winning Aesthetic**:
   - **Dark Neutral Palette**: Deep obsidian (`#08080a`), dark graphite, subtle hairline borders (`rgba(255, 255, 255, 0.08)`), and electric acid lime accents (`#d4ff00`).
   - **Bold Oversized Typography**: Google Fonts `Syne` (display weights 700/800) paired with `Space Grotesk` (technical metadata) and `Plus Jakarta Sans`.
   - **Film Grain Texture**: Subtle hardware-accelerated SVG noise overlay for tactile cinematic depth.

2. **Introductory Preloader Sequence**:
   - Numerical counter with non-linear easing (`00%` to `100%`).
   - Animated kinetic telemetry status messages ("COMPILING SHADER CACHES...", "INITIALIZING PROCEDURAL GEOMETRY...", "RENDER SYSTEM READY.").
   - Split-curtain shutter reveal with cubic-bezier easing.
   - `ESC` or `Skip Intro` button to bypass instantly.

3. **Fixed Frosted Glass Navigation**:
   - Fixed header with `backdrop-filter: blur(20px) saturate(160%)`.
   - Live availability status indicator (`● Available for Q2/Q3 Commissions`).
   - Interactive audio synthesizer toggle with animated equalizer bars.
   - Magnetic CTA button with subtle hover spring effect.
   - Fullscreen mobile drawer navigation for smaller viewports.

4. **Hero & Interactive Canvases**:
   - Kinetic headline with filled and outline typography treatments.
   - Live real-time world clock (NYC/London time zones).
   - Generative particle constellation background that reacts dynamically to mouse velocity.
   - Metric callouts (10+ Years of Craft, 48M+ Particles, 8 Awwwards/FWA Accolades).

5. **Featured Showreel HUD**:
   - Cinema-aspect ratio container with interactive procedural 3D motion graphic generation.
   - Live timecode scrubber, custom play/pause HUD toggle, visualizer mode switcher (Procedural, Cybernetic, Spectral, Geometric), and fullscreen API trigger.

6. **Curated Selected Works & Interactive Project Modal**:
   - 6 detailed motion design projects:
     1. *NEURA // 01* — Cybernetic Brand Identity & 3D Title Sequence
     2. *KINETIX LABS* — Spatial Audio Visualizer & Kinetic Typography
     3. *AETHER CHRONOS* — High Horology Film & Kinetic CGI Showcase
     4. *CHROMA SHIFT* — Festival Mainstage Visual Identity & Motion System
     5. *SYNAPSE GT* — Next-Gen Electric Hypercar Reveal & HUD Experience
     6. *MONOLITH // REBRAND* — Kinetic Identity System & Generative Brand Guidelines
   - Each project card features an individual 60 FPS canvas animation tailored to its concept (neural synapses, audio waveforms, horology gears, chromatic vortices, wind tunnels, parametric grids).
   - Click any card to launch the comprehensive Project Detail Modal with high-resolution visualizer, technical pipeline (Houdini, Cinema 4D, Octane, Unreal Engine 5), artistic statement, and key production metrics.

7. **Micro-Interactions & Tactile Polish**:
   - Custom magnetic mouse cursor with contextual states (`VIEW` over cards, `PLAY` over showreel, magnetic snap on CTA buttons).
   - Synthesized Web Audio API micro-tones for subtle tactile click/hover feedback (opt-in via navigation toggle).
   - Giant magnetic contact email CTA button with one-click copy and toast notification feedback.

---

## How to View the Portfolio

You can view the portfolio directly by opening `index.html` in any modern web browser (Chrome, Safari, Firefox, Edge, Arc):

```bash
# On macOS:
open /Users/Saurabh/PORTFOLIO/index.html
```

Or serve via any static web server:
```bash
# Python 3 HTTP server:
python3 -m http.server 8000

# Open in browser:
# http://localhost:8000
```

---

## File Structure

```
PORTFOLIO/
├── index.html          # Semantic HTML5 single-page application structure
├── styles.css          # Design tokens, typography, layout, animations & glassmorphism
├── script.js           # Preloader, cursor, canvases, showreel HUD, modal, Web Audio engine
├── projects-data.js    # Structured project metadata, art direction, and specs
└── README.md           # Documentation and features overview
```
