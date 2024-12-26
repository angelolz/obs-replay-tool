const configManager = require('./src/app/configManager');
const obsManager = require('./src/app/obsManager');
const appManager = require('./src/app/appManager');
const loggerManager = require('./src/app/loggerManager');
const trayManager = require('./src/app/trayManager');
const { app } = require('electron');

try {
    app.whenReady().then(() => {
        console.log(app.getPath("videos"));
        configManager.init();
        obsManager.init();
        appManager.init();
        trayManager.init();
        loggerManager.init();
    });
} catch (err) {
    console.log(err);
    process.exit(0);
}
