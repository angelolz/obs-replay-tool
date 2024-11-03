const configManager = require("../app/configManager.js");

class LogLevel {
    static ERROR = 'ERROR';
    static INFO = 'INFO';
    static WARNING = 'WARNING';
    static DEBUG = 'DEBUG';

    static isValid(level) {
        return [LogLevel.ERROR, LogLevel.INFO, LogLevel.WARNING, LogLevel.DEBUG].includes(level);
    }
}

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
        const timeString = now.toLocaleTimeString(undefined, { hour12: false, hourCycle: 'h23' }); // 24-hour format
        console.log(`[${timeString}] [${level}] ${message}`);
    }
}

// Export both Logger and LogLevel
module.exports = { Logger, LogLevel };