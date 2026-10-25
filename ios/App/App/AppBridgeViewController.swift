import Capacitor

/// Bridge view controller that registers the app-local plugins. Capacitor only
/// auto-registers plugins that arrive from npm, so these have to be registered
/// by hand here.
class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SqlitePlugin())
        bridge?.registerPluginInstance(SnapshotPlugin())

        // iOS 26 dims the top of a scroll view under the status bar. The page
        // scrolls inside the web content, not this scroll view, so the effect
        // only shows as a grey band over the light theme.
        if #available(iOS 26.0, *) {
            webView?.scrollView.topEdgeEffect.isHidden = true
        }
    }
}
