const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("projectRouletteDesktop", {
  readTeamLists: () => ipcRenderer.invoke("lists:read"),
  readFortuneMessages: () => ipcRenderer.invoke("fortunes:read")
});
