const appManager = require('./src/app/appManager');
const obsManager = require('./src/app/obsManager');
const configManager = require("./src/app/configManager");

try {
    configManager.init();
    obsManager.init();
    appManager.init();
}

catch(err) {
    console.log(err);
    process.exit(0);
}

