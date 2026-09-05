# A Village That Only Opens at Christmas

A phone-first 3D Christmas village for Yera noona. Scroll to walk. The invitation is hidden in the stops.

Live: https://kimbolt1109.github.io/YeraChristmas/

## Run locally

Any static server from this folder:

```
npx --yes serve -p 4173
```

Then open `http://localhost:4173`.

## Replace photos

Put JPGs in `places/` using the same filenames:

| File | Place |
|---|---|
| `hyundai-seoul.jpg` | The Hyundai Seoul |
| `coex-starfield.jpg` | COEX Starfield Library |
| `shinsegae-myeongdong.jpg` | Shinsegae Myeongdong |
| `lotte-world-tower.jpg` | Lotte World Tower market |
| `gwanghwamun-market.jpg` | Gwanghwamun market |
| `cheonggyecheon.jpg` | Cheonggyecheon lights |
| `myeongdong-cathedral.jpg` | Myeongdong Cathedral |

Sources and licenses: `places/CREDITS.txt`.

## Audio

There are no audio files. `audio.js` synthesizes a music-box bed (“Snow over the village”) plus foley with Web Audio. Mute is stored as `yera-xmas-muted`.

## Models

None. The village is constructed geometry in `village.js`.

## Answers

Stored in `localStorage` under `yera-christmas-2026-v2`. Eight taps on the tree star clear it.

## Stack

Vanilla HTML/CSS/JS + vendored Three.js (`vendor/three.module.min.js`). No build step. GitHub Pages serves the folder as-is.
