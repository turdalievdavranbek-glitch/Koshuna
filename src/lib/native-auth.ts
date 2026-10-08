/**
 * Native Google and Apple sign-in hooks.
 * Шаг 8 draws the buttons and calls these. Do not import this from the login screen yet.
 *
 * Google: NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is the Web OAuth client id
 * (the Android client is package com.koshuna.app + SHA-1, created in Google Cloud).
 * Apple: NEXT_PUBLIC_APPLE_SERVICE_ID is the Services ID. Redirect URL must be
 * registered for that Services ID.
 */

export const nativeAuthConfig = {
  googleWebClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  appleServiceId: process.env.NEXT_PUBLIC_APPLE_SERVICE_ID ?? "",
  appleRedirectUrl:
    process.env.NEXT_PUBLIC_APPLE_REDIRECT_URL ?? "https://koshuna.ru/auth/apple/callback",
};

export function nativeAuthConfigured(): { google: boolean; apple: boolean } {
  return {
    google: nativeAuthConfig.googleWebClientId.length > 0,
    apple: nativeAuthConfig.appleServiceId.length > 0,
  };
}

export async function nativeGoogleSignIn() {
  if (!nativeAuthConfig.googleWebClientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID is empty. See android/OWNER-SETUP.md.");
  }
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native Google sign-in runs inside the Android app.");
  }
  const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
  await GoogleSignIn.initialize({
    clientId: nativeAuthConfig.googleWebClientId,
  });
  return GoogleSignIn.signIn();
}

export async function nativeAppleSignIn() {
  if (!nativeAuthConfig.appleServiceId) {
    throw new Error("NEXT_PUBLIC_APPLE_SERVICE_ID is empty. See android/OWNER-SETUP.md.");
  }
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native Apple sign-in runs inside the Android app.");
  }
  const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");
  await AppleSignIn.initialize({ clientId: nativeAuthConfig.appleServiceId });
  return AppleSignIn.signIn({
    redirectUrl: nativeAuthConfig.appleRedirectUrl,
    scopes: [SignInScope.Email, SignInScope.FullName],
  });
}
