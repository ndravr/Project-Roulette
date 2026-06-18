const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectRouletteDesktop", {
  readTeamLists: () => ipcRenderer.invoke("lists:read"),
  readFortuneMessages: () => ipcRenderer.invoke("fortunes:read"),
  readShownJokes: () => ipcRenderer.invoke("shown-jokes:read"),
  recordShownJoke: (entry) => ipcRenderer.invoke("shown-jokes:record", entry)
});
