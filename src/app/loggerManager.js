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

    const SET_WIDTH = 900, SET_HEIGHT = 450;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;
    const x = Math.round((screenWidth - SET_WIDTH) / 2);
    const y = Math.round((screenHeight - SET_HEIGHT) / 2)
    addLog(LogLevel.DEBUG, `width: ${screenWidth} | height: ${screenHeight} | x = ${x} | y = ${y}`);

    loggerWindow = new BrowserWindow({
        minWidth: SET_WIDTH,
        minHeight: SET_HEIGHT,
        width: SET_WIDTH,
        height: SET_HEIGHT,
        x: x,
        y: y,
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

    const config = configManager.getConfig();
    if (level === LogLevel.DEBUG && !config.isDebug) {
        return;
    }

    const logMessage = formatLogMessage(level, message);
    console.log(logMessage);
    logBuffer.push(logMessage);
    if (logBuffer.length > 100) logBuffer.shift();

    updateLogWindow();
}

function formatLogMessage(level, message) {
    const now = new Date();
    const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
    return `[${timeString}] [${level}] ${message}`;
}

function updateLogWindow() {
    if (loggerWindow && !loggerWindow.isDestroyed()) {
        loggerWindow.webContents.send('update-logs', logBuffer);
    }
}

function logDebugMessage(message) {
    addLog(LogLevel.DEBUG, message);
}



module.exports = { init, createLogWindow, closeLogWindow, addLog };