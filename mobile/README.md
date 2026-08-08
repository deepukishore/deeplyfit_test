# Deeply Fit mobile

The mobile app uses Expo SDK 56 and React Native 0.85. It shares the production backend with the web app while keeping a native React Native interface.

## Run locally

```powershell
npm install
npm start
```

Expo Go can be used for most UI development, but Razorpay checkout is a native module and is unavailable in Expo Go. Use a native development build when testing subscriptions:

```powershell
npm run android
```

For a distributable Android APK:

```powershell
npm run build:apk
```

The Razorpay flow creates subscriptions through the backend, opens the native checkout, and sends the returned payment details back to the backend for signature verification. Keep Razorpay secret keys on the backend only.

`expo-doctor` excludes `react-native-razorpay` from the React Native Directory metadata check because version 3.0.0 contains New Architecture codegen support, while the directory entry still marks the package as unsupported.
