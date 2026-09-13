import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import configManager from './configManager';
import { addLog } from './loggerManager';
import { LogLevel } from '../logger/logLevel';
import eventBus from './eventEmitter';

let overlayWindow: BrowserWindow | null = null;

export function init(): void {
    addLog(LogLevel.INFO, 'Initializing app...');

    if (configManager.getConfig().app.showOverlay === true) 
        createOverlay();
    else
        addLog(
            LogLevel.WARNING,
            'Overlay is disabled, you can see Replay Buffer status using the tray icon.'
        );

    eventBus.on('hide-overlay', () => {
        if (overlayWindow && overlayWindow.isVisible()) 
            overlayWindow.hide();
    });

    eventBus.on('show-overlay', () => {
        if (overlayWindow) 
            overlayWindow.show();
        else
            createOverlay();
    });

    eventBus.on('config-updated', (config: Record<string, any>) => {
        if (config.app.showOverlay) {
            eventBus.emit('show-overlay');
        } else {
            eventBus.emit('hide-overlay');
        }
    });
}

function createOverlay(): void {
    const SET_WIDTH = 125;
    const SET_HEIGHT = 55;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow = new BrowserWindow({
        width: SET_WIDTH,
        height: SET_HEIGHT,
        x: screenWidth - SET_WIDTH,
        y: screenHeight - SET_HEIGHT,
        autoHideMenuBar: true,
        maxHeight: SET_HEIGHT,
        minHeight: SET_HEIGHT,
        resizable: false,
        transparent: true,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        focusable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
    });

    overlayWindow.setIgnoreMouseEvents(true);
    const overlayPath = app.isPackaged
        ? path.join(app.getAppPath(), 'src', 'overlays', 'app', 'index.html')
        : path.join(app.getAppPath(), 'overlays', 'app', 'index.html');
    overlayWindow.loadFile(overlayPath);

    setInterval(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
            overlayWindow.show();
            overlayWindow.setSkipTaskbar(true); // Prevents the overlay from appearing in the taskbar
        }
    }, 60000);

    addLog(LogLevel.INFO, 'Overlay window created and ready.');
}

export function getOverlayWindow(): BrowserWindow | null {
    return overlayWindow;
}
