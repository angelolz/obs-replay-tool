const { ipcRenderer } = require('electron');

ipcRenderer.on('change-image', (event, state) => {
    const icon = document.getElementById("icon");
    if (state === true)
      icon.src = 'img/on.png'
    else
      icon.src = 'img/off.png'
  });