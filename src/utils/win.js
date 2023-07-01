module.exports = (o, n) => {
  const w = new (require('electron').BrowserWindow)({
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#2f3136',
    webPreferences: {
      preload: require('path').join(__dirname, '..', n, 'preload.js')
    },
    ...o
  });

  if(n !== "splash") w.loadURL('https://cdn.openasar.dev/' + n + '?v=' + olnVersion);
  else w.loadFile(require('path').join(__dirname, '..', 'splash', 'splash.html'));

  return w;
};