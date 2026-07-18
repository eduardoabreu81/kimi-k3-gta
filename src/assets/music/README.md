# 🎵 Drop your music here

Each subfolder is a GTA-style **radio station** in the game:

| Folder        | Station                 | Widget button |
| ------------- | ----------------------- | ------------- |
| `eletronica/` | Electronic              | **ELE**       |
| `rock/`       | Rock                    | **ROK**       |
| `synthwave/`  | Synthwave / retrowave   | **SYN**       |

## How to use

1. Drop audio files into the station's folder.
   Formats: `.mp3` `.ogg` `.wav` `.m4a` `.flac` — mix and match, as many
   files per folder as you like.
2. No code changes needed: the Vite build discovers files automatically via
   `import.meta.glob` (see `src/lib/music.ts`).
3. `npm run dev` to test · `npm run build` to publish.

## Behavior

- The radio plays across the whole site and inside the `/jogar` game.
- Shuffle: random order, never repeating the previous track; when the list
  ends it reshuffles. A single file loops.
- The track name shown in the widget comes from the file name
  (e.g. `04 - Night Drive.mp3` shows as "Night Drive" — leading track
  numbers are stripped).
- The chosen station is persisted in the browser
  (`localStorage` key `gtamini.radio`); clicking the active station turns
  the radio off.
- Stations with **no files** show up disabled in the widget.
- The in-game **M** mute only affects sound effects, not the radio.

Tip: prefer optimized files (~128–192 kbps) so the site stays fast on
GitHub Pages.
