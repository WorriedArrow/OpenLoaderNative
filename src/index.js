const { join } = require('path');

global.log = (area, ...args) => console.log(`[OpenLoaderNative > ${area}]`, ...args); // Make log global for easy usage everywhere

global.olnVersion = 'nightly';

log('Init', 'OpenLoaderNative', olnVersion);

if (process.resourcesPath.startsWith('/usr/lib/electron')) global.systemElectron = true; // Using system electron, flag for other places
process.resourcesPath = join(__dirname, '..'); // Force resourcesPath for system electron

const paths = require('./paths');
paths.init();

global.settings = require('./appSettings').getSettings();

require('./cmdSwitches')();


// Force u2QuickLoad (pre-"minified" ish)
const M = require('module'); // Module

const b = join(paths.getExeDir(), 'modules'); // Base dir
if (process.platform === 'win32') try {
  for (const m of require('fs').readdirSync(b)) M.globalPaths.push(join(b, m)); // For each module dir, add to globalPaths
} catch { log('Init', 'Failed to QS globalPaths') }


if (process.argv.includes('--overlay-host')) { // If overlay
  require('./utils/requireNative')('discord_overlay2', 'standalone_host.js'); // Start overlay
} else {
  require('./bootstrap')(); // Start bootstrap
}