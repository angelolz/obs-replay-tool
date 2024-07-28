const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');

let tray;
let mainWindow = null;

function init() {
    console.log("Initializing app...");

    app.whenReady().then(() => {
        createTray();
        if(process.env.showOverlay === "true")
            createWindow();
        else
            console.log("Overlay is disabled, you can see Replay Buffer status using the tray icon.");
    });

    app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
    });

    ipcMain.on('change-tray', (event, state) => {
        tray.setImage(state ? "img/on.png" : "img/off.png");
    });
}


function createTray() {
    tray = new Tray('img/wait.png');
    const context = Menu.buildFromTemplate([
        {label: "Quit", type: "normal", click: () => { app.quit()}}
    ])
    tray.setToolTip("OBS Replay Tool");
    tray.setContextMenu(context);
}

//overlay function
function createWindow() {
    const SET_WIDTH = 70, SET_HEIGHT = 35;
    mainWindow = new BrowserWindow({
        width: SET_WIDTH,
        height: SET_HEIGHT,
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

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(screenWidth - SET_WIDTH, screenHeight - SET_HEIGHT);
    mainWindow.setIgnoreMouseEvents(true);

    // Load the HTML file
    mainWindow.loadFile('index.html');

    setInterval(() => mainWindow.show(), 60000); //just incase the overlay isn't on top for some reason
}

function getMainWindow() {
    return mainWindow;
}

module.exports = {
    init,
    getMainWindow
};