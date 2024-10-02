const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require("electron");
const configManager = require("./configManager");

let tray;
let mainWindow = null;

function init() {
    console.log("Initializing app...");

    app.whenReady().then(() => {
        createTray();
        if (configManager.getConfig().showOverlay === true) createWindow();
        else
            console.log(
                "Overlay is disabled, you can see Replay Buffer status using the tray icon."
            );
    });

    app.on("window-all-closed", function () {
        if (process.platform !== "darwin") app.quit();
    });

    ipcMain.on("change-tray", (event, state) => {
        tray.setImage(state ? "img/on.png" : "img/off.png");
    });
}

function createTray() {
    tray = new Tray("img/wait.png");
    const context = Menu.buildFromTemplate([
        {
            label: "Show Overlay",
            type: "checkbox",
            checked: configManager.getConfig().showOverlay,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.showOverlay = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) mainWindow.show();
                else mainWindow.hide();
            },
        },
        {
            label: "Update Active Window",
            type: "checkbox",
            checked: configManager.getConfig().updateActiveWindow,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.updateActiveWindow = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            type: "normal",
            click: () => {
                app.quit();
            },
        },
    ]);
    tray.setToolTip("OBS Replay Tool");
    tray.setContextMenu(context);
}

//overlay function
function createWindow() {
    const SET_WIDTH = 125,
        SET_HEIGHT = 55;
    mainWindow = new BrowserWindow({
        width: SET_WIDTH,
        height: SET_HEIGHT,
        autoHideMenuBar: true,
        maxHeight: SET_WIDTH,
        minHeight: SET_HEIGHT,
        resizable: false,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
        focusable: false,
        alwaysOnTop: true,
    });

    const { width: screenWidth, height: screenHeight } =
        screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(screenWidth - SET_WIDTH, screenHeight - SET_HEIGHT);
    mainWindow.setIgnoreMouseEvents(true);

    // Load the HTML file
    mainWindow.loadFile("./src/overlay/index.html");

    setInterval(() => mainWindow.show(), 60000); //just incase the overlay isn't on top for some reason
}

function getMainWindow() {
    return mainWindow;
}

module.exports = {
    init,
    getMainWindow,
};
