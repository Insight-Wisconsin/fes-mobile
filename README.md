# FESMobile

FESMobile is a mobile app that assists people with **foot drop** using a Functional Electrical
Stimulation (FES) device. The app detects foot drop while walking and triggers timed electrical
impulses over Bluetooth to smooth out the walking pattern.

Detection currently uses the phone's gyroscope, with the phone worn on the leg. The plan is to
move this to an external IMU that streams to the app through the ESP32, so the phone can stay in
a pocket. The ESP32 already sends telemetry to the app (simulated values for now); see
[`firmware/`](firmware/).

Built with React Native and Expo. Developed by **Insight Wisconsin – UW–Madison**.

---

## Contents

- [How this works (read this first)](#how-this-works-read-this-first)
- [Before you start: what to install](#before-you-start-what-to-install)
- [Setup](#setup)
- [Get the FES app on your iPhone](#get-the-fes-app-on-your-iphone)
- [Daily development](#daily-development)
- [Connecting to the ESP32](#connecting-to-the-esp32)
- [Data storage](#data-storage)
- [Available commands](#available-commands)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## How this works (read this first)

The app talks to the ESP32 over Bluetooth, and **Expo Go can't do Bluetooth**. Expo Go only
contains Expo's own native code, and our Bluetooth library isn't part of it.

So instead of Expo Go, each iPhone gets our own **FES app**, a "development build". It works just
like Expo Go: you run `npm start` on your computer, open FES on the phone, and your code loads
over Wi-Fi with live reload. The difference is that Bluetooth is built in.

- The FES app is **installed once per iPhone**. Building it needs **Xcode, which only runs on a Mac**.
- After that, **day-to-day development works from a Mac or a Windows PC.** The phone just loads
  your code from whichever computer runs `npm start`.

| | Mac | Windows |
|---|---|---|
| Edit code, run the app, test Bluetooth with the ESP32 | ✅ | ✅ |
| Install the FES app on your own iPhone | ✅ `npm run ios:device` | Plug your iPhone into a teammate's Mac, or use a [cloud build](#windows-later-cloud-build-from-your-pc) once the team's paid Apple account exists |

---

## Before you start: what to install

The setup script installs the project's npm packages, but it **cannot install the programs below**.
If any are missing, it stops and tells you which one to get.

### Everyone

| Program | Version | Download |
|---|---|---|
| **Node.js** | 20.19.4+, 22.13+, 24.3+, or 25+ (LTS recommended) | <https://nodejs.org/en/download> |
| **Git** | any recent version | <https://git-scm.com/downloads> |
| **iPhone** | iOS 16.4 or newer | Settings → General → Software Update |

`npm` ships with Node.js. React Native 0.86 rejects older Node releases and the odd-numbered ones
(21, 23).

### Mac only (to build the FES app onto iPhones)

| Program | Version | Download |
|---|---|---|
| **Xcode** | **26.4 or newer** (required by Expo SDK 57) | [Mac App Store](https://apps.apple.com/app/xcode/id497799835). Open it once after installing. |
| **CocoaPods** | any recent version | `brew install cocoapods` (Homebrew: <https://brew.sh>) |
| **An Apple ID** | a free one works | <https://account.apple.com> |
| Watchman *(optional)* | | `brew install watchman` |

---

## Setup

```bash
git clone -b production-ble https://github.com/Insight-Wisconsin/fes-mobile.git
cd fes-mobile
```

Already have it? From inside the `fes-mobile` folder: `git checkout production-ble`, then `git pull`.
Then run the setup script below.

**Mac / Linux / Git Bash:**

```bash
bash scripts/setup.sh
```

**Windows PowerShell:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

The script checks your tools, installs dependencies, and checks the project. **On a Mac** it also
creates `.env.local` with your personal iOS bundle ID (see [why](#why-each-mac-has-its-own-bundle-id)).

---

## Get the FES app on your iPhone

You only do this once per iPhone. You'll also need to redo it after a *native* change (a new native
library or a Bluetooth/permission setting) or, on a free Apple ID, every 7 days.

### On a Mac

1. **Once per Mac:** **Xcode → Settings → Accounts → `+`** → sign in with your Apple ID (a free one
   works). Then select the **(Personal Team)** row → **Manage Certificates…** → **`+`** →
   **Apple Development** → **Done**.
2. **Plug the iPhone in with a cable**, unlock it, and tap **Trust This Computer**.
3. **On the iPhone:** **Settings → Privacy & Security → Developer Mode → On**. It restarts; tap
   **Turn On**. If the setting isn't there yet, it appears after step 4 runs once. Turn it on, then
   run step 4 again.
4. Build and install:

   ```bash
   npm run ios:device
   ```

   - Pick your iPhone from the list. The first build takes about 10–20 minutes; later ones reuse
     it and are much faster.
   - If it asks for a signing team, pick **(Personal Team)**.
   - If the Mac asks for a keychain password, type the **Mac's login password** and click
     **Always Allow**.
5. **On the iPhone:** **Settings → General → VPN & Device Management** → tap your Apple ID →
   **Trust**.
6. Open FES. When it asks to find devices on your **Local Network**, tap **Allow**. That's how it
   reaches your computer.

### Rebuilding (new iPhone, 7-day reinstall, native changes)

Plug the iPhone in and run the same command, `npm run ios:device`. You don't need to delete
anything first:

- It **reuses the last build**, so it's much faster than the first one.
- It **rebuilds from scratch by itself** when `app.json`, `app.config.js`, `package.json` or
  `.env.local` changed since the last build, so native changes always get in.
- It lets Xcode **register a new iPhone or renew an expired install** on every build. (Plain
  `npx expo run:ios` can't after its first build, which causes the "No profiles" error.)

To skip the iPhone list, pass the ID the build prints after `Using --device`:

```bash
npm run ios:device -- 00008140-0123456789ABCDEF
```

A new iPhone also needs steps 2, 3 and 5 above. The logic lives in
[`scripts/ios-device.sh`](scripts/ios-device.sh).

### Windows: now (via a teammate's Mac)

Plug your iPhone into a Mac teammate's Mac and have them run `npm run ios:device`, picking
**your** iPhone. That's it. From then on you develop from your PC (see
[Daily development](#daily-development)). With free Apple IDs, the install expires after 7 days,
so repeat this weekly.

### Windows: later (cloud build from your PC)

Once the team has a paid Apple Developer account (or one through UW), you won't need a Mac at all:

```bash
npm run ios:register     # once per iPhone: open the link it prints on the iPhone
npm run ios:build        # Expo builds the app in the cloud; open the install link on the iPhone
```

Installs made this way last a year. The first-time setup (linking the Expo project and Apple
credentials) is a one-off job for whoever manages the Apple account.

### Why each Mac has its own bundle ID

A free Apple ID can't reuse a bundle ID another person has already registered. So `setup.sh` gives
each Mac its own ID in `.env.local` (for example `com.insightwisconsin.fes.alex`). `.env.local` is
gitignored and never committed; see `.env.example`. Once everyone is on the shared paid Apple team,
delete that line so everyone uses `com.insightwisconsin.fes`.

---

## Daily development

On a Mac **or** a Windows PC:

```bash
npm start
```

Scan the QR code with the iPhone **Camera app**, or just open **FES**: it lists dev servers on your
network. Saving a file reloads the app instantly. Plain JS/TS changes **never** need a rebuild.

**Windows:** the first time, Windows Firewall asks about Node.js. Allow it on **Private** networks.

**Quick UI preview without Bluetooth (no FES app needed):** `npm run start:go` opens the app in
[Expo Go](https://apps.apple.com/app/expo-go/id982107779) instead. You must be signed in with
`npx expo login` and in Expo Go with the same account. The Bluetooth banner will say *"Bluetooth
needs a development build"*, which is expected.

---

## Connecting to the ESP32

1. Power on the ESP32 (it advertises as **`Divij_ESP32`**).
2. In FES, tap the Bluetooth banner on the home screen and allow Bluetooth when iOS asks.
3. The banner goes *Scanning → Connecting → Connected*. The intensity dial then sends its value
   to the ESP32 live.

Every command is 2 bytes (`[command, value]`):

| Byte 0 | Value | Effect |
|---|---|---|
| `0x01` | 0–10 | Set intensity |
| `0x02` | — | Start stimulation |
| `0x03` | — | Stop stimulation |
| `0x04` | — | Ping |

The ESP32 telemetry characteristic is read once after connecting and monitored for updates. It
sends a 3-byte packet: battery percentage (`uint8`), sample value (`int8`), and packet sequence
(`uint8`). The sample value is the second value emitted by the firmware; it is not measured BLE
signal strength. The telemetry UUID is `87654321-4321-4321-4321-cba987654321`. The firmware in
[`firmware/esp32_firmware.ino`](firmware/esp32_firmware.ino) sends simulated values for now. An
ESP32 running older firmware without this characteristic still connects and takes commands; the
Real-time data screen tells you to flash the new sketch.

The device name, service/characteristic UUIDs and command bytes live in
[`services/ble/bleService.ts`](services/ble/bleService.ts).

---

## Data storage

The app saves its data **on the phone**, in a SQLite database (`fes.db`, via
[expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)). Nothing leaves the phone yet.

| Table | What it holds |
|---|---|
| `calibrations` | One row per calibration: when, the average "stuck" angle, how many captures were valid |
| `calibration_samples` | Each captured angle in a calibration (5 per calibration) |
| `sessions` | One row per session: start and end time, length, intensity, impulse count, the calibration angle used |
| `session_impulses` | Each impulse fired: when, and at what angle |
| `session_angle_samples` | The angle stream during a session (about 50 readings a second) |
| `settings` | App settings, such as the last intensity chosen on the dial |

What saves what:

- **Calibration** saves itself when it completes. Sessions use the latest saved calibration, so it
  survives restarting the app.
- **A session** is recorded from Start until Stop (or leaving the screen). Angle readings and
  impulses are written once a second. If the app closes mid-session, the next launch marks that
  session `interrupted` and ends it at its last saved reading.
- **The intensity dial** is saved when it settles and restored when the app opens. A session
  records the intensity it started with.
- **The Sessions card** on the home screen counts the saved sessions.

The code lives in [`services/database/`](services/database/). Screens use `storage` and
`SessionRecorder`. The SQL is all in `repository.ts`. To change the schema, **add** a migration at
the end of `schema.ts`. Never edit one that has already been released, because phones that ran it
won't run it again. Then run the tests:

```bash
npm run test:db
```

They run the real schema and queries against Node's built-in SQLite (Node 22.18+), so no phone is
needed.

**Storage needs a rebuilt FES app.** expo-sqlite is a native library, so an FES app built before it
was added has no storage. That app still works, but saves nothing, and logs
`[DB] Storage is not available in this build`. Rebuild it with `npm run ios:device`. Expo Go
includes SQLite, so `npm run start:go` saves data too. The browser (`npm run web`) never saves.

---

## Available commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `npm start` | Dev server for the **FES app** (the everyday command) |
| `npm run start:clear` | Same, clearing the bundler cache (fixes most stale-cache bugs) |
| `npm run start:tunnel` | Same, through a tunnel, for when campus Wi-Fi blocks phone ↔ computer traffic |
| `npm run start:go` | Dev server for **Expo Go** (UI preview, no Bluetooth) |
| `npm run ios:device` | **Mac:** build and install the FES app on a USB-connected iPhone (new iPhone or 7-day reinstall) |
| `npm run ios` | **Mac:** run in the iOS Simulator (UI only; the Simulator has no Bluetooth) |
| `npm run ios:register` | Cloud builds: register an iPhone (needs the team's paid Apple account) |
| `npm run ios:build` | Cloud builds: build the FES app on Expo's servers (needs the team's paid Apple account) |
| `npm run web` | Open the app in a browser (no Bluetooth) |
| `npm run typecheck` | Run TypeScript with no emit |
| `npm run lint` | Run ESLint |
| `npm run test:db` | Test the database schema and queries (no phone needed) |
| `npm run doctor` | Check the project for dependency and config problems |

---

## Project layout

```
fesmobile/
├── app/                      # Screens; file-based routing (expo-router)
│   ├── _layout.tsx           # Root layout; wraps the app in Auth + BLE providers
│   ├── index.tsx             # Entry route, redirects to the home screen
│   ├── (auth)/               # login, signup
│   └── functional/           # home, calibration, session, real-time-data, settings
│
├── components/               # Reusable UI (themed text/view, side menu)
├── constants/                # Theme and colour tokens
├── contexts/                 # AuthContext, BLEContext (app-wide state)
├── hooks/                    # Colour scheme and theme hooks
├── services/
│   ├── ble/                  # Bluetooth: scanning, connecting, sending commands
│   ├── database/             # On-phone SQLite: schema, queries, session recording
│   └── backend/              # Calibration capture (gyroscope + voice prompts)
│
├── firmware/                 # ESP32 Arduino sketch (commands in, telemetry out)
├── assets/images/            # App icon and splash screen
├── scripts/                  # setup.sh / setup.ps1 for new contributors; ios-device.sh builds onto iPhones; test-database.mjs
├── app.json                  # Expo configuration and permissions
├── app.config.js             # Per-developer iOS overrides, read from .env.local
├── .env.example              # Documents the .env.local variables
├── eas.json                  # Cloud build profiles (for the paid Apple account)
└── package.json
```

Routing is file-based: a file in `app/` becomes a route, and the folder name becomes the URL
segment. `app/functional/home.tsx` is the main screen after login. The current routes are:

| Route | Screen |
|---|---|
| `/` | Redirects to `/functional/home` |
| `/login`, `/signup` | Authentication |
| `/functional/home` | Main screen: BLE status, intensity dial, session shortcuts |
| `/functional/calibration` | Per-user calibration flow |
| `/functional/session` | Live gait session with impulse triggering |
| `/functional/real-time-data` | Raw accelerometer readouts and ESP32 BLE telemetry |
| `/functional/settings` | Settings |

The iOS folder is **generated**, not committed: `npm run ios:device` creates `ios/` from
`app.json` and regenerates it when `app.json`, `app.config.js`, `package.json` or `.env.local`
change, so there are no native-project merge conflicts.

### Tech stack

| | |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| Router | expo-router 57 (file-based) |
| Bluetooth | react-native-ble-plx 3.5 |
| Sensors | expo-sensors (gyroscope) |
| Audio | expo-audio |
| Storage | expo-sqlite (SQLite on the phone) |
| Language | TypeScript (strict) |

### A note on authentication

Accounts are currently stored **on the device** with `AsyncStorage`
([`contexts/AuthContext.tsx`](contexts/AuthContext.tsx)). There is no backend, and
passwords are not hashed — fine for development, not for real users.

Moving auth to a real backend is still open work.

---

## Troubleshooting

**The iPhone can't reach my computer (FES or the QR code just spins).**
The phone and computer must be on the same Wi-Fi, and campus networks often block traffic between
devices. Try, in order:
1. On Windows, make sure Node.js is allowed through Windows Firewall on **Private** networks.
2. On the iPhone: **Settings → FES → Local Network → On**.
3. Use a tunnel: `npm run start:tunnel` (or connect both to a phone hotspot).

**`npm run ios:device` says "No code signing certificates are available to use".**
This Mac has no signing certificate yet. Adding the Apple ID doesn't always create one.
1. **Xcode → Settings → Accounts.** If your Apple ID isn't listed, click **`+`** and sign in.
2. Select your Apple ID, then the **(Personal Team)** row, then **Manage Certificates…**
3. Click **`+`** → **Apple Development** → **Done**.
4. Check that `security find-identity -p codesigning -v` lists an "Apple Development" identity, then rerun.

If that doesn't work, run `open ios/*.xcworkspace`, select **FES** → **Signing & Capabilities**, tick
**Automatically manage signing**, and set **Team** to your Personal Team. Xcode creates the certificate.
Quit Xcode and rerun `npm run ios:device`.

**The build says "No profiles for … were found", or that the profile "doesn't include the currently
selected device".**
`npm run ios:device` normally prevents this: it clears the signing team Expo saves in `ios/`, so Xcode
can create profiles and register iPhones on every build. Make sure you ran `npm run ios:device`, not
`npx expo run:ios`. If it still happens, run `rm -rf ios`, then `npm run ios:device`. The folder is
regenerated, so nothing is lost.

If that fails too, build from Xcode: run `open ios/*.xcworkspace`, select **FES** → **Signing &
Capabilities**, tick **Automatically manage signing**, set **Team** to your Personal Team, pick the
iPhone at the top of the window, and click **▶ Run**.

**"The app identifier … cannot be registered to your development team because it is not
available".**
Someone else's Apple ID already owns that bundle ID. Put a unique one in `.env.local`, for example
`FES_IOS_BUNDLE_ID=com.insightwisconsin.fes.yourname`, and rerun `npm run ios:device`.

**Xcode is "too old" or the build fails right away.**
Expo SDK 57 needs **Xcode 26.4+**. Update it from the Mac App Store. If Xcode says the iOS platform
isn't installed: **Xcode → Settings → Components** → install iOS.

**FES opened fine last week but now won't launch.**
Free Apple ID installs expire after 7 days. Plug the phone in and run `npm run ios:device` again.

**The Bluetooth banner says "Bluetooth needs a development build".**
You're in Expo Go (`npm run start:go`). Open the FES app instead, or install it first: see
[Get the FES app on your iPhone](#get-the-fes-app-on-your-iphone).

**"Bluetooth permission is off".**
**Settings → FES → Bluetooth → On**, then tap the banner again.

**"Device not found. Make sure the ESP32 is powered on."**
Scanning worked but nothing advertised as `Divij_ESP32` within 15 seconds. Check the ESP32 is
powered and flashed, and that no other phone is already connected to it.

**Something looks broken after pulling new changes.**

```bash
npm run start:clear
```

If that does not help, reinstall dependencies with `rm -rf node_modules && npm ci`. If the change
added a native library, rebuild the FES app (`npm run ios:device`).

**`npm ci` fails.**
Usually `package-lock.json` and `package.json` have drifted apart. Run `npm install` once, then
commit the updated lockfile.

**Port 8081 is already in use.**
Another dev server is running. Stop it, or use `npm start -- --port 8082`.

**Check for configuration problems.**

```bash
npm run doctor
```

---

## Contributing

We use short-lived feature branches that merge into `dev`. Never commit directly to `main`.

```bash
git checkout dev
git pull
git checkout -b feature/your-feature-name
# make your changes
git commit -m "Add your feature"
git push origin feature/your-feature-name
# then open a pull request targeting `dev`
```

Before pushing, please run:

```bash
npm run typecheck
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for code standards and PR guidelines.

---

## License

MIT — see [LICENSE](./LICENSE).
