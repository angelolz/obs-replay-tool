const OBSWebSocket = require('obs-websocket-js').default;
const appManager = require('./appManager');
const configManager = require('./configManager');
const activeWindow = require('active-win');

const obs = new OBSWebSocket();
let connected = false;
let tasks = null;
let reconnect = null;
var lastActiveWindow = null;
let attemptedReconnect = false;

function init() {
    connect();

    obs.on("ExitStarted", () => {
        connected = false;
        if(tasks != null) clearInterval(tasks);
        console.log("OBS shutting down... Attempting to reconnect...");
        reconnect = setInterval(() => connect(), 1000);
    });

    obs.on("ReplayBufferSaved", () => {
        if(appManager.getMainWindow() != null)
            appManager.getMainWindow().webContents.send('saved-success');
    });

    obs.on("InputSettingsChanged", (event) => {
        console.log("inputsettingschanged");
        console.log(event.inputSettings);
        if(event.inputName !== configManager.getConfig().gameCaptureSourceName) return;

        // if(appManager.getMainWindow() != null)
        //     appManager.getMainWindow().webContents.send('change-active', getInputSettingsRes.inputSettings.window);
    });
}

function connect() {
    var websocketConfig = configManager.getConfig().websocket;
    obs.connect(`ws://${websocketConfig.ip}:${websocketConfig.port}`, websocketConfig.password)
    .then(() => {
        attemptedReconnect = false;
        console.log("OBS is connected!");
        if(reconnect != null) clearInterval(reconnect);
        connected = true;
        tasks = setInterval(() => { update() }, 1000);
    })
    .catch(() => {
        connected = false;

        if(appManager.getMainWindow() != null) 
            appManager.getMainWindow().webContents.send('change-image', false)

        if(!attemptedReconnect) {
            attemptedReconnect = true;
            console.error('Failed to connect to OBS, retrying...');
        }

        if(reconnect == null)
            reconnect = setInterval(() => connect(), 1000);
    });
}

function update() {
    if(connected) {   
        updateActiveWindow();
        updateReplayStatus();
    }
}

async function updateActiveWindow() {
    let config = configManager.getConfig();
    if(config.updateActiveWindow !== true) return;

    const getInputSettingsRes = await obs.call("GetInputSettings", {inputName: config.gameCaptureSourceName})
    if(appManager.getMainWindow() != null)
        appManager.getMainWindow().webContents.send('change-active', getInputSettingsRes.inputSettings.window);
    
    if(!connected) return;

    //check if active window is the same
    var activeWindowInfo = activeWindow.sync();
    var isSame = (lastActiveWindow != null && lastActiveWindow === activeWindowInfo.owner.name) || getInputSettingsRes.inputSettings.window.indexOf(activeWindowInfo.owner.name) >= 0;
    lastActiveWindow = activeWindowInfo.owner.name;

    if(isSame) return;

    //change window
    const getItemsRes = await obs.call("GetInputPropertiesListPropertyItems", {inputName: config.gameCaptureSourceName, propertyName: "window"})
    // console.log(activeWindowInfo);
    // console.log(getItemsRes.propertyItems);
    var index = getItemsRes.propertyItems.findIndex(item => item.itemName.indexOf(activeWindowInfo.owner.name) >= 0);

    if(index >= 0) {
        if(config.blacklist.some(item => item.indexOf(getItemsRes.propertyItems[index].itemValue))) {
            console.log(lastActiveWindow + " is blacklisted, skipping")
            return;
        }

        console.log("window is different, changing...");
        console.log("     active window: ", activeWindowInfo.owner.name);
        console.log("     current: ", getInputSettingsRes.inputSettings.window);

        let val =  getItemsRes.propertyItems[index].itemValue;
        await obs.call("SetInputSettings", {inputName: config.gameCaptureSourceName, inputSettings: {window: val}})
        
        console.log("changed audio settings to: ", val)

    }
}

async function updateReplayStatus() {
    if(!connected) return;

    var status = await obs.call("GetReplayBufferStatus");
    if(appManager.getMainWindow() != null) appManager.getMainWindow().webContents.send('change-image', status.outputActive)
}

module.exports = {
    init: init
};