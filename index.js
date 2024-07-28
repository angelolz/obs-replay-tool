const appManager = require('./appManager');
const obsManager = require('./obsManager');
require('dotenv').config();

try {
    obsManager.init();
    appManager.init();
}

catch(err) {
    console.log(err)
    process.exit(0);
}

