const { ipcRenderer } = require('electron');

ipcRenderer.on('update-logs', (event, logs) => {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';

    logs.forEach(log => {
        const logLine = document.createElement('div');
        logLine.className = 'log-line';

        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = `[${log.timestamp}] `;
        timestampSpan.style.color = 'darkgrey';

        const levelSpan = document.createElement('span');
        levelSpan.textContent = `[${log.level}] `;
        levelSpan.style.color = getColorForLevel(log.level);

        const messageSpan = document.createElement('span');
        messageSpan.textContent = log.message;

        logLine.appendChild(timestampSpan);
        logLine.appendChild(levelSpan);
        logLine.appendChild(messageSpan);

        logContainer.appendChild(logLine);
    });

    logContainer.scrollTop = logContainer.scrollHeight;
});

function getColorForLevel(level) {
    switch(level) {
        case "ERROR":
            return 'red';
        case "INFO":
            return '#37eddb';
        case "WARNING":
            return 'yellow'
        case "DEBUG":
            return '#3c7d76';
        default:
            return '#959696';
    }
}
