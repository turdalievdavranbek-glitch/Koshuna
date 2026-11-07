/**
 * Native Google sign-in. The Web client id and nonce come from the server
 * at click time (`/api/auth/config` and `/api/auth/google/nonce`), not from
 * a build-time NEXT_PUBLIC value.
 *
 * Apple stays a stub until iOS (after Android). The login screen does not call it.
 */

export const nativeAuthConfig = {
  appleServiceId: process.env.NEXT_PUBLIC_APPLE_SERVICE_ID ?? "",
  appleRedirectUrl:
    process.env.NEXT_PUBLIC_APPLE_REDIRECT_URL ?? "https://koshuna.ru/auth/apple/callback",
};

export async function nativeGoogleSignIn(input: { clientId: string; nonce: string }) {
  if (!input.clientId) {
    throw new Error("Google client id is empty.");
  }
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native Google sign-in runs inside the Android app.");
  }
  const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
  await GoogleSignIn.initialize({
    clientId: input.clientId,
  });
  return GoogleSignIn.signIn({ nonce: input.nonce });
}

export async function nativeGoogleSignOut(): Promise<void> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;
  const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
  await GoogleSignIn.signOut();
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
