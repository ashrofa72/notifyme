# Alzahraa Parent App (Flutter)

This is the mobile application for parents to receive attendance notifications.

## Setup Instructions

1. **Install Flutter:**
   Download and install Flutter from [flutter.dev](https://flutter.dev).

2. **Create Project:**
   Create a new flutter project in a separate folder on your computer:
   ```bash
   flutter create alzahraa_parent
   ```

3. **Copy Files:**
   Replace the `lib/main.dart` and `pubspec.yaml` in your new project with the files provided in this directory.

4. **Firebase Setup:**
   - Go to your Firebase Console.
   - Click "Add App" -> **Android**.
   - Package name: `com.alzahraa.parent` (or whatever is in your build.gradle).
   - Download `google-services.json` and put it in `android/app/`.
   - **Crucial:** You must enable "Cloud Messaging" and "Firestore" in the console.

5. **Run:**
   ```bash
   flutter pub get
   flutter run
   ```

## How it works
1. Parent opens app.
2. Enters Child's Student Code (e.g., `S1001`).
3. App updates the Firestore document `students/S1001` with the phone's `fcmToken`.
4. Dashboard can now send notifications.
