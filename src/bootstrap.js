const electron = require("electron");
const { app, session, ipcMain } = electron;
const { readFileSync } = require('fs');
const { join } = require('path');

let splashDone = false;
let testSplashOpen = false;
/**
 * @type {BrowserWindow | null}
 */
let testSplash;

ipcMain.handle("ol-is-splash-test", () => splashDone);
ipcMain.on("ol-destroy-splash", () => splash.destroySplash());
process.env.OL_APPDATA_PATH = app.getPath("appData");

if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();
process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', buildInfo);

const Constants = require('./Constants');
app.setAppUserModelId(Constants.APP_ID);

app.name = 'discord'; // Force name as sometimes breaks

const fatal = e => log('Fatal', e);
process.on('uncaughtException', console.error);

if(!settings.get("olNative").installed) settings.set("olNative", { ...settings.get("olNative") || {}, installed: true, preload: true });


const splash = require('./splash');
const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');
const autoStart = require('./autoStart');


class BrowserWindow extends electron.BrowserWindow {
  /**
   * @param {electron.BrowserWindowConstructorOptions} options 
   */
  constructor(options) {
    if (options.title) {
      const originalPreload = options.webPreferences.preload;
      options.webPreferences.preload = join(__dirname, "preload.js");
      options.webPreferences.sandbox = false;
      process.env.ORIGINAL_PRELOAD = originalPreload;
      super(options);
    } else super(options);
  }
}

const electronPath = require.resolve("electron");
delete require.cache[electronPath].exports;
require.cache[electronPath].exports = {...electron, BrowserWindow};

let desktopCore;
const startCore = () => {
  ipcMain.on("ol-update-preload", (_, flag) => {
    settings.set("olNative", { ...settings.get("olNative"), preload: flag });
    settings.save();
  });
  ipcMain.on("ol-test-splash", () => {
    if(!testSplashOpen) splash.initSplash(false);
    testSplashOpen = true;
  });
  ipcMain.on("ol-destroy-splash-test-window", () => {
    testSplashOpen = false;
    testSplash?.destroy?.();
  });
  testSplash?.on("blur", () => {
    testSplashOpen = false;
    testSplash?.destroy?.();
  });

  session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    delete d.responseHeaders['content-security-policy'];
    cb(d);
  });


  app.on('browser-window-created', (e, bw) => { // Main window injection
    bw.webContents.on('dom-ready', () => {
      if (!bw.resizable) return; // Main window only
      settings.reload(); // reload settings so no relaunch is necessary to update OL browser build

      splash.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

      const [ , hash ] = olnVersion.split('-'); // Split via -
      if(!hash) hash == "nightly";

      bw.webContents.executeJavaScript(readFileSync(join(__dirname, 'mainWindow.js'), 'utf8')
        .replaceAll('<hash>', hash));

      splashDone = true;

      // run OL after wp chunk is loaded, init beforehand as well

      const code = `
        new Promise((resolve) => {
          const checkProperty = () => {
            if (window.webpackChunkdiscord_app && window.webpackChunkdiscord_app.length && window.webpackChunkdiscord_app.length > 0) {
              console.log("[OLNative]", "chunk found", window.webpackChunkdiscord_app);
              resolve();
            } else {
              setTimeout(checkProperty);
            }
          };
      
          checkProperty();
        }).then(() => {
          const chunkName = "webpackChunkdiscord_app"
          const idn = "olwpmods";
          let __discord_webpack_require_i__;
          if (typeof(window["webpackJsonp"]) !== "undefined") {
              __discord_webpack_require_i__ = window["webpackJsonp"].push([[], {
                  [idn]: (module, exports, __internal_require__) => module.exports = __internal_require__
              }, [[idn]]]);
          }
          else if (typeof(window[chunkName]) !== "undefined") {
              window[chunkName].push([[idn], 
                  {},
                  __internal_require__ => __discord_webpack_require_i__ = __internal_require__
              ]);
          }
          delete __discord_webpack_require_i__.m[idn];
          delete __discord_webpack_require_i__.c[idn];
          window.discordWpReq = __discord_webpack_require_i__;
          try {
            ${settings.get("olNative").code}
            window.OL = OL.default;
          } catch (e) {
            console.error("[OLNative]", "quack", e);
            console.trace();
          }
          console.log("[OLNative]", "finished loading OL");
        });
      `
      
    });
  });


  desktopCore = require('./utils/requireNative')('discord_desktop_core');

  desktopCore.startup({
    splashScreen: splash,
    moduleUpdater,
    buildInfo,
    Constants,
    updater,
    autoStart,

    // Just requires
    appSettings: require('./appSettings'),
    paths: require('./paths'),

    // Stubs
    GPUSettings: {
      replace: () => {}
    },
    crashReporterSetup: {
      isInitialized: () => true,
      metadata: {}
    }
  });
};

const startUpdate = () => {
  const urls = [
    'https://*/api/*/science',
    'https://*/api/*/metrics'
  ];

  session.defaultSession.webRequest.onBeforeRequest({ urls }, (e, cb) => cb({ cancel: true }));

  const startMin = process.argv?.includes?.('--start-minimized');

  if (updater.tryInitUpdater(buildInfo, Constants.NEW_UPDATE_ENDPOINT)) {
    const inst = updater.getUpdater();

    inst.on('host-updated', () => autoStart.update(() => {}));
    inst.on('unhandled-exception', fatal);
    inst.on('InconsistentInstallerState', fatal);
    inst.on('update-error', console.error);

    require('./winFirst').run();
  } else {
    moduleUpdater.init(Constants.UPDATE_ENDPOINT, buildInfo);
  }

  splash.events.once('APP_SHOULD_LAUNCH', () => {
    startCore();
    try {
      require('./asarUpdate')();
    } catch (e) {
      log('AsarUpdate', e);
    }
  });

  let done;
  splash.events.once('APP_SHOULD_SHOW', () => {
    if (done) return;
    done = true;

    desktopCore.setMainWindowVisible(!startMin);
  });

  splash.initSplash(startMin);
};


module.exports = () => {
  app.on('second-instance', (e, a) => {
    desktopCore?.handleOpenUrl?.(a.includes('--url') && a[a.indexOf('--') + 1]); // Change url of main window if protocol is used (uses like "discord --url -- discord://example")
  });

  if (!app.requestSingleInstanceLock()) return app.quit();

  app.whenReady().then(() => {
    startUpdate();
  });
};