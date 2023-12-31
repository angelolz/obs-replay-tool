# OBS Replay Tool
This was made as a way for me to try and make OBS a good (maybe even better) alternative to GeForce Experience.
I thought about doing this because of how much customization when using OBS's Replay Buffer tool instead of Instant Replay from GeForce Experience. For example, in OBS I can record up to 6 different audio tracks, as compared to GE's two tracks limitation. This allows me to separate game audio, mic audio, and Discord call audio.

This is currently a work in progress right now, but from testing it works so far, although I do want to add some features.

# Setup
1. Clone this repo.
2. Install dependencies: `npm i`
3. Create a `.env` file with these properties:
   ```
   WEBSOCKET_IP="127.0.0.1"
   WEBSOCKET_PORT=""
   WEBSOCKET_PASSWORD=""
   gameCaptureSourceName=""

   # comma separated
   blacklist="" 
   showOverlay=""
   ```
   - `gameCaptureSourceName` is the name of the Audio Application Capture Source in OBS that you want to automatically update based on your active window.
   - `blacklist` is the list of programs that you want the tool to ignore.
   - `showOverlay` (must be set to `"true"` or `"false"`) toggles the replay buffer status overlay. (You can always see the status using the tray icon)
4. Run `electron index.js` in the terminal.
5. You should see a "🔁" icon in the bottom left corner of your screen if your replay is on, and a "🔁 + ❌" icon when it is off.

# TODO
- add option to pick which corner to show overlay
- put replays in their own game's folders
- improve active window detection