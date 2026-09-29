import { app, dialog } from 'electron';
import { init as configManagerInit} from './app/configManager';
import { init as obsManagerInit} from './app/obsManager';
import { init as appManagerInit } from './app/appManager';
import { init as trayManagerInit } from './app/trayManager';
import { init as loggerManagerInit } from './app/loggerManager';
import * as statics from './statics';

if (!app.requestSingleInstanceLock()) {
    app.whenReady().then(async () => {
        dialog.showErrorBox('Duplicate Instance Detected', 'OBS replay tool is already running, you can only run one instances of this app at a time. App will now close.')
    })
    app.quit();
} else {
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
}