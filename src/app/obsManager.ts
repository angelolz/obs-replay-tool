import OBSWebSocket, { OBSResponseTypes } from 'obs-websocket-js';
import { getOverlayWindow } from './appManager';
import { getConfig } from './configManager';
import { addLog } from './loggerManager';
import { LogLevel } from '../logger/logLevel';
import eventBus from './eventEmitter';
import { app, powerMonitor } from 'electron';
import activeWindow from 'active-win';

const obs = new OBSWebSocket();
let connected = false;
let tasks: NodeJS.Timeout | null = null;
let startTasksTimeout: NodeJS.Timeout | null = null;
let reconnect: NodeJS.Timeout | null = null;
let lastActiveWindow: string | null = null;
let attemptedReconnect = false;
let idleTimerInterval: NodeJS.Timeout | null = null;
let replayBufferEnabled = false;
let replayBufferDisabledByIdle = false;
let idleCheckInProgress = false;
let updateInProgress = false;
let shuttingDown = false;

export function init(): void {
    setupEventListeners();
    connect();
    toggleIdleTimer(getConfig().obs.turnOffReplayWhenIdle);
}

function setupEventListeners(): void {
    obs.on('ExitStarted', handleExitStarted);
    obs.on('ReplayBufferSaved', handleReplayBufferSaved);
    eventBus.on('toggle-idle-replay', (toggle: boolean) => {
        toggleIdleTimer(toggle);
    });
    eventBus.on('config-updated', (config: Record<string, any>) => {
        toggleIdleTimer(config.obs.turnOffReplayWhenIdle);
    });
}

export function shutdown(): void {
    if (shuttingDown) return;
    shuttingDown = true;
    connected = false;
    clearIntervalIfNeeded();
    if (idleTimerInterval !== null) {
        clearInterval(idleTimerInterval);
        idleTimerInterval = null;
    }

    // The OS must not wait for the websocket to close during shutdown.
    void obs.disconnect().catch(() => undefined);
}

async function toggleIdleTimer(toggle: boolean): Promise<void> {
    if (idleTimerInterval !== null) {
        clearInterval(idleTimerInterval);
        idleTimerInterval = null;
    }

    if (toggle) {
        idleTimerInterval = setInterval(async () => {
            if (idleCheckInProgress) return;

            const idle = powerMonitor.getSystemIdleTime();
            const obsConfig = getConfig().obs;
            if (!connected || !obsConfig.turnOffReplayWhenIdle) return;

            idleCheckInProgress = true;

            try {
                if (replayBufferEnabled && idle > obsConfig.idleTime) {
                    const stopped = await toggleReplayBuffer(false, 'computer idle timeout');
                    if (stopped) {
                        replayBufferDisabledByIdle = true;
                    }
                } else if (
                    replayBufferDisabledByIdle &&
                    !replayBufferEnabled &&
                    idle === 0
                ) {
                    const started = await toggleReplayBuffer(true, 'computer became active');
                    if (started) {
                        replayBufferDisabledByIdle = false;
                    }
                }
            } finally {
                idleCheckInProgress = false;
            }
        }, 3000);
    } else {
        replayBufferDisabledByIdle = false;
    }
}

async function toggleReplayBuffer(toggle: boolean, cause: string): Promise<boolean> {
    const state = toggle ? 'on' : 'off';

    try {
        addLog(LogLevel.DEBUG, `Requesting Replay Buffer ${state} (cause: ${cause})`);

        if (!toggle && replayBufferEnabled) {
            await obs.call('StopReplayBuffer');
            replayBufferEnabled = false;
            addLog(LogLevel.INFO, `Replay Buffer turned off (cause: ${cause})`);
        } else if (toggle && !replayBufferEnabled) {
            await obs.call('StartReplayBuffer');
            replayBufferEnabled = true;
            addLog(LogLevel.INFO, `Replay Buffer turned on (cause: ${cause})`);
        } else {
            return false;
        }

        return true;
    } catch (err) {
        addLog(
            LogLevel.ERROR,
            `Couldn't turn Replay Buffer ${state} (cause: ${cause}): ${JSON.stringify(err)}`
        );
        return false;
    }
}


function handleExitStarted(): void {
    if (shuttingDown) return;
    connected = false;
    clearIntervalIfNeeded();
    addLog(LogLevel.INFO, 'OBS shutting down... Attempting to reconnect...');
    reconnect = setInterval(connect, 1000);
}

function clearIntervalIfNeeded(): void {
    if (startTasksTimeout !== null) {
        clearTimeout(startTasksTimeout);
        startTasksTimeout = null;
    }
    if (tasks !== null) {
        clearInterval(tasks);
        tasks = null;
    }
    if (reconnect !== null) {
        clearInterval(reconnect);
        reconnect = null;
    }
}

function handleReplayBufferSaved(): void {
    if (getOverlayWindow() != null) {
        getOverlayWindow().webContents.send('saved-success');
    }
}

function connect(): void {
    if (shuttingDown) return;
    const websocketConfig = getConfig().websocket;
    obs.connect(`ws://${websocketConfig.ip}:${websocketConfig.port}`, websocketConfig.password)
        .then(handleConnectionSuccess)
        .catch(handleConnectionFailure);
}

function handleConnectionSuccess(): void {
    if (shuttingDown) {
        void obs.disconnect().catch(() => undefined);
        return;
    }
    attemptedReconnect = false;
    clearIntervalIfNeeded();
    connected = true;

    // give some delay before starting to call obs requests
    startTasksTimeout = setTimeout(() => {
        startTasksTimeout = null;
        if (shuttingDown || !connected) return;
        tasks = setInterval(update, 5000);
    });

    addLog(LogLevel.INFO, 'OBS is connected!');
}


function handleConnectionFailure(): void {
    if (shuttingDown) return;
    connected = false;

    if (getOverlayWindow() != null) {
        getOverlayWindow().webContents.send('change-image', false);
    }

    if (!attemptedReconnect) {
        attemptedReconnect = true;
        addLog(LogLevel.ERROR, 'Failed to connect to OBS, retrying...');
    }

    if (reconnect == null) reconnect = setInterval(connect, 1000);
}

function update(): void {
    if (!connected || shuttingDown || updateInProgress) return;

    updateInProgress = true;
    void Promise.all([updateActiveWindow(), updateReplayStatus()])
        .catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            addLog(LogLevel.ERROR, `OBS update failed: ${message}`);
        })
        .finally(() => {
            updateInProgress = false;
        });
}

async function updateActiveWindow(): Promise<void> {
    const config = getConfig();
    if (!connected || !config.app.updateActiveWindow) return;

    const getInputSettingsRes = await fetchInputSettings(config.obs.gameCaptureSourceName);
    if (!getInputSettingsRes) return;

    if (getOverlayWindow() != null) {
        getOverlayWindow()
            .webContents.send('change-active', formatApplicationName(getInputSettingsRes.inputSettings.window as string));
    }

    await checkAndChangeActiveWindow(config, getInputSettingsRes);
}

async function fetchInputSettings(inputName: string): Promise<OBSResponseTypes['GetInputSettings'] | null> {
    try {
        return await obs.call('GetInputSettings', { inputName });
    } catch (err) {
        addLog(LogLevel.ERROR, err);
        return null;
    }
}

async function checkAndChangeActiveWindow(config: any, getInputSettingsRes: OBSResponseTypes['GetInputSettings']): Promise<void> {
    let activeWindowInfo = activeWindow.sync();
    if (activeWindowInfo === null) return;

    let activeApplicationName = getApplicationName(activeWindowInfo.owner.path, '\\');
    let currentApplicationName = getApplicationName(getInputSettingsRes.inputSettings.window as string, ':');

    if (isSame(activeApplicationName, currentApplicationName) || activeApplicationName.includes('OBSReplayTool.exe'))
        return;

    lastActiveWindow = activeApplicationName;

    const getItemsRes = await obs.call('GetInputPropertiesListPropertyItems', {
        inputName: config.obs.gameCaptureSourceName,
        propertyName: 'window',
    });

    const index = getItemsRes.propertyItems.findIndex((item: any) => item.itemName.indexOf(activeApplicationName) >= 0);
    if (index < 0) return;

    const matchingValue = getItemsRes.propertyItems[index].itemValue;
    const matchingAppName = getApplicationName(matchingValue as string, ':');
    if (config.app.blacklist.some((item: string) => item === matchingAppName)) {
        addLog(LogLevel.DEBUG, `${lastActiveWindow} is blacklisted, skipping`);
        return;
    }

    addLog(LogLevel.DEBUG, `changing audio: ${currentApplicationName} -> ${activeApplicationName}`);
    await changeInputSettings(matchingValue as string);
    await changeOutputSettings(matchingValue as string);
}

async function changeInputSettings(newWindowValue: string): Promise<void> {
    const config = getConfig();
    await obs.call('SetInputSettings', {
        inputName: config.obs.gameCaptureSourceName,
        inputSettings: { window: newWindowValue },
    });

    if (getOverlayWindow() != null) {
        getOverlayWindow().webContents.send('change-active', formatApplicationName(newWindowValue));
    }
    addLog(LogLevel.INFO, `Changed audio settings to: ${formatApplicationName(newWindowValue)}`);
}

function formatApplicationName(windowTitle: string): string {
    return getApplicationName(windowTitle, ':').replace('.exe', '').replace('.EXE', '');
}

async function changeOutputSettings(windowTitle: string): Promise<void> {
    const config = getConfig();

    let path = config.obs.baseOutputPath;
    if (!path) {
        path = app.getPath('videos');
    } else {
        if ((path && path.endsWith('/')) || path.endsWith('\\')) {
            path = path.slice(0, -1);
        }
    }

    addLog(LogLevel.DEBUG, `changing dir to ${path}/${formatApplicationName(windowTitle)}`);
    addLog(
        LogLevel.DEBUG,
        `format is: ${formatApplicationName(windowTitle)} ${config.obs.filenameFormat}`
    );

    await obs.call('SetOutputSettings', {
        outputName: 'Replay Buffer',
        outputSettings: {
            directory: `${path}/${formatApplicationName(windowTitle)}`,
            format: `${formatApplicationName(windowTitle)} ${config.obs.filenameFormat}`,
        },
    });
}

function getApplicationName(windowTitle: string, delimiter: string): string {
    const splitName = windowTitle.split(delimiter);
    return splitName[splitName.length - 1];
}

async function updateReplayStatus(): Promise<void> {
    if (!connected) return;

    const status = await fetchReplayStatus();
    if (status) {
        replayBufferEnabled = status.outputActive;
        if (status.outputActive) {
            replayBufferDisabledByIdle = false;
        }
        eventBus.emit('update-tray-image', replayBufferEnabled);
        if (status && getOverlayWindow() != null) {
            getOverlayWindow().webContents.send('change-image', replayBufferEnabled);
        }
    }
}

async function fetchReplayStatus(): Promise<any> {
    try {
        return await obs.call('GetReplayBufferStatus');
    } catch (err) {
        addLog(LogLevel.ERROR, err);
        return null;
    }
}

function isSame(activeApplicationName: string | null, currentApplicationName: string): boolean {
    return (
        (lastActiveWindow != null && lastActiveWindow === activeApplicationName) ||
        currentApplicationName.indexOf(activeApplicationName) >= 0
    );
}
