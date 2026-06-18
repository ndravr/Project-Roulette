# Project Roulette

Project Roulette is a Windows Electron app for running randomized team-list rounds. It loads `.txt` lists, presents each list as a home-screen tile, shuffles the selected names, and steps through the round with animated target effects.

## App Features

- Team-list tiles are generated from `.txt` files in `lists/`.
- Each list file uses one name per line.
- Blank lines and lines beginning with `#` are ignored.
- The selected list is shuffled at the start of each round.
- Mercy Level controls how many upcoming names are visible in the queue.
- The round keeps the full shuffled list; Mercy Level only changes the visible queue window.
- The Fortune/Jokes toggle switches the flavor text shown with each active name.
- Fortune mode uses `fortune-cookie-messages.json`.
- Jokes mode fetches safe programming jokes from JokeAPI.
- `Next` advances through the round with the animated cat/yarn target effect.
- At the end of a round, the button changes to `Go to Home`.
- Keyboard controls:
  - `Space` or `Enter`: advance the round
  - `Q` or `Esc`: return home

## Project Composition

```text
build-version.ini
run_Build.bat
scripts/
  sync-build-version.js

desktop/
  main.js       Electron main process
  preload.js    Renderer bridge for app-specific desktop APIs

index.html      Home screen and arena markup
script.js       Renderer behavior and round state
styles.css      UI styling and animation rules

fortune-cookie-messages.json
shown-jokes/
  shown-jokes.json
cat.png
cat.gif
yarn.svg
project_roulette_font/
build/icon.ico

lists/          Source team-list files
dist/           Generated build output
```

## Runtime Architecture

`package.json` points Electron at `desktop/main.js`. The main process creates the desktop window, loads `index.html`, reads list files from disk, and exposes those results through IPC handlers.

`desktop/preload.js` exposes a small `window.projectRouletteDesktop` API to the renderer:

- `readTeamLists()` returns the `.txt` files found in `lists/`.
- `readFortuneMessages()` returns the fortune message array from `fortune-cookie-messages.json`.

The renderer files are the actual application UI:

- `index.html` defines the setup screen, list library, Fortune/Jokes tile, Mercy Level tile, arena, queue, and controls.
- `styles.css` defines the visual theme, tile layout, responsive behavior, slider styling, and arena animations.
- `script.js` owns list selection, shuffling, Mercy Level behavior, round progression, fortune/joke loading, keyboard controls, and animation timing.

## Team Lists

Add or edit source lists in `lists/`.

Example:

```text
Alice
Bob
Charlie
# This line is ignored
Diana
```

Every `.txt` file becomes one selectable tile on the home screen. Rebuild the app after changing source lists if the packaged output should include the updated files.

## Flavor Text

The Fortune/Jokes tile controls which text source is used during a round.

Fortune mode:

- Reads from `fortune-cookie-messages.json`.
- Deduplicates and trims messages in memory.
- Avoids repeating a fortune within the same round until the unused pool is exhausted.

Jokes mode:

- Calls `https://v2.jokeapi.dev/joke/Programming?safe-mode`.
- Supports both single-part and two-part JokeAPI responses.
- Uses a sequence guard so stale async responses cannot overwrite newer round text.
- Records displayed jokes in `shown-jokes/shown-jokes.json`.
- Skips jokes already shown in the current session or recorded in `shown-jokes/shown-jokes.json`.
- Prefetches the next joke while the current name is displayed.

`shown-jokes/shown-jokes.json` is stored at the repository root when the app is run from this checkout. Delete that file to reset the persistent joke history. The app recreates the file automatically.

## Development

Install dependencies:

```powershell
npm install
```

Run the Electron app:

```powershell
$env:ELECTRON_RUN_AS_NODE=$null
npm start
```

The `ELECTRON_RUN_AS_NODE` line is useful in shells where Electron was previously forced into Node mode.

## Fast Build

Run the root build batch file:

```powershell
.\run_Build.bat
```

The batch file changes into the repository root, clears `ELECTRON_RUN_AS_NODE`, and runs the project build script.

The build version comes from `build-version.ini`:

```ini
version=0.4
```

The build sync step applies that value to the home-screen version label and the generated portable executable filename.

## Manual Build

Create the Windows build:

```powershell
$env:ELECTRON_RUN_AS_NODE=$null
npm run build
```

The build script runs:

```text
electron-builder --win
```

Then `postbuild` refreshes `dist/lists/` from the source `lists/` folder.

Generated outputs:

```text
dist/
  Project-Roulette-0.4.exe
  lists/
  win-unpacked/
    Project-Roulette-0.4.exe
```

The executable names are synced from `build-version.ini` into `package.json` before Electron Builder runs:

```json
"win": {
  "executableName": "Project-Roulette-0.4"
},
"portable": {
  "artifactName": "Project-Roulette-0.4.exe"
}
```

Update `build-version.ini` when the displayed app version and generated executable filename should change.

## Packaging Configuration

Electron Builder is configured in the `build` section of `package.json`.

Packaged source files:

```json
"files": [
  "index.html",
  "script.js",
  "styles.css",
  "fortune-cookie-messages.json",
  "cat.png",
  "cat.gif",
  "yarn.svg",
  "build/icon.ico",
  "project_roulette_font/**/*",
  "desktop/**/*"
]
```

External list files:

```json
"extraFiles": [
  {
    "from": "lists",
    "to": "lists",
    "filter": ["**/*.txt"]
  }
]
```

Windows targets:

```json
"target": [
  "dir",
  "portable"
]
```

The app icon is `build/icon.ico`, and the app window icon is wired in `desktop/main.js`.

## License

Project Roulette is licensed under the PolyForm Noncommercial License 1.0.0.

Noncommercial use is permitted with the required creator notice retained. Commercial use requires contacting Andrei Avram for a separate license.
