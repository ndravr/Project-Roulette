const { app, BrowserWindow, ipcMain } = require("electron");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");

const iconPath = path.join(app.getAppPath(), "build", "icon.ico");
const SHOWN_JOKES_DIRECTORY = "shown-jokes";
const SHOWN_JOKES_FILE = "shown-jokes.json";

function getListsDirectories() {
  const directories = [];

  if (app.isPackaged) {
    if (process.env.PORTABLE_EXECUTABLE_DIR) {
      directories.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, "lists"));
    }

    directories.push(path.join(path.dirname(process.execPath), "lists"));
    directories.push(path.join(process.resourcesPath, "lists"));
  }

  directories.push(path.join(app.getAppPath(), "lists"));
  return directories;
}

async function readTeamLists() {
  for (const listsDirectory of getListsDirectories()) {
    try {
      const entries = await fs.readdir(listsDirectory, { withFileTypes: true });
      const textFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
        .map((entry) => entry.name)
        .sort((first, second) => first.localeCompare(second));

      return Promise.all(
        textFiles.map(async (fileName) => ({
          fileName,
          text: await fs.readFile(path.join(listsDirectory, fileName), "utf8")
        }))
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return [];
}

async function readFortuneMessages() {
  const text = await fs.readFile(path.join(app.getAppPath(), "fortune-cookie-messages.json"), "utf8");
  const messages = JSON.parse(text.replace(/^\uFEFF/, ""));

  if (!Array.isArray(messages)) {
    return [];
  }

  return messages;
}

function getWritableAppRoot() {
  if (!app.isPackaged) {
    return app.getAppPath();
  }

  const candidateDirectories = [
    path.dirname(process.execPath),
    path.dirname(path.dirname(process.execPath)),
    path.dirname(path.dirname(path.dirname(process.execPath)))
  ];

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    candidateDirectories.unshift(
      process.env.PORTABLE_EXECUTABLE_DIR,
      path.dirname(process.env.PORTABLE_EXECUTABLE_DIR)
    );
  }

  const repositoryRoot = candidateDirectories.find((directory) => (
    fsSync.existsSync(path.join(directory, "build-version.ini"))
    && fsSync.existsSync(path.join(directory, "package.json"))
  ));

  if (repositoryRoot) {
    return repositoryRoot;
  }

  return path.dirname(process.execPath);
}

function getShownJokesFilePath() {
  return path.join(getWritableAppRoot(), SHOWN_JOKES_DIRECTORY, SHOWN_JOKES_FILE);
}

function normalizeJokeText(joke) {
  return String(joke || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function createEmptyShownJokesStore() {
  return {
    jokes: []
  };
}

function normalizeShownJokesStore(value) {
  const store = createEmptyShownJokesStore();

  if (!value || !Array.isArray(value.jokes)) {
    return store;
  }

  store.jokes = value.jokes
    .filter((entry) => entry && typeof entry.joke === "string")
    .map((entry) => {
      const joke = entry.joke.trim();

      return {
        joke,
        normalizedJoke: normalizeJokeText(entry.normalizedJoke || joke),
        listName: typeof entry.listName === "string" ? entry.listName : "",
        displayedAt: typeof entry.displayedAt === "string" ? entry.displayedAt : ""
      };
    })
    .filter((entry) => entry.joke && entry.normalizedJoke);

  return store;
}

async function writeShownJokesStore(store) {
  const filePath = getShownJokesFilePath();

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

async function readShownJokesStore() {
  const filePath = getShownJokesFilePath();

  try {
    const text = await fs.readFile(filePath, "utf8");
    return normalizeShownJokesStore(JSON.parse(text.replace(/^\uFEFF/, "")));
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "SyntaxError") {
      throw error;
    }

    const emptyStore = createEmptyShownJokesStore();

    await writeShownJokesStore(emptyStore);
    return emptyStore;
  }
}

async function readShownJokes() {
  return readShownJokesStore();
}

async function recordShownJoke(_event, entry) {
  const joke = typeof entry?.joke === "string" ? entry.joke.trim() : "";
  const normalizedJoke = normalizeJokeText(entry?.normalizedJoke || joke);

  if (!joke || !normalizedJoke) {
    return readShownJokesStore();
  }

  const store = await readShownJokesStore();

  if (!store.jokes.some((storedJoke) => storedJoke.normalizedJoke === normalizedJoke)) {
    store.jokes.push({
      joke,
      normalizedJoke,
      listName: typeof entry?.listName === "string" ? entry.listName : "",
      displayedAt: new Date().toISOString()
    });

    await writeShownJokesStore(store);
  }

  return store;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#101217",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));
}

ipcMain.handle("lists:read", readTeamLists);
ipcMain.handle("fortunes:read", readFortuneMessages);
ipcMain.handle("shown-jokes:read", readShownJokes);
ipcMain.handle("shown-jokes:record", recordShownJoke);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
