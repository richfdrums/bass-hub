import Capacitor

/// Bridge view controller that registers the app-local plugins. Capacitor only
/// auto-registers plugins that arrive from npm, so SqlitePlugin has to be
/// registered by hand here.
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SqlitePlugin())
    }
}
