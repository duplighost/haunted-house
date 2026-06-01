# The House on Mercer Lane

A short, atmospheric **first-person 3D game** built with [Three.js](https://threejs.org/).
You explore a dark, fully-furnished mansion that *feels* haunted — four shadowy
residents drift through the rooms muttering unsettling things, and your own inner
voice narrates the dread. But nothing here is supernatural. When you reach the far
room at the end of the upstairs hall, the lights snap on and the truth lands: it
was only a frightened family in their own home, and **you** were the intruder.
The game ends with your arrest.

> Runtime: ~3–6 minutes. Plays in any modern browser, on **desktop** and **mobile**.

## Play it

It's pure static files — no build step. Because it uses ES modules + an import map,
it must be served over HTTP (not opened as a `file://`).

```bash
# from the repo root
python3 -m http.server 8099
# then open http://localhost:8099/ in a browser
```

Or host the folder on any static host (GitHub Pages, Netlify, etc.) and open it.
Three.js is **vendored locally** (`vendor/three.module.js`) and wired up through the
import map in `index.html`, so the game is fully self-contained — no CDN, no internet
required, no build step.

### Testing

A headless Playwright smoke test (`test.cjs`) loads the game with software WebGL,
asserts it builds with no console errors, drives movement, visits each room, and
runs the full ending sequence:

```bash
npm install            # installs playwright (dev only)
npx playwright install chromium
npm test               # -> node test.cjs
```

## Controls

**Desktop**
- `W A S D` / arrows — move
- Mouse — look (click the page to lock the pointer)
- `Shift` — hurry
- `F` — toggle flashlight

**Mobile / touch**
- Left thumb anywhere on the left half — virtual move stick
- Right thumb anywhere on the right half — drag to look
- `TORCH` button — toggle flashlight

## How it works

| File | Responsibility |
|------|----------------|
| `index.html` | Canvas, UI overlays (title, subtitles, touch sticks, end screen), CSS mood (vignette/grain), Three.js import map |
| `src/main.js` | Bootstrap, render loop, monologue triggers, start/goal/ending glue |
| `src/world.js` | The mansion: shell, two floors, staircase, walls + doorways, furnishing, lighting rig, floor-height & collider data |
| `src/furniture.js` | Primitive-built props (sofas, kitchen, beds, train set, the shrouded "figure", humanoids, the officer) |
| `src/player.js` | First-person controller — look, collide-and-slide movement, stair following, head-bob, flashlight |
| `src/input.js` | Unified keyboard / mouse-pointer-lock / dual-touch-stick input |
| `src/npc.js` | The four residents — loitering activity/patrol behaviour + proximity dialogue |
| `src/dialogue.js` | Two presentation channels (player thought vs. NPC speech) + WebAudio ambience |
| `src/ending.js` | The arrest: lights-on reveal, forced turn to the door, the officer, handcuffs, epilogue |

### Design notes
- **Lighting drives the mood.** The base scene is near-black with cold "moonlight"
  and exponential fog; the player's flashlight is the primary light source until
  the ending flips every fixture on at once.
- **The "haunting" is never supernatural.** Every creepy line is something a scared
  family would actually say to a stranger in their house at night.
- **The strange object** at the end of the hall is a dress form under a bedsheet —
  it reads as a standing figure in the dark, then is plainly mundane once lit.
- Layout: entrance/foyer (south, ground floor) → living room, kitchen, dining,
  library → grand staircase → upstairs landing → children's rooms → a long hallway
  → the far room (the goal, furthest point from the entrance).
