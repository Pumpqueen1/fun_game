# 🐾 Boston Post

A bow-tied Boston Terrier delivers mail, newspapers and lost socks around a cozy,
stylized Hasenheide neighborhood in Berlin. 3D, third-person, runs in a desktop browser.

## Run it

No build step and nothing to install besides Python 3 (three.js loads from a CDN, so you need internet):

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Run and steer |
| E | Interact (Postamt, neighbors) |
| Space | Chew a bone: chaotic zoomies you can barely steer |
| B | Bark (scares squirrels, snaps you out of a distraction) |
| C (hold) | Selfie cam |
| 1–4 | Spend skill points (Speed, Bag, Focus, Bone pouch) |
| R | Teleport back to the Postamt |
| Mouse wheel | Zoom |

## What's in the game

- **Deliveries**: pick up a route at the yellow Postamt on Hasenheide, follow the beams to the mailboxes.
- **Lost socks**: found lying around; each belongs to an address.
- **Squirrels**: get too close in the park and you get distracted and dragged after them.
- **Bones**: collect them for a zoomies burst.
- **Neighbors**: six side quests (Frau Schmidt, Mehmet, Lina, Opa Horst, Ayşe, Jonas).
- **Leveling**: XP, treats and four upgradable skills, saved in the browser.

## Code layout

- `index.html`: page, HUD and menu
- `src/world.js`: the map (streets, park, landmarks, mailboxes), generated from a fixed seed
- `src/dog.js`: the Boston model and animation
- `src/entities.js`: neighbors, squirrels, bones, socks, beams
- `src/quests.js`: side quest definitions
- `src/game.js`: game loop, input, deliveries, squirrels, quests, HUD

## Not built yet

Multiplayer (co-op shared routes and competitive delivery races). The menu has placeholders,
and the world is seeded so every player would see the same map.
