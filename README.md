# FESMobile

FESMobile is a mobile app that assists people with **foot drop** using a Functional Electrical
Stimulation (FES) device. The phone is worn on the leg; the app reads the gyroscope in real time,
detects gait events, and triggers timed electrical impulses over Bluetooth to smooth out the
walking pattern.

Built with React Native and Expo. Developed by **Insight Wisconsin – UW–Madison**.

---

## Contents

- [How this works (read this first)](#how-this-works-read-this-first)
- [Before you start: what to install](#before-you-start-what-to-install)
- [Setup](#setup)
- [Get the FES app on your iPhone](#get-the-fes-app-on-your-iphone)
- [Daily development](#daily-development)
- [Connecting to the ESP32](#connecting-to-the-esp32)
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
git clone https://github.com/Insight-Wisconsin/fes-mobile.git
cd fes-mobile
```

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

1. **Xcode → Settings → Accounts → `+`** → sign in with your Apple ID (a free one works).
2. **Plug the iPhone in with a cable**, unlock it, and tap **Trust This Computer**.
3. Build and install:

   ```bash
   npm run ios:device
   ```

   Pick your iPhone from the list. The first build takes about 5–15 minutes; later ones are much
   faster.
4. **On the iPhone**, if iOS won't open FES:
   - **Settings → Privacy & Security → Developer Mode → On**, then restart the phone.
   - With a **free Apple ID**, also go to **Settings → General → VPN & Device Management**, tap
     your Apple ID, and tap **Trust**.
5. When FES asks to find devices on your **Local Network**, tap **Allow**. That's how it reaches
   your computer.

### Windows: now (via a teammate's Mac)

Plug your iPhone into a Mac teammate's Mac and have them run `npm run ios:device`, picking
**your** iPhone. If that Mac has already built FES, run `rm -rf ios` first so Xcode can register
yours. That's it. From then on you develop from your PC (see
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
signal strength. The telemetry UUID is `87654321-4321-4321-4321-cba987654321`.

The device name, service/characteristic UUIDs and command bytes live in
[`services/ble/bleService.ts`](services/ble/bleService.ts).

---

## Available commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `npm start` | Dev server for the **FES app** (the everyday command) |
| `npm run start:clear` | Same, clearing the bundler cache (fixes most stale-cache bugs) |
| `npm run start:tunnel` | Same, through a tunnel, for when campus Wi-Fi blocks phone ↔ computer traffic |
| `npm run start:go` | Dev server for **Expo Go** (UI preview, no Bluetooth) |
| `npm run ios:device` | **Mac:** build and install the FES app on a USB-connected iPhone |
| `npm run ios` | **Mac:** run in the iOS Simulator (UI only; the Simulator has no Bluetooth) |
| `npm run ios:register` | Cloud builds: register an iPhone (needs the team's paid Apple account) |
| `npm run ios:build` | Cloud builds: build the FES app on Expo's servers (needs the team's paid Apple account) |
| `npm run web` | Open the app in a browser (no Bluetooth) |
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
| `/functional/real-time-data` | Raw gyroscope / accelerometer readouts and ESP32 BLE telemetry |
| `/functional/settings` | Settings |

The iOS folder is **generated**, not committed: `npm run ios:device` creates `ios/` from
`app.json` each time it's needed, so there are no native-project merge conflicts.

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
Quit Xcode, then run `rm -rf ios` and `npm run ios:device` so Expo sets up signing again with it.

**`npm run ios:device` says "No profiles for … were found", or that the profile "doesn't include the
currently selected device".**
Expo only lets Xcode create profiles and register new iPhones the first time it sets up signing in
`ios/`. Run `rm -rf ios`, then `npm run ios:device`. The folder is regenerated, so nothing is lost.

If it still fails, build from Xcode: run `open ios/*.xcworkspace`, select **FES** → **Signing &
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
Free Apple ID installs expire after 7 days. Plug the phone in, then run `rm -rf ios` and
`npm run ios:device` again.

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
