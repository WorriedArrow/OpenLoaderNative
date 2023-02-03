// Disable sentry
try {
  window.__SENTRY__.hub.getClient().getOptions().enabled = false;

  Object.keys(console).forEach(x => console[x] = console[x].__sentry_original__ ?? console[x]);
} catch { }

// Settings info version injection
setInterval(() => {
  const host = [...document.querySelectorAll('[class*="info-"] [class*="line-"]')].find(x => x.textContent.startsWith('Host '));
  if (!host || document.querySelector('#oln-ver')) return;

  const el = document.createElement('span');
  el.id = 'oln-ver';

  el.textContent = 'OpenLoaderNative <hash>';
  el.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  host.append(document.createTextNode(' | '), el);
}, 2000);

const injCSS = x => {
  const el = document.createElement('style');
  el.appendChild(document.createTextNode(x));
  document.body.appendChild(el);
};

injCSS(`
[class^="socialLinks-"] + [class^="info-"] {
  padding-right: 0;
}

#oln-ver {
  text-transform: none;
  cursor: pointer;
}

#oln-ver:hover {
  text-decoration: underline;
  color: var(--text-normal);
}`);