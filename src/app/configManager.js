const fs = require("fs");
const path = require('path');

const configFilePath = "./config.json";
const defaultConfigPath = './src/config/default_config.json';
let config = {};

function init() {
    loadConfig();
}

function loadConfig() {
    try {
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
            config = defaultConfig;
        } else {
            console.log("Couldn't find default config.");
            config = {};
        }
    } catch(error) {
        console.error("Error loading config: ", error);
        config = {};
    }
}

function saveConfig(newConfig) {
    try {
        Object.assign(config, newConfig);
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error("Error saving config: ", error);
    }
}

function getConfig() { 
    return config;
}

module.exports = {
    init, loadConfig, saveConfig, getConfig
}