# Shuffle

Shuffle is a portable Windows Electron app for loading `.txt` team lists and running a randomized name round.

The app is no longer intended to run by double-clicking `index.html` in a browser. It runs through Electron so it can read the local `lists` folder automatically without a server or browser permission prompt.

## Share The App

Fast launch option:

```text
dist/win-unpacked/
  Shuffle.exe
  lists/
```

Send the whole `win-unpacked` folder and have users double-click `Shuffle.exe`. This is the fastest version because it does not self-extract at startup.

Single-file portable option:

```text
dist/
  Shuffle 0.2.0.exe
  lists/
```

The single exe is easier to copy, but it can take a few seconds to start because Electron portable executables unpack themselves before launching. Keep `lists` beside it.

To add or remove tiles, edit the `.txt` files in `dist/lists` and reopen the app.

## Edit Lists

Source lists live in:

```text
lists/
```

Each `.txt` file becomes one tile. Put one name per line. Blank lines are ignored. Lines starting with `#` are ignored.

After rebuilding, the build script copies `lists/` into `dist/lists/`.

## Project Structure

```text
desktop/
  main.js       Electron main process, reads lists from disk
  preload.js    Safe bridge exposed to the web UI

index.html      Renderer markup
script.js       Renderer app logic
styles.css      Renderer styles

gun_idle.png
gun_fire.gif
name_shuffle_font/

lists/          Source list files
dist/           Shareable portable output
```

## Build

Install dependencies:

```powershell
npm install
```

Build the portable Windows app:

```powershell
npm run build
```

Output:

```text
dist/
  Shuffle 0.2.0.exe
  win-unpacked/
  lists/
```

`node_modules/` is generated and can be deleted after building. Keep `dist/win-unpacked/` if you want the fast-launch distributable.

## Run During Development

After `npm install`:

```powershell
$env:ELECTRON_RUN_AS_NODE=$null
npm start
```

The app reads from the source `lists/` folder in development.

## Notes

- No server is required.
- Users do not need Node, npm, or Electron installed.
- The app reads `.txt` files from `lists` next to the portable executable when packaged.
- If the portable exe is rebuilt, share the new exe together with the updated `dist/lists` folder.
- If startup speed matters most, share `dist/win-unpacked/` instead of the single portable exe.
