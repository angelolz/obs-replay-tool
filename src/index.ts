import { app } from 'electron';
import { init as configManagerInit} from './app/configManager';
import { init as obsManagerInit} from './app/obsManager';
import { init as appManagerInit } from './app/appManager';
import { init as trayManagerInit } from './app/trayManager';
import { init as loggerManagerInit } from './app/loggerManager';
import * as statics from './statics';

try {
    app.whenReady().then(() => {
        console.log(`OBS Replay Tool v${statics.version} by ${statics.author} (${statics.authorUrl})`);
        configManagerInit();
        obsManagerInit();
        appManagerInit();
        trayManagerInit();
        loggerManagerInit();
    });
} catch (err) {
    console.error(err);
    process.exit(1);
}