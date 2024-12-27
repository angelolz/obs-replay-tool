import { BrowserWindow, screen } from 'electron';
import configManager from './configManager';
import { LogLevel } from '../logger/logLevel';
import eventBus from './eventEmitter';
import { LogEntry } from '../types';

let loggerWindow: BrowserWindow | null = null;
const logBuffer: LogEntry[] = [];

export function init(): void {
    if (configManager.getConfig().app.showLogs === true) {
        createLogWindow();
    }

    eventBus.on('open-log-window', createLogWindow);
    eventBus.on('close-log-window', closeLogWindow);
}

export function createLogWindow(): void {
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
        x,
        y,
        autoHideMenuBar: true,
        resizable: true,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        focusable: true,
    });

    loggerWindow.on('closed', () => {
        loggerWindow = null;

        const config = configManager.getConfig();
        config.app.showLogs = false;
        configManager.saveConfig(config);

        eventBus.emit('update-tray-menu');
    });

    loggerWindow.loadFile('overlays/logger/logger.html');
    loggerWindow.webContents.once('did-finish-load', () => {
        updateLogWindow();
    });
}

export function closeLogWindow(): void {
    if (loggerWindow && loggerWindow.isVisible()) {
        loggerWindow.close();
    }

    const config = configManager.getConfig();
    config.app.showLogs = false;
    configManager.saveConfig(config);

    eventBus.emit('update-tray-menu');
}

export function addLog(level: string, message: string): void {
    if (!LogLevel.isValid(level)) {
        const errLog: LogEntry = {
            timestamp: getCurrentTimeString(),
            level: 'INVALID LEVEL',
            message,
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
    if (logBuffer.length > 100) {
        logBuffer.shift();
    }

    updateLogWindow();
}

function formatLogMessage(level: string, message: string): LogEntry {
    const now = new Date();
    const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
    return {
        timestamp: timeString,
        level,
        message,
    };
}

function updateLogWindow(): void {
    if (loggerWindow && !loggerWindow.isDestroyed()) {
        loggerWindow.webContents.send('update-logs', logBuffer);
    }
}

function getCurrentTimeString(): string {
    const now = new Date();
    return now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
}
