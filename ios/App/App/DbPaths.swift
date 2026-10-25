import Foundation

/// Where the database and its invisible local backups live. Shared by
/// SqlitePlugin and SnapshotPlugin so the two cannot drift apart.
///
/// Note: the JS side opens the DB by name (`fishing_hub_v6.db`, see DB_NAME in
/// src/ios/main.tsx). If that name ever changes, change it here too.
enum DbPaths {
    static let fileName = "fishing_hub_v6.db"

    static var appSupport: URL {
        // Application Support is created on demand; it may not exist on a
        // fresh install.
        (try? FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )) ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
    }

    static var database: URL {
        appSupport.appendingPathComponent(fileName)
    }

    static var backups: URL {
        appSupport.appendingPathComponent("backups", isDirectory: true)
    }

    /// Filename-safe timestamp. Includes fractional seconds: backups are taken
    /// at launch *and* before an import, which can land in the same second.
    static func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
            .replacingOccurrences(of: ":", with: "-")
            .replacingOccurrences(of: ".", with: "-")
    }

    /// Copies the live database next to it and keeps the newest `keep` copies.
    /// Called on every launch and before a snapshot replaces the file, so a bad
    /// import is always recoverable by hand (there is no UI for this).
    static func backupCurrent(keep: Int = 5) {
        let fm = FileManager.default
        guard fm.fileExists(atPath: database.path) else { return }
        try? fm.createDirectory(at: backups, withIntermediateDirectories: true)

        let dest = backups.appendingPathComponent("basshub-\(timestamp()).db")
        try? fm.copyItem(at: database, to: dest)

        let existing = (try? fm.contentsOfDirectory(
            at: backups,
            includingPropertiesForKeys: [.contentModificationDateKey]
        )) ?? []
        let snapshots = existing
            .filter { $0.pathExtension == "db" }
            .sorted { a, b in
                let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
                let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate ?? .distantPast
                return da > db
            }
        for old in snapshots.dropFirst(keep) {
            try? fm.removeItem(at: old)
        }
    }
}
