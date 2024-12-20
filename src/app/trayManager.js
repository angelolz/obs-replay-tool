const { app, ipcMain, Tray, Menu } = require("electron");
const configManager = require("./configManager");
const eventBus = require("./eventEmitter");

let tray = null;

function init() {
    app.whenReady().then(() => {
        createTray();
    })

    ipcMain.on("change-tray", (event, state) => {
        tray.setImage(state ? "img/on.png" : "img/off.png");
    });

    eventBus.on("update-tray-menu", updateTrayMenu);
}

function createTray() {
    tray = new Tray("img/wait.png");
    tray.setToolTip("OBS Replay Tool"); 
    updateTrayMenu();
}

function updateTrayMenu() {
    const context = Menu.buildFromTemplate([
        {
            label: "Show Overlay",
            type: "checkbox",
            checked: configManager.getConfig().showOverlay,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.showOverlay = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) overlayWindow.show();
                else overlayWindow.hide();
            },
        },
        {
            label: "Update Active Window",
            type: "checkbox",
            checked: configManager.getConfig().updateActiveWindow,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.updateActiveWindow = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Show Debug Messages",
            type: "checkbox",
            checked: configManager.getConfig().isDebug,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.isDebug = menuItem.checked;
                configManager.saveConfig(config);
            },
        },
        {
            label: "Show Logs Window",
            type: "checkbox",
            checked: configManager.getConfig().showLogs,
            click: (menuItem) => {
                var config = configManager.getConfig();
                config.showLogs = menuItem.checked;
                configManager.saveConfig(config);

                if (menuItem.checked) eventBus.emit("open-log-window");
                else eventBus.emit("close-log-window");
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            type: "normal",
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(context);
}

module.exports = {
    init,
    updateTrayMenu
}