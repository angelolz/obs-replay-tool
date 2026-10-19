import { app, dialog } from 'electron';
import { init as configManagerInit} from './app/configManager';
import { init as obsManagerInit} from './app/obsManager';
import { init as appManagerInit } from './app/appManager';
import { init as trayManagerInit } from './app/trayManager';
import { init as loggerManagerInit } from './app/loggerManager';
import { shutdown as obsManagerShutdown } from './app/obsManager';
import { shutdown as appManagerShutdown } from './app/appManager';
import * as statics from './statics';

function shutdown(): void {
    obsManagerShutdown();
    appManagerShutdown();
}

app.on('before-quit', shutdown);
app.on('browser-window-created', (_event, window) => {
    // Electron 27 skips app quit hooks during Windows shutdown.
    window.on('session-end', shutdown);
});

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
