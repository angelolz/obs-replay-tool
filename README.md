# OBS Replay Tool

This was made as a way for me to try and make OBS a good (maybe even better) alternative to GeForce Experience.
I thought about doing this because of how much customization when using OBS's Replay Buffer tool instead of Instant Replay from GeForce Experience. For example, in OBS I can record up to 6 different audio tracks, as compared to GE's two tracks limitation. This allows me to separate game audio, mic audio, and Discord call audio.

This is currently a work in progress right now, but from testing it works so far, although I do want to add some features.

# Features

- Replays can be saved into their own folders, given a base path to save to.
- Turn off Replay Buffer when computer is idle for a certain amaount of time (default: 15 minutes)

# Setup

1. Clone this repo.
2. Install dependencies: `npm i`
3. Run `electron index.js` in the terminal.
4. A `config.json` file should be automatically created with the default settings.
5. Fill in the websocket authentication information, as well as other required fields.
6. You should see a "🔁" icon in the bottom left corner of your screen if your replay is on, and a "🔁 + ❌" icon when it is off.

# TODO

- add option to pick which corner to show overlay
- put replays in their own game's folders
