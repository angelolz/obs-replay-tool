const OBSWebSocket = require('obs-websocket-js').default;
const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const activeWindow = require('active-win');
require('dotenv').config();

const obs = new OBSWebSocket();
let mainWindow = null;
let tray;
let connected = false;
let tasks = null;
let reconnect = null;
let blacklist;

//set up obs websocket stuff'
setupBlacklist();
connect();

//setup overlay
app.whenReady().then(() => {
    createTray();
    if(process.env.showOverlay === "true") {
        createWindow();
    }

    else {
        console.log("Overlay is disabled, you can see Replay Buffer status using the tray icon.");
    }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

function createTray() {
    tray = new Tray('img/wait.png');
    const context = Menu.buildFromTemplate([
        {label: "Quit", type: "normal"}
    ])
    tray.setToolTip("OBS Replay Tool");
    tray.setContextMenu(context);
}
//overlay function
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 35,
        height: 35,
        autoHideMenuBar: true,
        maxHeight: 100, minHeight: 100,
        resizable: false,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
        focusable: false,
        alwaysOnTop: true
    });

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(0, height - 35);
    mainWindow.setIgnoreMouseEvents(true);

    // Load the HTML file
    mainWindow.loadFile('index.html');

    setInterval(() => mainWindow.show(), 60000); //just incase the overlay isn't on top for some reason
}

ipcMain.on('change-tray', (event, state) => {
    tray.setImage(state ? "img/on.png" : "img/off.png");
});

obs.on("ExitStarted", () => {
    connected = false;
    if(tasks != null) clearInterval(tasks);
    console.log("OBS shutting down... Attempting to reconnect...");
    reconnect = setInterval(() => connect(), 1000);
})

function setupBlacklist() {
    blacklist = process.env.blacklist.split(",").filter((e) => e.length > 0);
    console.log("Loaded blacklist,", blacklist.length, "items loaded.");
}

function connect() {
    obs.connect(`${process.env.WEBSOCKET_URL}:${process.env.WEBSOCKET_PORT}`, process.env.WEBSOCKET_PASSWORD)
    .then(() => {
        console.log("OBS is connected!");
        if(reconnect != null) clearInterval(reconnect);
        connected = true;
        tasks = setInterval(() => { update() }, 1000);
    })
    .catch(err => {
        connected = false;
        console.error('Failed to connect to OBS, retrying...');

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
    //check if active window is the same
    var activeWindowInfo = activeWindow.sync();
    const getInputSettingsRes = await obs.call("GetInputSettings", {inputName: process.env.gameCaptureSourceName})
    var isSame = getInputSettingsRes.inputSettings.window.indexOf(activeWindowInfo.title) >= 0

    if(isSame) return;

    //change window
    const getItemsRes = await obs.call("GetInputPropertiesListPropertyItems", {inputName: process.env.gameCaptureSourceName, propertyName: "window"})
    var index = getItemsRes.propertyItems.findIndex(item => item.itemName.indexOf(activeWindowInfo.title) >= 0);

    if(index >= 0) {
        // if(blacklist.findIndex(item => item.indexOf(getItemsRes.propertyItems[index].itemValue)) >= 0) {
        //     console.log("program is blacklisted, skipping")
        //     return;
        // }

        console.log("window is different, changing...");
        console.log("     active window: ", activeWindowInfo.title);
        console.log("     current: ", getInputSettingsRes.inputSettings.window);

        let val =  getItemsRes.propertyItems[index].itemValue;
        await obs.call("SetInputSettings", {inputName: process.env.gameCaptureSourceName, inputSettings: {window: val}})
        console.log("changed audio settings to: ", val)
    }
}

async function updateReplayStatus() {
    var status = await obs.call("GetReplayBufferStatus");
    if(mainWindow != null) mainWindow.webContents.send('change-image', status.outputActive)
}