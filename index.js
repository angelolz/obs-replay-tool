const OBSWebSocket = require('obs-websocket-js').default;
const { app, BrowserWindow, screen } = require('electron');
const activeWindow = require('active-win');
require('dotenv').config();

const obs = new OBSWebSocket();
let mainWindow;

//set up obs websocket stuff
obs.connect(`${process.env.WEBSOCKET_URL}:${process.env.WEBSOCKET_PORT}`, process.env.WEBSOCKET_PASSWORD)
    .then(() => {
        //check if set active window is different from current active
        setInterval(() => { 
            updateActiveWindow();
            updateReplayStatus()
        }, 1000);
    })
    .catch(err => { console.error('Failed to connect to OBS', err); });

//setup overlay
app.whenReady().then(createWindow);
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

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
}

async function updateActiveWindow() {
    var isSame = await checkActiveWindow();
    if(isSame === false) {
        console.log("window is different, changing")
        setNewWindow(); 
    }
}
async function checkActiveWindow() {
    var activeWindowInfo = activeWindow.sync();
    const res = await obs.call("GetInputSettings", {inputName: process.env.gameCaptureSourceName})
    return res.inputSettings.window.indexOf(activeWindowInfo.title) >= 0
}

async function setNewWindow() {
    const res = await obs.call("GetInputPropertiesListPropertyItems", {inputName: process.env.gameCaptureSourceName, propertyName: "window"})
    
    var activeWindowInfo = activeWindow.sync();
    var index = res.propertyItems.findIndex(item => item.itemName.indexOf(activeWindowInfo.title) >= 0);

    if(index >= 0) {
        await obs.call("SetInputSettings", {inputName: process.env.gameCaptureSourceName, inputSettings: {window: res.propertyItems[index].itemValue}})
        console.log("changed audio settings")
    }
}

async function updateReplayStatus() {
    var status = await obs.call("GetReplayBufferStatus");
    mainWindow.webContents.send('change-image', status.outputActive)
}