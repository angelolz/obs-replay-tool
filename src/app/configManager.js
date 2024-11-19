const fs = require("fs");
const path = require('path');

const configFilePath = "./config.json";
const defaultConfigPath = "./src/app/default_config.json";
let config;

function init() {
    loadConfig();
}

function loadConfig() {
    
    if (fs.existsSync(configFilePath)) {
        console.log("Using existing config: " + path.resolve(configFilePath));
        const rawData = fs.readFileSync(configFilePath);
        config = JSON.parse(rawData);
    } else if (fs.existsSync(defaultConfigPath)) {
        console.log("Couldn't find existing config, using default instead.");
        console.log("Please make sure to update the gameCaptureSourceName and the websocket password (if you're using one) in your config.json!")
        const rawData = fs.readFileSync(defaultConfigPath);
        const defaultConfig = JSON.parse(rawData);
        saveConfig(defaultConfig);
        config  = defaultConfig;
    } else {
        console.log("Couldn't find default config.");
        config = {};
    }
}

// Save config
function saveConfig(con) {
    config = con;
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
}

function getConfig() { 
    return config;
}

module.exports = {
    init, loadConfig, saveConfig, getConfig
}
