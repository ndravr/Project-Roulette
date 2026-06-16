const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shuffleDesktop", {
  readTeamLists: () => ipcRenderer.invoke("lists:read")
});
