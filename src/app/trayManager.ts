import { app, Tray, Menu } from 'electron';
import configManager from './configManager';
import eventBus from './eventEmitter';

let tray: Tray | null = null;

export function init(): void {
    createTray();
    app.on('window-all-closed', (event: Electron.Event) => {
        if (process.platform !== 'darwin' && tray) {
            event.preventDefault();
        }
    });

    eventBus.on('update-tray-image', (state: boolean) => {
        if (tray) {
            tray.setImage(state ? 'img/on.png' : 'img/off.png');
        }
    });

    eventBus.on('update-tray-menu', updateTrayMenu);
}

function createTray(): void {
    tray = new Tray('img/wait.png');
    tray.setToolTip('OBS Replay Tool');
    updateTrayMenu();
}

function updateTrayMenu(): void {
    const config = configManager.getConfig();
    const context = Menu.buildFromTemplate([
        {
            label: 'Show Overlay',
            type: 'checkbox',
            checked: config.app.showOverlay,
            click: (menuItem: Electron.MenuItem) => {
                config.app.showOverlay = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) {
                    eventBus.emit('show-overlay');
                } else {
                    eventBus.emit('hide-overlay');
                }
            },
        },
        {
            label: 'Update Active Window',
            type: 'checkbox',
            checked: configManager.getConfig().app.updateActiveWindow,
            click: (menuItem: Electron.MenuItem) => {
                config.app.updateActiveWindow = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: 'Turn off Replay Buffer when Idle',
            type: 'checkbox',
            checked: configManager.getConfig().obs.turnOffReplayWhenIdle,
            click: (menuItem: Electron.MenuItem) => {
                config.obs.turnOffReplayWhenIdle = menuItem.checked;
                eventBus.emit('toggle-idle-replay', menuItem.checked);
                configManager.saveConfig(config);
            },
        },
        { type: 'separator' },
        {
            label: 'Show Debug Messages',
            type: 'checkbox',
            checked: configManager.getConfig().app.isDebug,
            click: (menuItem: Electron.MenuItem) => {
                config.app.isDebug = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: 'Show Logs Window',
            type: 'checkbox',
            checked: configManager.getConfig().app.showLogs,
            click: (menuItem: Electron.MenuItem) => {
                config.app.showLogs = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) {
                    eventBus.emit('open-log-window');
                } else {
                    eventBus.emit('close-log-window');
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            type: 'normal',
            click: () => {
                app.quit();
            },
        },
    ]);

    if (tray) {
        tray.setContextMenu(context);
    }
}