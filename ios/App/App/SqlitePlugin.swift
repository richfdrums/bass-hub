import Capacitor
import Foundation
import SQLite3

/// Minimal SQLite binding behind core's SqlDatabase interface
/// (src/ios/platform/iosDb.ts): one connection, positional params, rows as
/// plain objects. Every call runs on one serial queue, so statements never
/// interleave and BEGIN/COMMIT issued from JS bracket exactly what's sent in
/// between.
///
/// `get` and `transaction` are not exposed here — they are derived from
/// `all`/`exec` on the JS side, which keeps this plugin small.
@objc(SqlitePlugin)
public class SqlitePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SqlitePlugin"
    public let jsName = "Sqlite"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exec", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "run", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "all", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "basshub.sqlite")
    private var db: OpaquePointer?

    // SQLITE_TRANSIENT: tells SQLite to copy bound text before we free it.
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    private struct SqliteError: Error {
        let message: String
    }

    private func lastError() -> SqliteError {
        SqliteError(message: db.map { String(cString: sqlite3_errmsg($0)) } ?? "database not open")
    }

    @objc func open(_ call: CAPPluginCall) {
        guard let name = call.getString("name") else {
            call.reject("name is required")
            return
        }
        queue.async {
            do {
                let dir = try FileManager.default.url(
                    for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                let path = dir.appendingPathComponent(name).path
                if self.db == nil {
                    guard sqlite3_open(path, &self.db) == SQLITE_OK else { throw self.lastError() }
                }
                call.resolve(["path": path])
            } catch {
                call.reject("open failed: \(error)")
            }
        }
    }

    @objc func exec(_ call: CAPPluginCall) {
        guard let sql = call.getString("sql") else {
            call.reject("sql is required")
            return
        }
        queue.async {
            guard sqlite3_exec(self.db, sql, nil, nil, nil) == SQLITE_OK else {
                call.reject(self.lastError().message)
                return
            }
            call.resolve()
        }
    }

    @objc func run(_ call: CAPPluginCall) {
        guard let sql = call.getString("sql") else {
            call.reject("sql is required")
            return
        }
        let params = call.getArray("params") ?? []
        queue.async {
            do {
                let stmt = try self.prepare(sql, params)
                defer { sqlite3_finalize(stmt) }
                var rc = sqlite3_step(stmt)
                while rc == SQLITE_ROW { rc = sqlite3_step(stmt) }
                guard rc == SQLITE_DONE else { throw self.lastError() }
                call.resolve([
                    "changes": Int(sqlite3_changes(self.db)),
                    "lastInsertRowid": Int(sqlite3_last_insert_rowid(self.db))
                ])
            } catch {
                call.reject((error as? SqliteError)?.message ?? "\(error)")
            }
        }
    }

    @objc func all(_ call: CAPPluginCall) {
        guard let sql = call.getString("sql") else {
            call.reject("sql is required")
            return
        }
        let params = call.getArray("params") ?? []
        queue.async {
            do {
                let stmt = try self.prepare(sql, params)
                defer { sqlite3_finalize(stmt) }
                var rows: [JSObject] = []
                var rc = sqlite3_step(stmt)
                while rc == SQLITE_ROW {
                    rows.append(self.readRow(stmt))
                    rc = sqlite3_step(stmt)
                }
                guard rc == SQLITE_DONE else { throw self.lastError() }
                call.resolve(["rows": rows])
            } catch {
                call.reject((error as? SqliteError)?.message ?? "\(error)")
            }
        }
    }

    private func prepare(_ sql: String, _ params: JSArray) throws -> OpaquePointer? {
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { throw lastError() }
        for (i, value) in params.enumerated() {
            let idx = Int32(i + 1)
            let rc: Int32
            switch value {
            case let s as String:
                rc = sqlite3_bind_text(stmt, idx, s, -1, transient)
            case let n as NSNumber:
                let d = n.doubleValue
                if d.rounded() == d, abs(d) < 9.0e15 {
                    rc = sqlite3_bind_int64(stmt, idx, n.int64Value)
                } else {
                    rc = sqlite3_bind_double(stmt, idx, d)
                }
            default:
                rc = sqlite3_bind_null(stmt, idx)
            }
            guard rc == SQLITE_OK else {
                sqlite3_finalize(stmt)
                throw lastError()
            }
        }
        return stmt
    }

    private func readRow(_ stmt: OpaquePointer?) -> JSObject {
        var row: JSObject = [:]
        for col in 0..<sqlite3_column_count(stmt) {
            let name = String(cString: sqlite3_column_name(stmt, col))
            switch sqlite3_column_type(stmt, col) {
            case SQLITE_INTEGER:
                row[name] = Int(sqlite3_column_int64(stmt, col))
            case SQLITE_FLOAT:
                row[name] = sqlite3_column_double(stmt, col)
            case SQLITE_TEXT:
                row[name] = String(cString: sqlite3_column_text(stmt, col))
            default:
                // NULL (and BLOB, which this schema never stores).
                row[name] = NSNull()
            }
        }
        return row
    }
}
