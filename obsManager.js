const OBSWebSocket = require('obs-websocket-js').default;
const appManager = require('./appManager');
const activeWindow = require('active-win');

const obs = new OBSWebSocket();
let connected = false;
let tasks = null;
let reconnect = null;
let blacklist;
let attemptedReconnect = false;

function init() {
    setupBlacklist();
    connect();

    obs.on("ExitStarted", () => {
        connected = false;
        if(tasks != null) clearInterval(tasks);
        console.log("OBS shutting down... Attempting to reconnect...");
        reconnect = setInterval(() => connect(), 1000);
    });

    obs.on("ReplayBufferSaved", () => {
        console.log("saved");
        if(appManager.getMainWindow() != null) {
            console.log("calling saved-success");
            appManager.getMainWindow().webContents.send('saved-success');
        }
    });
}

function setupBlacklist() {
    blacklist = process.env.blacklist.split(",").filter((e) => e.length > 0);
    console.log("Loaded blacklist,", blacklist.length, "items loaded.");
}

function connect() {
    obs.connect(`ws://${process.env.WEBSOCKET_IP}:${process.env.WEBSOCKET_PORT}`, process.env.WEBSOCKET_PASSWORD)
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
        updateReplayStatus()
    }
}

async function updateActiveWindow() {
    if(!connected) return;

    //check if active window is the same
    var activeWindowInfo = activeWindow.sync();
    const getInputSettingsRes = await obs.call("GetInputSettings", {inputName: process.env.gameCaptureSourceName})
    var isSame = getInputSettingsRes.inputSettings.window.indexOf(activeWindowInfo.owner.name) >= 0

    if(isSame) return;

    //change window
    const getItemsRes = await obs.call("GetInputPropertiesListPropertyItems", {inputName: process.env.gameCaptureSourceName, propertyName: "window"})
    // console.log(activeWindowInfo);
    // console.log(getItemsRes.propertyItems);
    var index = getItemsRes.propertyItems.findIndex(item => item.itemName.indexOf(activeWindowInfo.owner.name) >= 0);

    if(index >= 0) {
        // if(blacklist.findIndex(item => item.indexOf(getItemsRes.propertyItems[index].itemValue)) >= 0) {
        //     console.log("program is blacklisted, skipping")
        //     return;
        // }

        console.log("window is different, changing...");
        console.log("     active window: ", activeWindowInfo.owner.name);
        console.log("     current: ", getInputSettingsRes.inputSettings.window);

        let val =  getItemsRes.propertyItems[index].itemValue;
        await obs.call("SetInputSettings", {inputName: process.env.gameCaptureSourceName, inputSettings: {window: val}})
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