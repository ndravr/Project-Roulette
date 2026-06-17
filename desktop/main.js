const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const iconPath = path.join(app.getAppPath(), "build", "icon.ico");

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
