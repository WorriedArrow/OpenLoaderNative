const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('Splash', {
  onState: callback => ipcRenderer.on('state', (_, state) => callback(state)),
  quit: () => ipcRenderer.send('sq'),
  skip: () => ipcRenderer.send('ss'),
  isTest: async () => await ipcRenderer.invoke('ol-is-splash-test'),
  destroyTestWindow: () => ipcRenderer.send('ol-destroy-splash-test-window')
});