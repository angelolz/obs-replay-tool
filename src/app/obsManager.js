const OBSWebSocket = require("obs-websocket-js").default;
const appManager = require("./appManager");
const configManager = require("./configManager");
const activeWindow = require("active-win");
const { Logger, LogLevel } = require("../logger/logger");

const obs = new OBSWebSocket();
let connected = false;
let tasks = null;
let reconnect = null;
let lastActiveWindow = null;
let attemptedReconnect = false;

function init() {
    connect();

    obs.on("ExitStarted", () => {
        connected = false;
        if (tasks != null) clearInterval(tasks);
        Logger.log(LogLevel.INFO, "OBS shutting down... Attempting to reconnect...");
        reconnect = setInterval(() => connect(), 1000);
    });

    obs.on("ReplayBufferSaved", () => {
        if (appManager.getMainWindow() != null) appManager.getMainWindow().webContents.send("saved-success");
    });
}

function connect() {
    let websocketConfig = configManager.getConfig().websocket;
    obs.connect(`ws://${websocketConfig.ip}:${websocketConfig.port}`, websocketConfig.password)
        .then(() => {
            attemptedReconnect = false;
            if (reconnect != null) clearInterval(reconnect);
            connected = true;
            tasks = setInterval(() => update(), 1000);
            Logger.log(LogLevel.INFO, "OBS is connected!");
        })
        .catch(() => {
            connected = false;

            if (appManager.getMainWindow() != null) appManager.getMainWindow().webContents.send("change-image", false);

            if (!attemptedReconnect) {
                attemptedReconnect = true;
                Logger.log(LogLevel.ERROR, "Failed to connect to OBS, retrying...");
            }

            if (reconnect == null) reconnect = setInterval(() => connect(), 1000);
        });
}

function update() {
    if (connected) {
        updateActiveWindow();
        updateReplayStatus();
    }
}

async function updateActiveWindow() {
    let config = configManager.getConfig();
    if (!connected || config.updateActiveWindow !== true) return;

    const getInputSettingsRes = await obs.call("GetInputSettings", { inputName: config.gameCaptureSourceName }).catch(err => {Logger.log(LogLevel.ERROR, err)});
    if (appManager.getMainWindow() != null)
        appManager
            .getMainWindow()
            .webContents.send(
                "change-active",
                getApplicationName(getInputSettingsRes.inputSettings.window, ":").replace(".exe", "")
            );

    //check if active window is the same
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

    Logger.log(LogLevel.DEBUG, "activeWindowInfo: " + JSON.stringify(activeWindowInfo, null, 2));
    Logger.log(LogLevel.DEBUG, "propertyItems: " + JSON.stringify(getItemsRes.propertyItems, null, 2));

    var index = getItemsRes.propertyItems.findIndex((item) => item.itemName.indexOf(activeApplicationName) >= 0);
    if (index < 0) return;

    var matchingAppName = getApplicationName(getItemsRes.propertyItems[index].itemValue, ":");
    if (config.blacklist.some((item) => item === matchingAppName)) {
        Logger.log(LogLevel.DEBUG, lastActiveWindow + " is blacklisted, skipping");
        return;
    }

    Logger.log(LogLevel.INFO, `changing audio: ${currentApplicationName} -> ${activeApplicationName}`);

    let val = getApplicationName(getItemsRes.propertyItems[index].itemValue, ":").replace(".exe", "");
    await obs.call("SetInputSettings", {
        inputName: config.gameCaptureSourceName,
        inputSettings: { window: getItemsRes.propertyItems[index].itemValue },
    });

    if (appManager.getMainWindow() != null) appManager.getMainWindow().webContents.send("change-active", val);
    Logger.log(LogLevel.INFO, "   changed audio settings to: " + val);
}

async function updateReplayStatus() {
    if (!connected) return;

    var status = await obs.call("GetReplayBufferStatus").catch(err => {Logger.log(LogLevel.ERROR, err)});;
    if (appManager.getMainWindow() != null)
        appManager.getMainWindow().webContents.send("change-image", status.outputActive);
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
    init: init,
};
