package com.koshuna.app;

import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.crashlytics.FirebaseCrashlytics;

/**
 * Starts Firebase only when android/app/google-services.json was present at build time.
 * Without that file the app still opens: Crashlytics collection stays off and FCM has
 * no real project. See android/OWNER-SETUP.md.
 */
public class KoshunaApp extends Application {
    private static final String TAG = "Koshuna";

    @Override
    public void onCreate() {
        super.onCreate();
        createDefaultNotificationChannel();
        ensureFirebase();
    }

    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
            getString(R.string.default_notification_channel_id),
            getString(R.string.default_notification_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.default_notification_channel_description));
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    private void ensureFirebase() {
        try {
            if (!FirebaseApp.getApps(this).isEmpty()) {
                return;
            }
            int appId = getResources().getIdentifier("google_app_id", "string", getPackageName());
            if (appId != 0) {
                FirebaseApp.initializeApp(this);
                FirebaseCrashlytics.getInstance();
                Log.i(TAG, "Firebase config found. Crashlytics and FCM are on.");
                return;
            }
            FirebaseOptions placeholder = new FirebaseOptions.Builder()
                .setApplicationId("1:000000000000:android:0000000000000000")
                .setApiKey("AIzaSyPlaceholderNotARealKey0000000")
                .setProjectId("koshuna-placeholder")
                .setGcmSenderId("000000000000")
                .build();
            FirebaseApp.initializeApp(this, placeholder);
            FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(false);
            Log.i(TAG, "google-services.json missing. Crashlytics and FCM stay off until the APK is rebuilt with it.");
        } catch (Throwable error) {
            Log.w(TAG, "Firebase did not start. The site still loads.", error);
        }
    }
}
