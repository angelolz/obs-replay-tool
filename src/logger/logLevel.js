class LogLevel {
    static ERROR = 'ERROR';
    static INFO = 'INFO';
    static WARNING = 'WARNING';
    static DEBUG = 'DEBUG';

    static isValid(level) {
        return [LogLevel.ERROR, LogLevel.INFO, LogLevel.WARNING, LogLevel.DEBUG].includes(level);
    }
}

module.exports = { LogLevel };
