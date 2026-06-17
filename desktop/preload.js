const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shuffleDesktop", {
  readTeamLists: () => ipcRenderer.invoke("lists:read"),
  readFortuneMessages: () => ipcRenderer.invoke("fortunes:read")
});
