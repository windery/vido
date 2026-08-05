const { app, BrowserWindow } = require('electron');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');
setTimeout(() => { console.log('TIMEOUT'); app.exit(1); }, 20000);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600, webPreferences: { offscreen: true } });
  await win.loadFile(__dirname + '/measure.html');
  await new Promise(r => setTimeout(r, 500));
  const r = await win.webContents.executeJavaScript(`(() => {
    const ta = document.getElementById('ta');
    const md = document.getElementById('md');
    const p = document.querySelector('.md p');
    const cs = getComputedStyle(ta);
    return {
      taClient: ta.clientHeight, taScroll: ta.scrollHeight, taLineHeight: cs.lineHeight,
      mdClient: md.clientHeight, mdScroll: md.scrollHeight, mdLineHeight: getComputedStyle(md).lineHeight,
      pMarginTop: getComputedStyle(p).marginTop, pMarginBottom: getComputedStyle(p).marginBottom,
      diff: ta.clientHeight - md.clientHeight,
    };
  })()`);
  console.log('MEASURE:' + JSON.stringify(r));
  app.exit(0);
});
