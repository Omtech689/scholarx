# ScholarX Android App Build & Google Play Store Guide

## Prerequisites

Before building the Android app, you need to install:

### 1. **Java Development Kit (JDK)**
   - Download JDK 17 or higher from [Oracle](https://www.oracle.com/java/technologies/downloads/) or use OpenJDK
   - Set `JAVA_HOME` environment variable to your JDK installation path
   - Verify: `java -version`

### 2. **Android Studio**
   - Download from [Android Studio](https://developer.android.com/studio)
   - During installation, Android Studio will install Android SDK, Build Tools, and Emulator

### 3. **Android SDK**
   - Open Android Studio → SDK Manager
   - Install:
     - Android SDK Platform 34 (or latest)
     - Android SDK Build-Tools 34.0.0 (or latest)
     - Android Emulator (optional, for testing)
   - Set `ANDROID_HOME` environment variable to SDK location (typically `C:\Users\{username}\AppData\Local\Android\Sdk`)

## Building the Android App

### Step 1: Build for Release

Navigate to your project directory and build the release APK:

```bash
cd android
./gradlew assembleRelease
```

Or on Windows (cmd):
```cmd
cd android
gradlew.bat assembleRelease
```

The APK will be created at:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 2: Create Signing Key (One-time)

Generate a signing key to sign your APK:

```bash
keytool -genkey -v -keystore scholarx-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias scholarx
```

**Important:** Save this key file and password securely. You'll need it for all future updates.

### Step 3: Sign Your APK

Create a `gradle.properties` file in the `android` directory:

```properties
SCHOLARX_RELEASE_STORE_FILE=../scholarx-key.jks
SCHOLARX_RELEASE_STORE_PASSWORD=your_keystore_password
SCHOLARX_RELEASE_KEY_ALIAS=scholarx
SCHOLARX_RELEASE_KEY_PASSWORD=your_key_password
```

Then build the signed release APK:

```bash
cd android
./gradlew assembleRelease
```

The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Create App Bundle (Recommended for Play Store)

App Bundles are smaller and recommended by Google:

```bash
cd android
./gradlew bundleRelease
```

The App Bundle will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Uploading to Google Play Store

### Step 1: Create Google Play Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your Google account
3. Accept the Google Play Developer agreement
4. Pay the $25 one-time registration fee
5. Fill in your developer profile information

### Step 2: Create a New App

1. Click "Create app"
2. Enter app name: "ScholarX"
3. Select "Apps" as the app type
4. Select default language and category
5. Accept declarations

### Step 3: Set Up App Details

In Google Play Console:

1. **App information**: Add description, screenshots, privacy policy URL
2. **Graphics**: Add app icon (512x512), feature graphics, screenshots
3. **Content rating**: Complete the content rating questionnaire
4. **Target audience**: Select age groups
5. **Target devices**: Select minimum API level (API 21 or higher recommended)

### Step 4: Configure Release Settings

1. Go to **Release** → **Create release**
2. Select **Production** track
3. Click **Browse files** → Upload your `.aab` (App Bundle) file
4. Review the app details
5. Click **Review release**
6. Click **Start rollout to Production**

### Step 5: Monitor First Release

After uploading:
- The review process typically takes 2-4 hours
- You'll receive an email when the app is approved
- The app will be available on Google Play Store
- Monitor user reviews and ratings in the Console

## Updating the App

For future updates:

1. Update version code and version name in `android/app/build.gradle`:
   ```gradle
   versionCode = 2  // Increment for each release
   versionName = "1.1.0"
   ```

2. Rebuild the app bundle:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

3. Upload the new bundle to a **new release** in Google Play Console

## Offline Feature

Your app now includes an offline indicator banner that appears when the device loses network connectivity. The banner is red and shows: "You're offline. Some features may be unavailable."

## Testing

### Test Locally
1. Connect an Android device via USB or use Android Emulator
2. Enable Developer Mode (tap Build Number 7 times in Settings)
3. Enable USB Debugging
4. Run:
   ```bash
   cd android
   ./gradlew assembleDebug
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

### Test on Device
- Install the debug APK and test all features
- Check offline indicator works
- Test navigation and API calls

## Troubleshooting

**Build fails with "JAVA_HOME not set"**
- Set `JAVA_HOME` environment variable to your JDK installation

**Gradle build cache issues**
- Delete `android/.gradle` folder and rebuild

**APK signature issues**
- Ensure `gradle.properties` has correct passwords
- Double-check keystore file path and password

**App not appearing on Play Store**
- Check content rating is complete
- Verify app pricing and distribution settings
- Check for any policy violations in review notes

## Important Notes

- Always test the app thoroughly before releasing
- Keep your signing key secure - losing it means you can't update the app
- Monitor user reviews for feedback and issues
- Test on various Android devices (API 21+)
- Check battery usage and performance
- Ensure all features work in offline mode where applicable
