# Gemstone ROI Mobile App

This is a standalone React Native app for Android (and iOS).

## Quick Start (No Android Studio required)

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the app**:
    ```bash
    npx expo start
    ```

3.  **Run on your Phone**:
    -   Download the **Expo Go** app from the Google Play Store or Apple App Store.
    -   Scan the QR code shown in the terminal.

## Structure
-   `App.js`: Contains all the calculator logic and UI.
-   `app.json`: Configuration (Name, Icon, Colors).

## 🚀 How to make it a PERMANENT App (APK)

**Expo Go** is great for testing, but it requires your computer to be running.
To install this app on your phone permanently (so you can use it at the market without your laptop):

1.  **Install EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```

2.  **Login to Expo** (Free account required):
    ```bash
    npx eas login
    ```

3.  **Build the APK**:
    ```bash
    npx eas build -p android --profile preview
    ```

4.  **Wait & Download**:
    -   It will take ~10-15 minutes to build in the cloud.
    -   It will verify your account and provide a download link for an `.apk` file.
    -   Download that file to your phone and install it!

## 🍎 iOS (iPhone) Notes

**Option 1: Expo Go (Free)**
-   Just scan the QR code with your iPhone camera (using the Expo Go app).
-   Requires laptop to be running.

**Option 2: Standalone App (Paid)**
-   To put a permanent app icon on your iPhone, **Apple requires a paid Developer Account ($99/year)**.
-   If you have that account, run:
    ```bash
    npx eas build -p ios --profile production
    ```
-   Without the paid account, you can only build for the **iOS Simulator** (Mac only):
    ```bash
    npx eas build -p ios --profile preview
    ```

