import * as fs from 'fs';
import * as path from 'path';
import { app, BrowserWindow, ipcMain, screen } from 'electron';
import eventBus from './eventEmitter';
import { addLog } from './loggerManager';
import { LogLevel } from '../logger/logLevel';

const configFilePath: string = path.join(app.getPath('userData'), 'config.json');
const defaultConfigPath: string = './default_config.json';

let config: Record<string, any> = {};
let configWindow: BrowserWindow | null = null;

export function init(): void {
    loadConfig();

    eventBus.on('open-config-window', createConfigWindow);

    ipcMain.handle('config:get', () => getConfig());
    ipcMain.handle('config:save', (_event, updates: Record<string, any>) => {
        saveConfig(updates);
        return getConfig();
    });
}

export function loadConfig(): void {
    try {
        if (fs.existsSync(configFilePath)) {
            console.log('Using existing config: ' + path.resolve(configFilePath));
            const rawData = fs.readFileSync(configFilePath, 'utf-8');
            config = JSON.parse(rawData);
        } else if (fs.existsSync(defaultConfigPath)) {
            console.log("Couldn't find existing config, using default instead.");
            console.log(
                "Please make sure to update the gameCaptureSourceName and the websocket password (if you're using one) in your config.json!"
            );
            const rawData = fs.readFileSync(defaultConfigPath, 'utf-8');
            const defaultConfig = JSON.parse(rawData);
            saveConfig(defaultConfig);
            config = defaultConfig;
        } else {
            console.log("Couldn't find default config.");
            config = {};
        }
    } catch (error) {
        console.error('Error loading config: ', error);
        config = {};
    }
}

export function saveConfig(newConfig: Record<string, any>): void {
    try {
        // Settings submissions contain only the fields shown in the pane. Merge them
        // recursively so future config keys are not lost when the form is saved.
        config = mergeConfig(config, newConfig);
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
        eventBus.emit('config-updated', config);
    } catch (error) {
        console.error('Error saving config: ', error);
    }
}

function mergeConfig(current: Record<string, any>, updates: Record<string, any>): Record<string, any> {
    const merged = { ...current };
    for (const [key, value] of Object.entries(updates)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            merged[key] = mergeConfig(current[key] || {}, value);
        } else {
            merged[key] = value;
        }
    }
    return merged;
}

export function getConfig(): Record<string, any> {
    return config;
}

export function createConfigWindow(): void {
    const SET_WIDTH = 500,
         SET_HEIGHT = 900;
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().size;
    const x = Math.round((screenWidth - SET_WIDTH) / 2);
    const y = Math.round((screenHeight - SET_HEIGHT) / 2);
        
    configWindow = new BrowserWindow({
            minWidth: SET_WIDTH,
            minHeight: SET_HEIGHT,
            width: SET_WIDTH,
            height: SET_HEIGHT,
            x,
            y,
            autoHideMenuBar: true,
            resizable: false,
            frame: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            focusable: true,
        });

    const configPath = app.isPackaged
        ? path.join(app.getAppPath(), 'src', 'overlays', 'config', 'config.html')
        : path.join(app.getAppPath(), 'overlays', 'config', 'config.html');
    configWindow.loadFile(configPath);
    
}

export function closeConfigWindow(): void {
    if (configWindow && configWindow.isVisible()) {
        configWindow.close();
    }
}

export default {
    init,
    loadConfig,
    saveConfig,
    getConfig,
};
