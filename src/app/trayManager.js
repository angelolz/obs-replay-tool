const { app, Tray, Menu } = require("electron");
const configManager = require("./configManager");
const eventBus = require("./eventEmitter");

let tray = null;

function init() {
    createTray();
    eventBus.on("update-tray-image", (state) => {
        tray.setImage(state ? "img/on.png" : "img/off.png");
    });
    eventBus.on("update-tray-menu", updateTrayMenu);
    app.on('window-all-closed', (event) => {
        if (process.platform !== 'darwin' && tray) {
          event.preventDefault(); // Prevent default quit behavior [1, 2, 3]
        }
    });
}

function createTray() {
    tray = new Tray("img/wait.png");
    tray.setToolTip("OBS Replay Tool"); 
    updateTrayMenu();
}

function updateTrayMenu() {
    const config = configManager.getConfig();
    const context = Menu.buildFromTemplate([
        {
            label: "Show Overlay",
            type: "checkbox",
            checked: config.app.showOverlay,
            click: (menuItem) => {
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
            label: "Update Active Window",
            type: "checkbox",
            checked: configManager.getConfig().app.updateActiveWindow,
            click: (menuItem) => {
                config.app.updateActiveWindow = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Turn off Replay Buffer when Idle",
            type: "checkbox",
            checked: configManager.getConfig().obs.turnOffReplayWhenIdle,
            click: (menuItem) => {
                config.obs.turnOffReplayWhenIdle = menuItem.checked;
                eventBus.emit("toggle-idle-replay", menuItem.checked);
                configManager.saveConfig(config);
            },
        },
        { type: "separator" },
        {
            label: "Show Debug Messages",
            type: "checkbox",
            checked: configManager.getConfig().app.isDebug,
            click: (menuItem) => {
                config.app.isDebug = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Show Logs Window",
            type: "checkbox",
            checked: configManager.getConfig().app.showLogs,
            click: (menuItem) => {
                config.app.showLogs = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) {
                    eventBus.emit("open-log-window");
                } else {
                    eventBus.emit("close-log-window");
                }
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            type: "normal",
            click: () => { app.quit();},
        },
    ]);

    tray.setContextMenu(context);
}

module.exports = {
    init,
    updateTrayMenu
}