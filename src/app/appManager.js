const { app, BrowserWindow, screen } = require("electron");
const configManager = require("./configManager");
const loggerManager = require("./loggerManager");
const { LogLevel } = require("../logger/logLevel");

let overlayWindow = null;

function init() {
    
    loggerManager.addLog(LogLevel.INFO, "Initializing app...");

    if (configManager.getConfig().showOverlay === true)
        createOverlay();
    else
        loggerManager.addLog(LogLevel.WARN, "Overlay is disabled, you can see Replay Buffer status using the tray icon.");

    app.on("window-all-closed", function () {
        if (process.platform !== "darwin") app.quit();
    });
}

function createOverlay() {
    const SET_WIDTH = 125;
    const SET_HEIGHT = 55;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow = new BrowserWindow({
        width: SET_WIDTH,
        height: SET_HEIGHT,
        x: screenWidth - SET_WIDTH,
        y: screenHeight - SET_HEIGHT,
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
        skipTaskbar: true
    });

    overlayWindow.setIgnoreMouseEvents(true);
    overlayWindow.loadFile("./src/windows/overlay/index.html");

    setInterval(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.show();
            overlayWindow.setSkipTaskbar(true); // Prevents the overlay from appearing in the taskbar
        }
    }, 60000);

    loggerManager.addLog(LogLevel.INFO, "Overlay window created and ready.");
}

function getOverlayWindow() {
    return overlayWindow;
}

module.exports = {
    init,
    getOverlayWindow,
};
