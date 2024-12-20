const configManager = require("../app/configManager.js");



class Logger {
    static log(level, message) {
        if (!LogLevel.isValid(level)) {
            console.error(`[INVALID LEVEL] ${level}: ${message}`);
            return;
        }

        if (LogLevel.DEBUG === level && configManager.getConfig() !== null && !configManager.getConfig().isDebug) {
            return;
        }

        const now = new Date();
        const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' });
        console.log(`[${timeString}] [${level}] ${message}`);
    }
}

module.exports = { Logger, LogLevel };