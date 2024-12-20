const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require("electron");
const configManager = require("./configManager");
const { LogLevel } = require("../logger/logLevel");
const eventBus = require("./eventEmitter");

let loggerWindow = null;
const logBuffer = [];

function init() {
    app.whenReady().then(() => {
        if(configManager.getConfig().showLogs === true)
            createLogWindow();
    });

    eventBus.on("open-log-window", createLogWindow);
    eventBus.on("close-log-window", closeLogWindow);
}

function createLogWindow() {

    if (loggerWindow) {
        loggerWindow.focus();
        return;
    }

    const SET_WIDTH = 600, SET_HEIGHT = 300;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    loggerWindow = new BrowserWindow({
        minWidth: SET_WIDTH,
        minHeight: SET_HEIGHT,
        x: Math.round((screenWidth - SET_WIDTH) / 2),
        y: Math.round((screenHeight - SET_HEIGHT) / 2),
        autoHideMenuBar: true,
        resizable: true,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
        focusable: true
    });

    loggerWindow.on('closed', () => {
        loggerWindow = null;
        
        let config = configManager.getConfig();
        config.showLogs = false;
        configManager.saveConfig(config);

        eventBus.emit("update-tray-menu");
    });

    loggerWindow.loadFile('./src/windows/logger/logger.html');
    loggerWindow.webContents.send('update-logs', logBuffer);
}

function closeLogWindow() {
    if (loggerWindow && loggerWindow.isVisible()) loggerWindow.close();

    let config = configManager.getConfig();
    config.showLogs = false;
    configManager.saveConfig(config);

    eventBus.emit("update-tray-menu");
}

function addLog(level, message) {
    if (!LogLevel.isValid(level)) {
        let errLog = `[INVALID LEVEL] ${level}: ${message}`
        logBuffer.push(errLog);
        console.error(errLog);
        return;
    }

    if (LogLevel.DEBUG === level && configManager.getConfig() !== null && !configManager.getConfig().isDebug) {
        return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
    let logMessage = `[${timeString}] [${level}] ${message}`;
    console.log(logMessage);

    logBuffer.push(logMessage);
    if (logBuffer.length > 100) logBuffer.shift();

    if (loggerWindow && !loggerWindow.isDestroyed()) {
        loggerWindow.webContents.send('update-logs', logBuffer);
    }
}

module.exports = { init, createLogWindow, closeLogWindow, addLog };