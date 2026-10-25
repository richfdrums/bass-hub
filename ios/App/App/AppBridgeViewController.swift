import Capacitor

/// Bridge view controller that registers the app-local plugins. Capacitor only
/// auto-registers plugins that arrive from npm, so these have to be registered
/// by hand here.
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SqlitePlugin())
        bridge?.registerPluginInstance(SnapshotPlugin())
    }
}
