import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        connectionOptions.urlContexts.forEach { forwardGoogleSignIn($0.url) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
        URLContexts.forEach { forwardGoogleSignIn($0.url) }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// Google Sign-In returns through the reversed client id. The plugin does not
/// implement the URL callback, so forward only that scheme to GIDSignIn.
private func forwardGoogleSignIn(_ url: URL) {
    guard url.scheme?.hasPrefix("com.googleusercontent.apps.") == true else { return }
    guard let cls = NSClassFromString("GIDSignIn") as? NSObject.Type else { return }
    let selector = NSSelectorFromString("handleURL:")
    guard let shared = cls.value(forKey: "sharedInstance") as? NSObject, shared.responds(to: selector) else { return }
    _ = shared.perform(selector, with: url)
}
