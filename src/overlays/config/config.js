const { ipcRenderer } = require('electron');

const form = document.querySelector('#settings-form');
const status = document.querySelector('#status');

function setValue(name, value) {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value ?? '';
}

async function loadSettings() {
    try {
        const config = await ipcRenderer.invoke('config:get');
        setValue('ip', config.websocket.ip);
        setValue('port', config.websocket.port);
        setValue('password', config.websocket.password);
        setValue('gameCaptureSourceName', config.obs.gameCaptureSourceName);
        setValue('baseOutputPath', config.obs.baseOutputPath);
        setValue('filenameFormat', config.obs.filenameFormat);
        setValue('turnOffReplayWhenIdle', config.obs.turnOffReplayWhenIdle);
        setValue('idleTime', config.obs.idleTime);
        setValue('updateActiveWindow', config.app.updateActiveWindow);
        setValue('showOverlay', config.app.showOverlay);
        setValue('blacklist', (config.app.blacklist || []).join('\n'));
        setValue('isDebug', config.app.isDebug);
        setValue('showLogs', config.app.showLogs);
    } catch (error) {
        status.textContent = 'Could not load settings.';
        console.error(error);
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const updates = {
        websocket: {
            ip: data.get('ip').trim(),
            port: Number(data.get('port')),
            password: data.get('password'),
        },
        obs: {
            gameCaptureSourceName: data.get('gameCaptureSourceName').trim(),
            baseOutputPath: data.get('baseOutputPath').trim(),
            filenameFormat: data.get('filenameFormat').trim(),
            turnOffReplayWhenIdle: data.get('turnOffReplayWhenIdle') === 'on',
            idleTime: Number(data.get('idleTime')),
        },
        app: {
            updateActiveWindow: data.get('updateActiveWindow') === 'on',
            showOverlay: data.get('showOverlay') === 'on',
            blacklist: data.get('blacklist').split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
            isDebug: data.get('isDebug') === 'on',
            showLogs: data.get('showLogs') === 'on',
        },
    };

    try {
        await ipcRenderer.invoke('config:save', updates);
        status.textContent = 'Settings saved.';
    } catch (error) {
        status.textContent = 'Could not save settings.';
        console.error(error);
    }
});

loadSettings();
