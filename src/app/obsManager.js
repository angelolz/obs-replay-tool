const OBSWebSocket = require('obs-websocket-js').default;
const appManager = require('./appManager');
const configManager = require('./configManager');
const loggerManager = require('./loggerManager');
const activeWindow = require('active-win');
const { LogLevel } = require('../logger/logLevel');
const eventBus = require('./eventEmitter');
const { powerMonitor } = require('electron');

const obs = new OBSWebSocket();
let connected = false;
let tasks = null;
let reconnect = null;
let lastActiveWindow = null;
let attemptedReconnect = false;
let idleTimerInterval = null;
let replayBufferEnabled = false;

function init() {
    setupEventListeners();
    connect();
    toggleIdleTimer(configManager.getConfig().obs.turnOffReplayWhenIdle);
}

function setupEventListeners() {
    obs.on('ExitStarted', handleExitStarted);
    obs.on('ReplayBufferSaved', handleReplayBufferSaved);
    eventBus.on('toggle-idle-replay', (toggle) => {
        toggleIdleTimer(toggle);
    });
}

async function toggleIdleTimer(toggle) {
    if (toggle) {
        idleTimerInterval = setInterval(async () => {
            const idle = powerMonitor.getSystemIdleTime();
            const obsConfig = configManager.getConfig().obs;

            if (replayBufferEnabled && connected && obsConfig.turnOffReplayWhenIdle && idle > obsConfig.idleTime) {
                await toggleReplayBuffer(false);
            }

            if (!replayBufferEnabled && connected && idle === 0) {
                await toggleReplayBuffer(true);
            }
        }, 3000);
    } else {
        if (idleTimerInterval !== null) {
            clearInterval(idleTimerInterval);
        }
    }
}

async function toggleReplayBuffer(toggle) {
    try {
        loggerManager.addLog(LogLevel.DEBUG, 'called toggle replayBuffer with: ' + toggle);

        if (!toggle && replayBufferEnabled) {
            await obs.call('StopReplayBuffer');
            replayBufferEnabled = false;
        } else if (toggle && !replayBufferEnabled) {
            await obs.call('StartReplayBuffer');
            replayBufferEnabled = true;
        }
    } catch (err) {
        loggerManager.addLog(LogLevel.ERROR, "couldn't toggle replay buffer: " + JSON.stringify(err));
    }
}

function handleExitStarted() {
    connected = false;
    clearIntervalIfNeeded();
    loggerManager.addLog(LogLevel.INFO, 'OBS shutting down... Attempting to reconnect...');
    reconnect = setInterval(connect, 1000);
}

function clearIntervalIfNeeded() {
    if (tasks !== null) clearInterval(tasks);
    if (reconnect !== null) clearInterval(reconnect);
}

function handleReplayBufferSaved() {
    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send('saved-success');
    }
}

function connect() {
    const websocketConfig = configManager.getConfig().websocket;
    obs.connect(`ws://${websocketConfig.ip}:${websocketConfig.port}`, websocketConfig.password)
        .then(handleConnectionSuccess)
        .catch(handleConnectionFailure);
}

function handleConnectionSuccess() {
    attemptedReconnect = false;
    clearIntervalIfNeeded();
    connected = true;

    //give some delay before starting to call obs requests
    setTimeout(() => {
        tasks = setInterval(update, 5000);
    })
   
    loggerManager.addLog(LogLevel.INFO, 'OBS is connected!');
}

function handleConnectionFailure() {
    connected = false;

    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send('change-image', false);
    }

    if (!attemptedReconnect) {
        attemptedReconnect = true;
        loggerManager.addLog(LogLevel.ERROR, 'Failed to connect to OBS, retrying...');
    }

    if (reconnect == null) reconnect = setInterval(connect, 1000);
}

function update() {
    if (connected) {
        updateActiveWindow();
        updateReplayStatus();
    }
}

async function updateActiveWindow() {
    const config = configManager.getConfig();
    if (!connected || !config.app.updateActiveWindow) return;

    const getInputSettingsRes = await fetchInputSettings(config.obs.gameCaptureSourceName);
    if (!getInputSettingsRes) return;

    if (appManager.getOverlayWindow() != null) {
        appManager
            .getOverlayWindow()
            .webContents.send('change-active', formatApplicationName(getInputSettingsRes.inputSettings.window));
    }

    await checkAndChangeActiveWindow(config, getInputSettingsRes);
}

async function fetchInputSettings(inputName) {
    try {
        return await obs.call('GetInputSettings', { inputName });
    } catch (err) {
        loggerManager.addLog(LogLevel.ERROR, err);
        return null;
    }
}

async function checkAndChangeActiveWindow(config, getInputSettingsRes) {
    let activeWindowInfo = activeWindow.sync();
    if (activeWindowInfo === null) return;

    let activeApplicationName = getApplicationName(activeWindowInfo.owner.path, '\\');
    let currentApplicationName = getApplicationName(getInputSettingsRes.inputSettings.window, ':');

    if (isSame(activeApplicationName, currentApplicationName)) return;

    lastActiveWindow = activeApplicationName;

    const getItemsRes = await obs.call('GetInputPropertiesListPropertyItems', {
        inputName: config.obs.gameCaptureSourceName,
        propertyName: 'window',
    });

    const index = getItemsRes.propertyItems.findIndex((item) => item.itemName.indexOf(activeApplicationName) >= 0);
    if (index < 0) return;

    const matchingAppName = getApplicationName(getItemsRes.propertyItems[index].itemValue, ':');
    if (config.app.blacklist.some((item) => item === matchingAppName)) {
        loggerManager.addLog(LogLevel.DEBUG, `${lastActiveWindow} is blacklisted, skipping`);
        return;
    }

    loggerManager.addLog(LogLevel.DEBUG, `changing audio: ${currentApplicationName} -> ${activeApplicationName}`);
    await changeInputSettings(getItemsRes.propertyItems[index].itemValue);
    await changeOutputSettings(getItemsRes.propertyItems[index].itemValue);
}

async function changeInputSettings(newWindowValue) {
    const config = configManager.getConfig();
    await obs.call('SetInputSettings', {
        inputName: config.obs.gameCaptureSourceName,
        inputSettings: { window: newWindowValue },
    });

    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send('change-active', formatApplicationName(newWindowValue));
    }
    loggerManager.addLog(LogLevel.INFO, `Changed audio settings to: ${formatApplicationName(newWindowValue)}`);
}

function formatApplicationName(windowTitle) {
    return getApplicationName(windowTitle, ':').replace('.exe', '').replace('.EXE', '');
}

async function changeOutputSettings(windowTitle) {
    const config = configManager.getConfig();
    let path = config.obs.baseOutputPath;
    if (path.endsWith('/') || path.endsWith('\\')) {
        path = path.slice(0, -1);
    }

    loggerManager.addLog(LogLevel.DEBUG, `changing dir to ${path}/${formatApplicationName(windowTitle)}`);
    loggerManager.addLog(LogLevel.DEBUG, `format is: ${formatApplicationName(windowTitle)} ${config.obs.filenameFormat}`);

    await obs.call('SetOutputSettings', {
        outputName: 'Replay Buffer',
        outputSettings: {
            directory: `${path}/${formatApplicationName(windowTitle)}`,
            format: `${formatApplicationName(windowTitle)} ${config.obs.filenameFormat}`,
        },
    });
}

function getApplicationName(windowTitle, delimiter) {
    const splitName = windowTitle.split(delimiter);
    return splitName[splitName.length - 1];
}

async function updateReplayStatus() {
    if (!connected) return;

    const status = await fetchReplayStatus();
    if(status) {
        replayBufferEnabled = status.outputActive;
        eventBus.emit('update-tray-image', replayBufferEnabled);
        if (status && appManager.getOverlayWindow() != null) {
            appManager.getOverlayWindow().webContents.send('change-image', replayBufferEnabled);
        }
    }
}

async function fetchReplayStatus() {
    try {
        return await obs.call('GetReplayBufferStatus');
    } catch (err) {
        loggerManager.addLog(LogLevel.ERROR, err);
        return null;
    }
}

function getApplicationName(windowTitle, delimiter) {
    var splitName = windowTitle.split(delimiter);
    return splitName[splitName.length - 1];
}

function isSame(activeApplicationName, currentApplicationName) {
    return (
        (lastActiveWindow != null && lastActiveWindow === activeApplicationName) ||
        currentApplicationName.indexOf(activeApplicationName) >= 0
    );
}

module.exports = {
    init,
};
