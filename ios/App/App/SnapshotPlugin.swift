import Capacitor
import Foundation
import SQLite3
import UniformTypeIdentifiers

/// Whole-file snapshot exchange: export the database through the share sheet,
/// or import one through the document picker.
///
/// Import is two steps on purpose — `pick` copies and validates the chosen
/// file without touching anything, so the web side can show the user exactly
/// what would be overwritten; `replace` then does the swap. Nothing is ever
/// opened in place: SQLite needs real file locks, which file providers do not
/// give us.
@objc(SnapshotPlugin)
public class SnapshotPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SnapshotPlugin"
    public let jsName = "Snapshot"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "exportSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "replace", returnType: CAPPluginReturnPromise)
    ]

    /// Must match `PRAGMA user_version` in src/core/db.ts.
    private let supportedUserVersion: Int32 = 1

    private enum InspectResult {
        case success(JSObject)
        case failure(String)
    }

    private var pendingPick: CAPPluginCall?
    private var pickedPath: String?

    // MARK: - Export

    @objc func exportSnapshot(_ call: CAPPluginCall) {
        do {
            // Close first so the copy cannot catch a half-written page; the
            // JS side keeps working because reopen happens synchronously here.
            SqlitePlugin.shared?.closeDatabase()
            defer { SqlitePlugin.shared?.reopenDatabase() }

            guard FileManager.default.fileExists(atPath: DbPaths.database.path) else {
                call.reject("No database to export yet")
                return
            }

            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent("Bass Hub \(DbPaths.timestamp()).db")
            try? FileManager.default.removeItem(at: dest)
            try FileManager.default.copyItem(at: DbPaths.database, to: dest)
            call.resolve(["path": dest.path])
        } catch {
            call.reject("Export failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Import, step 1: pick and validate

    @objc func pick(_ call: CAPPluginCall) {
        guard pendingPick == nil else {
            call.reject("A snapshot picker is already open")
            return
        }

        DispatchQueue.main.async {
            guard let bridge = self.bridge,
                  let presenter = bridge.viewController else {
                call.reject("No view controller to present from")
                return
            }
            self.pendingPick = call

            // `.data` keeps the picker from greying out files whose extension
            // iOS does not recognise; validation is what actually guards this.
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.data], asCopy: true)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            if let popover = picker.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }
            presenter.present(picker, animated: true)
        }
    }

    private func finishPick(_ result: JSObject) {
        pendingPick?.resolve(result)
        pendingPick = nil
    }

    private func handlePicked(_ source: URL) {
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent("snapshot-incoming.db")

        do {
            try? FileManager.default.removeItem(at: temp)
            try FileManager.default.copyItem(at: source, to: temp)
        } catch {
            finishPick(["status": "error", "error": "Could not read that file."])
            return
        }

        switch inspect(temp) {
        case .failure(let message):
            try? FileManager.default.removeItem(at: temp)
            finishPick(["status": "error", "error": message])
        case .success(let summary):
            pickedPath = temp.path
            finishPick([
                "status": "ready",
                "path": temp.path,
                "summary": summary
            ])
        }
    }

    /// Opens the candidate read-only and checks it is a Bass Hub database this
    /// build understands. Returns the row counts the confirm dialog shows.
    private func inspect(_ url: URL) -> InspectResult {
        var handle: OpaquePointer?
        defer { if handle != nil { sqlite3_close(handle) } }

        guard sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            return .failure("That file is not a readable database.")
        }

        var integrity: OpaquePointer?
        defer { if integrity != nil { sqlite3_finalize(integrity) } }
        guard sqlite3_prepare_v2(handle, "PRAGMA integrity_check", -1, &integrity, nil) == SQLITE_OK,
              sqlite3_step(integrity) == SQLITE_ROW,
              let ok = sqlite3_column_text(integrity, 0),
              String(cString: ok) == "ok" else {
            return .failure("That file is not a valid SQLite database.")
        }

        var versionStmt: OpaquePointer?
        defer { if versionStmt != nil { sqlite3_finalize(versionStmt) } }
        guard sqlite3_prepare_v2(handle, "PRAGMA user_version", -1, &versionStmt, nil) == SQLITE_OK,
              sqlite3_step(versionStmt) == SQLITE_ROW else {
            return .failure("That file is not a Bass Hub database.")
        }
        let version = sqlite3_column_int(versionStmt, 0)
        guard version == supportedUserVersion else {
            return .failure("That snapshot was made by an incompatible version of Bass Hub (schema v\(version), this build expects v\(supportedUserVersion)).")
        }

        var counts: JSObject = [:]
        for (table, key) in [("gear", "gear"), ("trips", "trips"), ("quick_links", "links")] {
            var stmt: OpaquePointer?
            defer { if stmt != nil { sqlite3_finalize(stmt) } }
            guard sqlite3_prepare_v2(handle, "SELECT COUNT(*) FROM \(table)", -1, &stmt, nil) == SQLITE_OK,
                  sqlite3_step(stmt) == SQLITE_ROW else {
                return .failure("That file is not a Bass Hub database.")
            }
            counts[key] = Int(sqlite3_column_int64(stmt, 0))
        }

        return .success(counts)
    }

    // MARK: - Import, step 2: replace

    @objc func replace(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), path == pickedPath else {
            call.reject("Pick a snapshot first")
            return
        }
        let incoming = URL(fileURLWithPath: path)
        guard FileManager.default.fileExists(atPath: incoming.path) else {
            call.reject("The picked file is gone — try importing again.")
            return
        }

        do {
            // Keep the current state recoverable, then swap the file with a
            // single replace so a failure cannot leave a half-copied DB.
            DbPaths.backupCurrent()
            SqlitePlugin.shared?.closeDatabase()
            _ = try FileManager.default.replaceItemAt(DbPaths.database, withItemAt: incoming)
            SqlitePlugin.shared?.reopenDatabase()
            pickedPath = nil
            call.resolve()
        } catch {
            SqlitePlugin.shared?.reopenDatabase()
            call.reject("Import failed: \(error.localizedDescription)")
        }
    }
}

extension SnapshotPlugin: UIDocumentPickerDelegate {
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else {
            finishPick(["status": "cancelled"])
            return
        }
        // asCopy: true hands us a file we already own, but the URL is still
        // security-scoped on some providers.
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        handlePicked(url)
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        finishPick(["status": "cancelled"])
    }
}
