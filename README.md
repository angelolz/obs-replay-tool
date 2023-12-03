# OBS Replay Tool
This was made as a way for me to try and make OBS a good (maybe even better) alternative to GeForce Experience.
I thought about doing this because of how much customization when using OBS's Replay Buffer tool instead of Instant Replay from GeForce Experience. For example, in OBS I can record up to 6 different audio tracks, as compared to GE's two tracks limitation. This allows me to separate game audio, mic audio, and Discord call audio.

This is currently a work in progress right now, but from testing it works so far, although I do want to add some features.

# Setup
1. Clone this repo.
2. Install dependencies: `npm i`
3. Create a `.env` file with these properties:
   ```
   WEBSOCKET_URL=""
    WEBSOCKET_PORT=""
    WEBSOCKET_PASSWORD=""
    gameCaptureSourceName=""
   ```
   - `gameCaptureSourceName` is the name of the Audio Application Capture Source in OBS that you want to automatically update based on your active window.
4. Run `electron.js`.
5. You should see a "🔁" icon in the bottom left corner of your screen if your replay is on, and a "🔁 + ❌" icon when it is off.

# TODO
- add option to pick which corner to show overlay
- add option to hide overlay when replay buffer is off
- add window name blacklist