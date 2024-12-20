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
            checked: config.showOverlay,
            click: (menuItem) => {
                config.showOverlay = menuItem.checked;
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
            checked: configManager.getConfig().updateActiveWindow,
            click: (menuItem) => {
                config.updateActiveWindow = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Show Debug Messages",
            type: "checkbox",
            checked: configManager.getConfig().isDebug,
            click: (menuItem) => {
                config.isDebug = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Show Logs Window",
            type: "checkbox",
            checked: configManager.getConfig().showLogs,
            click: (menuItem) => {
                config.showLogs = menuItem.checked;
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