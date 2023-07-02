const { contextBridge, webFrame, ipcRenderer, webContents, MessageDetails } = require("electron");

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

/**
 * @param {MessageDetails} msgDetails
 */
function doesFail(msgDetails) {
    // TODO: return false if OL.settings.consoleSpam is enabled
    return (msgDetails.level == 3 && msgDetails.message.includes("net:ERR_BLOCKED_BY_CLIENT")) || (msgDetails.level == 2 && msgDetails.message.includes("Analytics"))
}

(async () => {
// Load OpenLoader
const buildInfo = JSON.parse(require('fs').readFileSync(require('path').join(process.resourcesPath, 'build_info.json'), 'utf8'));
const settings = JSON.parse(require("fs").readFileSync(require('path').join(process.env.DISCORD_USER_DATA_DIR ?? require("path").join(process.env.OL_APPDATA_PATH, 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel)), 'settings.json')));

const originalKill = process.kill;
process.kill = function() {};
console.log(settings);
if(settings.olNative.preload ?? true) require(process.env.ORIGINAL_PRELOAD);
process.kill = originalKill;
webContents.on("console-message", (e, details) => {
    if(doesFail(details)) e.preventDefault();
})
})();