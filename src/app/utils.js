const path = require('path');
const os = require('os');

function getVideoDirectory() {
    const homeDir = os.homedir();

    if (process.platform === 'win32') {
        return path.join(homeDir, 'Videos');
    } else if (process.platform === 'darwin') {
        return path.join(homeDir, 'Movies');
    } else if (process.platform === 'linux') {
        const xdgVideos = process.env.XDG_VIDEOS_DIR || path.join(homeDir, 'Videos');
        return xdgVideos;
    } else {
        return path.join(homeDir, 'Videos');
    }
}

module.exports = [getVideoDirectory];
