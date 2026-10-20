# FESMobile

FESMobile is a mobile app that assists people with **foot drop** using a Functional Electrical
Stimulation (FES) device. The phone is worn on the leg; the app reads the gyroscope in real time,
detects gait events, and triggers timed electrical impulses over Bluetooth to smooth out the
walking pattern.

Built with React Native and Expo. Developed by **Insight Wisconsin – UW–Madison**.

---

## Contents

- [Before you start: what to install](#before-you-start-what-to-install)
- [Quick start](#quick-start)
- [Manual setup](#manual-setup)
- [What works in Expo Go](#what-works-in-expo-go)
- [Running on real FES hardware](#running-on-real-fes-hardware)
- [Available commands](#available-commands)
- [Project layout](#project-layout)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Before you start: what to install

The setup script installs the project's npm packages, but it **cannot install the programs below**.
Download and install these yourself first. If any are missing, the setup script stops and tells you
which one to get.

### Required — on your computer

| Program | Version | Download |
|---|---|---|
| **Node.js** | 20.19.4+, 22.13+, 24.3+, or 25+ (LTS recommended) | <https://nodejs.org/en/download> |
| **Git** | any recent version | <https://git-scm.com/downloads> |

`npm` ships with Node.js, so you do not install it separately.

> **Node version matters.** React Native 0.86 rejects older releases and the odd-numbered ones
> (21, 23). If `node -v` prints something outside the list above, install an LTS build.

### Required — on your phone

| App | Download |
|---|---|
| **Expo Go** | iOS: <https://apps.apple.com/app/expo-go/id982107779> · Android: <https://play.google.com/store/apps/details?id=host.exp.exponent> |

Your phone and your computer must be on **the same Wi-Fi network**.

### Required — a free Expo account

You need an Expo account, signed in **both on your computer and inside Expo Go**, or the project
will not show up when you scan the QR code.

1. Create a free account at <https://expo.dev/signup> (skip if you have one).
2. Sign in on your computer:

   ```bash
   npx expo login
   ```

3. Open Expo Go on your phone and sign in with **the same account**.

To check who you are signed in as, run `npx expo whoami`.

### Optional — only for native development builds

You do **not** need these to run the app in Expo Go. You need them only to talk to the real
ESP32 stimulator (see [Running on real FES hardware](#running-on-real-fes-hardware)).

| Program | Why | Download |
|---|---|---|
| **Android Studio** | builds the Android dev client; provides the Android SDK and emulator | <https://developer.android.com/studio> |
| **Xcode** (macOS only) | builds the iOS dev client | Mac App Store |
| **Watchman** (macOS) | faster file watching | <https://facebook.github.io/watchman/docs/install> |

iOS builds require a Mac. On Windows and Linux, use Expo Go on an iPhone, or build for Android.

---

## Quick start

```bash
git clone https://github.com/your-org-name/fesmobile.git
cd fesmobile
```

Then run the setup script for your platform. It checks your tools, installs the dependencies, and
verifies the project.

**macOS / Linux / Git Bash on Windows**

```bash
bash scripts/setup.sh
```

**Windows PowerShell**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

Then sign in to Expo and start the dev server:

```bash
npx expo login     # only needed once per machine
npm start
```

A QR code appears in the terminal.

- **Android** — open Expo Go and scan the QR code.
- **iOS** — scan the QR code with the Camera app, then open the link in Expo Go.

Make sure you are signed in to Expo Go on your phone with the same account. The app reloads
automatically when you save a file.

---

## Manual setup

If you would rather not use the script:

```bash
# 1. Confirm your Node version is supported
node -v

# 2. Install dependencies (note: the app lives in a subfolder)
npm ci

# 3. Check the project is healthy
npx expo-doctor

# 4. Sign in to Expo (required for Expo Go)
npx expo login

# 5. Start it
npm start
```

---

## What works in Expo Go

Expo Go is the fastest way to develop and is all you need for most work.

| Feature | Expo Go | Notes |
|---|---|---|
| Login / signup | ✅ | Accounts are stored locally on the device |
| Navigation, all screens | ✅ | |
| Calibration flow | ✅ | |
| Gyroscope / foot-angle detection | ✅ | Uses the phone's real sensors |
| Real-time sensor readouts | ✅ | Open it from the side menu |
| Session beep + haptics | ✅ | |
| **Bluetooth / ESP32 stimulator** | ❌ | Needs a development build |

**Why Bluetooth does not work in Expo Go.** Expo Go is a prebuilt app, so it only contains the
native modules Expo ships with it. `react-native-ble-plx` is not one of them, so the Bluetooth
native module is simply absent.

The app detects this at startup and degrades gracefully instead of crashing: the Bluetooth banner
on the home screen reads *"Bluetooth needs a development build"*, and tapping it explains why.
Everything else runs normally.

---

## Running on real FES hardware

To connect to the ESP32 stimulator you need a **development build** — your own copy of the app,
compiled with the Bluetooth module included. This is a one-time setup per device.

### Android

Requires Android Studio and either a USB-connected phone with USB debugging enabled, or an emulator.

```bash
npm run android
```

### iOS

Requires a Mac with Xcode.

```bash
npm run ios
```

### No Android Studio or Xcode? Build in the cloud

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

Install the resulting build on your phone, then start the dev server for it:

```bash
npm run start:dev-client
```

### Hardware notes

- The app scans for a BLE device advertising the name **`Divij_ESP32`**.
- Make sure the ESP32 is powered on and Bluetooth is enabled on the phone.
- On Android the app requests Bluetooth and location permissions on first connect; Android requires
  location access for BLE scanning.
- Device name, service UUID, and the command bytes live in
  [`services/ble/bleService.ts`](services/ble/bleService.ts).

---

## Available commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `npx expo login` | Sign in to Expo — required before Expo Go will open the project |
| `npx expo whoami` | Show which Expo account you are signed in as |
| `npm start` | Start the dev server for **Expo Go** |
| `npm run start:clear` | Same, clearing the bundler cache (fixes most stale-cache bugs) |
| `npm run start:tunnel` | Same, routed through a tunnel — use when Wi-Fi blocks the QR connection |
| `npm run start:dev-client` | Start the dev server for a **development build** |
| `npm run android` | Build and install the Android development build |
| `npm run ios` | Build and install the iOS development build (macOS only) |
| `npm run web` | Open the app in a browser |
| `npm run typecheck` | Run TypeScript with no emit |
| `npm run lint` | Run ESLint |
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
│   └── backend/              # Calibration storage
│
├── assets/images/            # App icon and splash screen
├── scripts/                  # setup.sh / setup.ps1 for new contributors
├── app.json                  # Expo configuration and permissions
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
| `/functional/real-time-data` | Raw gyroscope / accelerometer readouts (debug) |
| `/functional/settings` | Settings |

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
| Language | TypeScript (strict) |

### A note on authentication

Accounts are currently stored **on the device** with `AsyncStorage`
([`contexts/AuthContext.tsx`](contexts/AuthContext.tsx)). There is no backend, and
passwords are not hashed — fine for development, not for real users.

Moving auth to a real backend is still open work.

---

## Troubleshooting

**The QR code scans, but the project never opens in Expo Go.**
This is almost always the Expo account. You must be signed in on your computer *and* in Expo Go,
with the same account:

```bash
npx expo whoami     # shows your username, or "Not logged in"
npx expo login      # sign in if needed
```

Then open Expo Go on your phone, check you are signed in under the Account tab, and scan again.
The running project also appears under **Development servers** in Expo Go once both sides match.

**The QR code will not connect.**
Your phone and computer must be on the same Wi-Fi network. University and office networks often
block the connection between devices. Use a tunnel instead:

```bash
npm run start:tunnel
```

**Something looks broken after pulling new changes.**
Clear the bundler cache and reinstall:

```bash
npm run start:clear
```

If that does not help:

```bash
rm -rf node_modules
npm ci
npm run start:clear
```

**`npm ci` fails.**
Usually means `package-lock.json` and `package.json` have drifted apart. Use `npm install` once,
then commit the updated lockfile.

**Expo Go says the project needs a different SDK version.**
Update Expo Go from the App Store or Play Store. Expo Go only supports the current SDK (57).

**"Bluetooth needs a development build".**
Expected in Expo Go. See [Running on real FES hardware](#running-on-real-fes-hardware).

**Port 8081 is already in use.**
Another dev server is running. Either stop it, or pick a different port:

```bash
npm start -- --port 8082
```

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
