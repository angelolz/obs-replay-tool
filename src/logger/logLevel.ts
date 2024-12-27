class LogLevel {
    static ERROR: string = 'ERROR';
    static INFO: string = 'INFO';
    static WARNING: string = 'WARNING';
    static DEBUG: string = 'DEBUG';

    static isValid(level: string): boolean {
        return [LogLevel.ERROR, LogLevel.INFO, LogLevel.WARNING, LogLevel.DEBUG].includes(level);
    }
}

export { LogLevel };
