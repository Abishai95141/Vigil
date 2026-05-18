# Vigil

Knowledge-graph-based AI observability for Kubernetes — presentation build.

This repo contains the **presentation assets** for the Vigil pitch:

- **`/architecture`** — nine brand-faithful, keyboard-paced scenes for screen recording into the pitch video
- **`/simulation`** — the interactive operator UX (React/Babel-in-browser, no build step)

Both are pure static sites. No build pipeline, no server runtime — just open the HTML.

## Deployed

The repo is set up to deploy on **Vercel** as a static site. Once deployed:

- `/` — landing page with links to both surfaces
- `/architecture/` — scene menu (9 tiles)
- `/simulation/` — interactive operator UX

## Quick start (local)

Any static server works. Recommended:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/` — landing page
- `http://localhost:8000/architecture/` — architecture diagrams menu
- `http://localhost:8000/simulation/` — interactive simulation

## Architecture scenes

| # | Scene | Steps | v3 ref |
|---|---|---|---|
| 00 | Cold open · motion | auto-play ~10 s | — |
| 00B | Problem statement | 5 steps | §2 |
| 01 | System architecture | 8 steps | §4 |
| 02 | Binding cascade (T1 → T5 → operator) | 7 steps | §7 |
| 03 | Reasoning fan-out | 6 steps | §15–18 |
| 04 | Evidence chain (4 levels) | 4 steps | §23 |
| 05 | Knowledge graph (live data, 4 scenarios) | 6 phases | §8–9 |
| 06 | Two-tier identity | 7 steps | §9 |
| 07 | Feasibility | 5 steps | §2 · §5 · §6 · §22 |

**Keyboard controls (per scene):**

- `SPACE` / `→` / `Enter` — advance one step
- `←` / `Backspace` — back
- `R` — reset to step 0
- `E` — jump to last step
- `F` — toggle fullscreen
- Click anywhere in the stage — advance

The cold open and KG render auto-play on load; the other seven are operator-paced.

## Simulation chapters

Eight-chapter scenario covering the end-to-end operator flow:

`connect` → `topology` → `flags` → `firing` → `synthesis` → `ask` → `escalate` → `resolved`

Includes the **predictive-watch feature** — click a node, toggle watch, and the exploratory agent monitors for pre-activation patterns on that entity.

## Stack

- HTML / CSS / vanilla JS
- React 18 + Babel in the browser (simulation only)
- Pre-computed force-directed layout for the KG (Python + networkx, output as JSON)

No build step. No package.json. Just HTML.

## Brand

Dark plane (`#0A0A0A`), three type families:

- **Display** — Plus Jakarta Sans
- **Body** — Poppins  
- **Mono** — JetBrains Mono

No colour — state carried by ink tiers, hatch patterns, and dashed/solid borders. Brand tokens live in `architecture/shared.css` and `simulation/styles.css`.

## License

Private — internal presentation build.
