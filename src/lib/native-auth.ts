/**
 * Native Google sign-in. The web client id and nonce come from the server
 * at click time (`/api/auth/config` and `/api/auth/google/nonce`).
 *
 * On iOS the same web client id is the Google SDK server client id.
 * The iOS client id itself is `GIDClientID` in Info.plist, written by CI
 * from GoogleService-Info.plist. See docs/ios.md.
 *
 * Sign in with Apple is native on iOS only (AuthenticationServices, bundle id
 * com.koshuna.app). Android does not call it.
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
    throw new Error("Native Google sign-in runs inside the app.");
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
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("Sign in with Apple runs inside the iOS app.");
  }
  const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");
  return AppleSignIn.signIn({
    scopes: [SignInScope.Email, SignInScope.FullName],
  });
}
