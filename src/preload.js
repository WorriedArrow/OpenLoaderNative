const { contextBridge, webFrame, ipcRenderer, } = require("electron");

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

console.log(process.env);

contextBridge.exposeInMainWorld("process", {
    env: {
        OL_DEV_MODE: !!process.env.OL_DEV_MODE
    }
});


(async () => {
// Load OpenLoader
const buildInfo = JSON.parse(require('fs').readFileSync(require('path').join(process.resourcesPath, 'build_info.json'), 'utf8'));
const settings = JSON.parse(require("fs").readFileSync(require('path').join(process.env.DISCORD_USER_DATA_DIR ?? require("path").join(process.env.OL_APPDATA_PATH, 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel)), 'settings.json')));

const originalKill = process.kill;
process.kill = function() {};
console.log(settings);
try {
webFrame.executeJavaScript(`setTimeout(() => {
    ${settings.olNative.code}
    window.OL = OL;
});`);
} catch (err) { console.log("quack", err) }
if(settings.olNative.preload ?? true) require(process.env.ORIGINAL_PRELOAD);
process.kill = originalKill;
})();