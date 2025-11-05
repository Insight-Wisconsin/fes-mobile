# FESMobile

FESMobile is a mobile application designed to assist individuals with foot drop using a Functional Electrical Stimulation (FES) device. The app uses real-time gyroscope data from the user's phone (worn on the leg) to detect critical gait events and trigger timed electrical impulses, enabling smoother walking patterns.

Developed by Insight Wisconsin – UW–Madison.

---

## Features

- Cross-platform mobile app (React Native: iOS and Android)
- Firebase authentication (email/password based)
- Gyroscope-based foot angle detection
- Bluetooth-triggered stimulation logic
- Custom per-user calibration flow
- Clean Git workflow using pull requests and feature branches

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-org-name/fesmobile.git
cd fesmobile
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app

Firebase config files (`google-services.json`, `GoogleService-Info.plist`) are already included in the project (handled by the project lead). You **do not** need to set up Firebase yourself.

#### Android

```bash
npx react-native run-android
```

#### iOS

```bash
npx pod-install
npx react-native run-ios
```

---

## Project Structure

```
.
├── android/              # Native Android project files
├── ios/                  # Native iOS project files
├── src/
│   ├── auth/             # Login and signup screens
│   ├── calibration/      # Calibration flow
│   ├── sensors/          # Gyroscope + angle detection logic
│   ├── bluetooth/        # Impulse control and communication
│   └── utils/            # Helpers and config
├── App.tsx               # App entry point
├── firebase.ts           # Firebase init (do not modify)
├── README.md             # This file
└── ...
```

---

## Contributing

We use feature branches and pull requests against the `dev` branch.

```bash
# Example contribution workflow
git checkout -b feature/your-feature-name
# Make your changes
git commit -m "Add your feature"
git push origin feature/your-feature-name
# Open a pull request targeting `dev`
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for code standards and PR guidelines.

---

## Maintainers

Firebase setup and deployment are managed by software leads (Divij Kohli, Mayank Jain). Contributors do **not** need to set up Firebase or authentication logic.

---

## License

This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.
