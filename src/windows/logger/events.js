const { ipcRenderer } = require('electron');

ipcRenderer.on('update-logs', (event, logs) => {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = ''; // Clear previous logs
    logs.forEach(log => {
        const logLine = document.createElement('div');
        logLine.textContent = log;
        logLine.className = 'log-line';
        logContainer.appendChild(logLine);
    });
    logContainer.scrollTop = logContainer.scrollHeight; // Auto-scroll to bottom
});