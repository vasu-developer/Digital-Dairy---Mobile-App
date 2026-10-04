# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Optional cloud sync

Set `EXPO_PUBLIC_API_URL` using `.env.example`, then restart Expo/rebuild the app. Open **More & Settings → Sync to DB** to create a dairy account or log in with the same mobile number (including country code) and password on another device. Login also syncs and restores available server records. Tap Sync to DB on each device to send and receive subsequent changes. Offline features and file backups remain available.

Credentials are held only for the current app session; logging out keeps local records. The first account is bound to the device's records to prevent mixing dairies. Conflicting edits require choosing the device or server version. See `../digital-dairy-backend/README.md` for server setup, limits and tests.

## Local Android APK with Gradle

With Java 17, Android SDK 36 and the project's required NDK installed:

```sh
npm install
npx expo prebuild --platform android --no-install
cd android
NODE_ENV=production ./gradlew clean :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`. This ARM64 build targets modern physical Android phones. Omit `-PreactNativeArchitectures=arm64-v8a` to build all configured architectures.

The generated Gradle project signs release APKs with its development key by default. For an update to an existing distributed app, configure its original release signing key and increment `android.versionCode` in `app.json` before prebuilding. A fresh APK does not clear an existing installation's SQLite or AsyncStorage data. Clear storage only on a test device when a completely empty local installation is intended.
