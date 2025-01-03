const { ipcRenderer } = require('electron');
let showTimeout, resetTimeout;

ipcRenderer.on('change-image', (event, state) => {
    const icon = document.getElementById('status');
    if (state === true) icon.src = '../../../img/on.png';
    else icon.src = '../../../img/off.png';
});

ipcRenderer.on('saved-success', (event, state) => {
    showAndFade();
});

ipcRenderer.on('change-active', (event, text) => {
    const element = document.getElementById('title');
    element.innerText = text;
});

function resetElement() {
    const element = document.getElementById('saved');
    element.style.opacity = '1';
}

function showAndFade() {
    const element = document.getElementById('saved');

    clearTimeout(showTimeout);
    clearTimeout(resetTimeout);

    resetElement();

    showTimeout = setTimeout(() => {
        element.style.opacity = '0';
    }, 3000);
}
