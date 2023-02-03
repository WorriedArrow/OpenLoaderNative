const { app } = require('electron');

const args = [
  '--enable-gpu-rasterization',
  '--enable-zero-copy',
  '--ignore-gpu-blocklist',
  '--enable-hardware-overlays=single-fullscreen,single-on-top,underlay',
  '--enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation',
  '--disable-features=Vulkan',
  '--force_high_performance_gpu'
];


module.exports = () => {
  args.forEach(a => app.commandLine.appendSwitch(a.replace('--', '')));
};