const OBSWebSocket = require("obs-websocket-js").default;
const appManager = require("./appManager");
const configManager = require("./configManager");
const loggerManager = require("./loggerManager");
const activeWindow = require("active-win");
const { LogLevel } = require("../logger/logLevel");
const eventBus = require("./eventEmitter");

const obs = new OBSWebSocket();
let connected = false;
let tasks = null;
let reconnect = null;
let lastActiveWindow = null;
let attemptedReconnect = false;

function init() {
    setupEventListeners();
    connect();
}

function setupEventListeners() {
    obs.on("ExitStarted", handleExitStarted);
    obs.on("ReplayBufferSaved", handleReplayBufferSaved);
}

function handleExitStarted() {
    connected = false;
    clearIntervalIfNeeded();
    loggerManager.addLog(LogLevel.INFO, "OBS shutting down... Attempting to reconnect...");
    reconnect = setInterval(connect, 1000);
}

function clearIntervalIfNeeded() {
    if (tasks !== null) clearInterval(tasks);
    if (reconnect !== null) clearInterval(reconnect);
}

function handleReplayBufferSaved() {
    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send("saved-success");
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
    tasks = setInterval(update, 1000);
    loggerManager.addLog(LogLevel.INFO, "OBS is connected!");
}

function handleConnectionFailure() {
    connected = false;

    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send("change-image", false);
    }

    if (!attemptedReconnect) {
        attemptedReconnect = true;
        loggerManager.addLog(LogLevel.ERROR, "Failed to connect to OBS, retrying...");
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
    if (!connected || !config.updateActiveWindow) return;

    const getInputSettingsRes = await fetchInputSettings(config.gameCaptureSourceName);
    if (!getInputSettingsRes) return;

    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send("change-active", formatApplicationName(getInputSettingsRes.inputSettings.window));
    }

    await checkAndChangeActiveWindow(config, getInputSettingsRes);
}

async function checkAndChangeActiveWindow(config, getInputSettingsRes) {
    let activeWindowInfo = activeWindow.sync();
    if (activeWindowInfo === null) return;

    let activeApplicationName = getApplicationName(activeWindowInfo.owner.path, "\\");
    let currentApplicationName = getApplicationName(getInputSettingsRes.inputSettings.window, ":");

    if (isSame(activeApplicationName, currentApplicationName)) return;

    lastActiveWindow = activeApplicationName;

    const getItemsRes = await obs.call("GetInputPropertiesListPropertyItems", {
        inputName: config.gameCaptureSourceName,
        propertyName: "window",
    });

    loggerManager.addLog(LogLevel.DEBUG, "activeWindowInfo: " + JSON.stringify(activeWindowInfo, null, 2));
    loggerManager.addLog(LogLevel.DEBUG, "propertyItems: " + JSON.stringify(getItemsRes.propertyItems, null, 2));

    const index = getItemsRes.propertyItems.findIndex(item => item.itemName.indexOf(activeApplicationName) >= 0);
    if (index < 0) return;

    const matchingAppName = getApplicationName(getItemsRes.propertyItems[index].itemValue, ":");
    if (config.blacklist.some(item => item === matchingAppName)) {
        loggerManager.addLog(LogLevel.DEBUG, `${lastActiveWindow} is blacklisted, skipping`);
        return;
    }

    loggerManager.addLog(LogLevel.INFO, `changing audio: ${currentApplicationName} -> ${activeApplicationName}`);
    await changeInputSettings(getItemsRes.propertyItems[index].itemValue);
}

async function changeInputSettings(newWindowValue) {
    const config = configManager.getConfig();
    await obs.call("SetInputSettings", {
        inputName: config.gameCaptureSourceName,
        inputSettings: { window: newWindowValue },
    });

    if (appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send("change-active", formatApplicationName(newWindowValue));
    }
    loggerManager.addLog(LogLevel.INFO, `Changed audio settings to: ${formatApplicationName(newWindowValue)}`);
}

async function fetchInputSettings(inputName) {
    try {
        return await obs.call("GetInputSettings", { inputName });
    } catch (err) {
        loggerManager.addLog(LogLevel.ERROR, err);
        return null;
    }
}

function formatApplicationName(windowTitle) {
    return getApplicationName(windowTitle, ":").replace(".exe", "");
}

function getApplicationName(windowTitle, delimiter) {
    const splitName = windowTitle.split(delimiter);
    return splitName[splitName.length - 1];
}

async function updateReplayStatus() {
    if (!connected) return;

    const status = await fetchReplayStatus();
    eventBus.emit("update-tray-image", status.outputActive);
    if (status && appManager.getOverlayWindow() != null) {
        appManager.getOverlayWindow().webContents.send("change-image", status.outputActive);
    }

}

async function fetchReplayStatus() {
    try {
        return await obs.call("GetReplayBufferStatus");
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
