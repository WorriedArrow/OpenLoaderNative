const { contextBridge, webFrame, ipcRenderer, app } = require("electron");

contextBridge.exposeInMainWorld("OpenLoaderNative", {
    app: {
        getZoomFactor() {
            return webFrame.getZoomFactor() * 100;
        },
        setZoomFactor(factor) {
            webFrame.setZoomFactor(factor / 100);
        }
    },
    ipc: ipcRenderer
});

const invokePath = async () => {
    return await ipcRenderer.invoke("ol-get-app-paths-appdata");
}

(async () => {
// Load OpenLoader
const buildInfo = JSON.parse(require('fs').readFileSync(require('path').join(process.resourcesPath, 'build_info.json'), 'utf8'));
const settings = JSON.parse(require("fs").readFileSync(require('path').join(process.env.DISCORD_USER_DATA_DIR ?? require("path").join(invokePath(), 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel)), 'settings.json')));

const originalKill = process.kill;
process.kill = function() {};
console.log(settings);
if(settings.olNative.preload ?? true) require(process.env.ORIGINAL_PRELOAD);
process.kill = originalKill;
})();