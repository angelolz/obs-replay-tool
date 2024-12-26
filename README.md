# OBS Replay Tool

This was made as a way for me to try and make OBS a good (maybe even better) alternative to GeForce Experience.
I thought about doing this because of how much customization when using OBS's Replay Buffer tool instead of Instant Replay from GeForce Experience. For example, in OBS I can record up to 6 different audio tracks, as compared to GE's two tracks limitation. This allows me to separate game audio, mic audio, and Discord call audio.

This is currently a work in progress right now, but from testing it works so far, although I do want to add some features.

# Features

- Nvidia Instant Replay-like overlay that shows Replay Buffer status
- Non-obtrusive icon that displays when a clip was successfully saved
- Automatically change your application audio captur source to capture the active application's audio
    - Blocklist to ignore programs
- See what application OBS is currently capturing
- Replays can be saved into their own folders, given a base path to save to. (default is user's videos folder)
- Turn off Replay Buffer when computer is idle for a certain amaount of time (default: 15 minutes)

# Setup

_(eventually this will have an easy packaged exe to use but for now this is how you use it lol)_

1. Clone this repo.
2. Install dependencies: `npm i`
3. Run `npm run start` in the terminal.
4. A `config.json` file should be automatically created with the default settings.
5. Fill in the websocket authentication information, as well as other required fields.
6. You should see a "🔁" icon in the bottom left corner of your screen if your replay is on, and a "🔁 + ❌" icon when it is off.

# Config Explanation

You can find all the settings you want to change in the `config.json` file that's created whever the app is located at.

- OBS Websocket Settings - `websocket`

    - `ip`: The IP address of your OBS Websocket (default: `127.0.0.1`)
    - `port`: The port of your OBS Websocket (default: `4455`)
    - `password`: The password of your OBS Websocket **(recommended to have!)**
        - Note: \*if you have a password on your websocket, you should **_edit this_** on first launch\*.

- OBS-related settings - `obs`

    - `gameCaptureSourceName`: The name of the **Application Audio Capture** source to modify settings of for focusing the capture towards the active application. (default: `"Game Audio Capture"`)
      - Note: *you may want to **_edit this_** on first launch*.
    - `baseOutputPath`: The base path to use for the Replay Buffer's output directory (default: the user's video directory if left blank)
    - `filenameFormat`: The format to use for the saved replay's file name. You can find more info [here](https://gist.github.com/angelolz/aaf55ce00a6aeba29552f250f1236831). (default: `%CCYY-%MM-%DD %hh-%mm-%ss`)
    - `turnOffReplayWhenIdle`: Disable Replay Buffer when your computer has been idle for a certain amount of time (based on the `idleTime` setting).
    - `idleTime`: The amount of time _(in seconds)_ before Replay Buffer is disabled. Does not do anything if `turnOffReplayWhenIdle` is **false**. (default: `900` or 15 minutes)

- App Overlay related settings - `app`
    - `updateActiveWindow`: When enabled, the **Application Audio Capture** source set in `obs.gameCaptureSourceName` will be updated to change to the active application. (default: `true`)
    - `showOverlay`: Shows/hides the overlay. (default: `true`)
    - `blacklist`: A JSON array of programs for the **Application Audio Capture** source to ignore switching to. The app names are **case-sensitive**!
    - `isDebug`: Show debug messages in the logs. (default: `false`)
    - `showLogs`: Opens the log window. (default: `false`)

# TODO

- probably make a first-time setup thing?
- ui for changing settings instead of having to manually modify config.json
- add option to pick which corner to show overlay
