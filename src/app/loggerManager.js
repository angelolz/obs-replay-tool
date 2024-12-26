const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const configManager = require('./configManager');
const { LogLevel } = require('../logger/logLevel');
const eventBus = require('./eventEmitter');

let loggerWindow = null;
const logBuffer = [];

function init() {
    if (configManager.getConfig().app.showLogs === true) createLogWindow();

    eventBus.on('open-log-window', createLogWindow);
    eventBus.on('close-log-window', closeLogWindow);
}

function createLogWindow() {
    if (loggerWindow) {
        loggerWindow.focus();
        return;
    }

    const SET_WIDTH = 900,
        SET_HEIGHT = 450;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;
    const x = Math.round((screenWidth - SET_WIDTH) / 2);
    const y = Math.round((screenHeight - SET_HEIGHT) / 2);
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
        focusable: true,
    });

    loggerWindow.on('closed', () => {
        loggerWindow = null;

        let config = configManager.getConfig();
        config.app.showLogs = false;
        configManager.saveConfig(config);

        eventBus.emit('update-tray-menu');
    });

    loggerWindow.loadFile('./src/windows/logger/logger.html');
    loggerWindow.webContents.once('did-finish-load', () => {
        updateLogWindow();
    });
}

function closeLogWindow() {
    if (loggerWindow && loggerWindow.isVisible()) loggerWindow.close();

    let config = configManager.getConfig();
    config.app.showLogs = false;
    configManager.saveConfig(config);

    eventBus.emit('update-tray-menu');
}

function addLog(level, message) {
    if (!LogLevel.isValid(level)) {
        let errLog = {
            timestamp: timeString,
            level: 'INVALID LEVEL',
            message: message,
        };
        logBuffer.push(errLog);

        console.log(`[${errLog.timestamp}] [${errLog.level}] ${errLog.message}`);
        return;
    }

    const config = configManager.getConfig();
    if (level === LogLevel.DEBUG && !config.app.isDebug) {
        return;
    }

    const logMessage = formatLogMessage(level, message);
    console.log(`[${logMessage.timestamp}] [${logMessage.level}] ${logMessage.message}`);
    logBuffer.push(logMessage);
    if (logBuffer.length > 100) logBuffer.shift();

    updateLogWindow();
}

function formatLogMessage(level, message) {
    const now = new Date();
    const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
    return {
        timestamp: timeString,
        level: level,
        message: message,
    };
}

function updateLogWindow() {
    if (loggerWindow && !loggerWindow.isDestroyed()) {
        loggerWindow.webContents.send('update-logs', logBuffer);
    }
}

module.exports = { init, createLogWindow, closeLogWindow, addLog };
