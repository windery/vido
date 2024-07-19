window.ipcRenderer.on('main-process-message', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args);
});

window.ipcRenderer.on('quit', (event) => {
  // window.ipcRenderer.send('shortcut', 'unregisterAll');
});
