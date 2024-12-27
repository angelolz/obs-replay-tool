import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const configFilePath: string = path.join(app.getPath('userData'), 'config.json');
const defaultConfigPath: string = './default_config.json';

let config: Record<string, any> = {};

export function init(): void {
    loadConfig();
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
        Object.assign(config, newConfig);
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving config: ', error);
    }
}

export function getConfig(): Record<string, any> {
    return config;
}

export default {
    init,
    loadConfig,
    saveConfig,
    getConfig,
};