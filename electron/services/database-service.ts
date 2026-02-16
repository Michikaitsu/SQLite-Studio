import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type {
    DatabaseInfo,
    TableInfo,
    ColumnInfo,
    IndexInfo,
    ForeignKeyInfo,
    ViewInfo,
    QueryResult,
    CreateTablePayload,
    AddColumnPayload,
    CreateIndexPayload,
} from '../../shared/types';

interface OpenDatabase {
    db: SqlJsDatabase;
    filePath: string;
}

export class DatabaseService {
    private databases: Map<string, OpenDatabase> = new Map();
    private SQL: SqlJsStatic | null = null;

    private async ensureInitialized(): Promise<SqlJsStatic> {
        if (this.SQL) return this.SQL;

        // Locate the WASM file - check multiple possible locations
        const possiblePaths = [
            path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
            path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
            path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
        ];

        let wasmPath = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                wasmPath = p;
                break;
            }
        }

        if (wasmPath) {
            const wasmBinary = fs.readFileSync(wasmPath);
            this.SQL = await initSqlJs({ wasmBinary } as any);
        } else {
            // Fallback: let sql.js load its own WASM
            this.SQL = await initSqlJs();
        }

        return this.SQL;
    }

    async open(filePath: string): Promise<DatabaseInfo> {
        if (this.databases.has(filePath)) {
            return this.getInfo(filePath);
        }

        const SQL = await this.ensureInitialized();

        let db: SqlJsDatabase;
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            db = new SQL.Database(buffer);
        } else {
            throw new Error(`File not found: ${filePath}`);
        }

        db.run('PRAGMA foreign_keys = ON');

        this.databases.set(filePath, { db, filePath });
        return this.getInfo(filePath);
    }

    async create(filePath: string): Promise<DatabaseInfo> {
        const SQL = await this.ensureInitialized();

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const db = new SQL.Database();
        db.run('PRAGMA foreign_keys = ON');

        // Save empty database to disk
        const data = db.export();
        fs.writeFileSync(filePath, Buffer.from(data));

        this.databases.set(filePath, { db, filePath });
        return this.getInfo(filePath);
    }

    close(filePath: string): void {
        const entry = this.databases.get(filePath);
        if (entry) {
            this.saveToFile(entry);
            entry.db.close();
            this.databases.delete(filePath);
        }
    }

    closeAll(): void {
        for (const [, entry] of this.databases) {
            try {
                this.saveToFile(entry);
                entry.db.close();
            } catch {
                // Ignore errors during cleanup
            }
        }
        this.databases.clear();
    }

    private saveToFile(entry: OpenDatabase): void {
        try {
            const data = entry.db.export();
            fs.writeFileSync(entry.filePath, Buffer.from(data));
        } catch {
            // Silent fail during save - data might already be closed
        }
    }

    listOpen(): string[] {
        return Array.from(this.databases.keys());
    }

    getInfo(filePath: string): DatabaseInfo {
        const entry = this.getDatabase(filePath);
        let size = 0;
        try {
            const stats = fs.statSync(filePath);
            size = stats.size;
        } catch { /* file might not exist yet on disk */ }

        const tables = this.getTables(entry.db);
        const views = this.getViews(entry.db);

        return {
            path: filePath,
            name: path.basename(filePath),
            size,
            tables,
            views,
        };
    }

    executeQuery(filePath: string, sql: string): QueryResult {
        const entry = this.getDatabase(filePath);
        const startTime = performance.now();

        try {
            const trimmed = sql.trim();

            if (this.isSelectQuery(trimmed)) {
                const results = entry.db.exec(trimmed);
                const executionTime = performance.now() - startTime;

                if (results.length === 0) {
                    return {
                        type: 'select',
                        columns: [],
                        rows: [],
                        executionTime,
                    };
                }

                const result = results[0];
                const columns: string[] = result.columns;
                const rows = result.values.map((row: unknown[]) => {
                    const obj: Record<string, unknown> = {};
                    columns.forEach((col: string, i: number) => {
                        obj[col] = row[i];
                    });
                    return obj;
                });

                return { type: 'select', columns, rows, executionTime };
            }

            if (this.isDDLQuery(trimmed)) {
                entry.db.run(trimmed);
                this.saveToFile(entry);
                const executionTime = performance.now() - startTime;
                return { type: 'ddl', executionTime, affectedRows: 0 };
            }

            // DML: INSERT, UPDATE, DELETE
            entry.db.run(trimmed);
            const changesResult = entry.db.exec('SELECT changes()');
            const affectedRows = changesResult.length > 0 ? (changesResult[0].values[0][0] as number) : 0;
            this.saveToFile(entry);
            const executionTime = performance.now() - startTime;

            return { type: 'mutation', affectedRows, executionTime };
        } catch (error) {
            const executionTime = performance.now() - startTime;
            return {
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
                executionTime,
            };
        }
    }

    executeMultipleStatements(filePath: string, sql: string): QueryResult[] {
        const statements = this.splitStatements(sql);
        const results: QueryResult[] = [];

        for (const stmt of statements) {
            if (stmt.trim()) {
                results.push(this.executeQuery(filePath, stmt));
            }
        }

        return results;
    }

    dropTable(filePath: string, tableName: string): QueryResult {
        const safeName = this.escapeIdentifier(tableName);
        return this.executeQuery(filePath, `DROP TABLE IF EXISTS ${safeName}`);
    }

    createTable(filePath: string, payload: CreateTablePayload): QueryResult {
        const columns = payload.columns.map((col) => {
            const parts = [this.escapeIdentifier(col.name), col.type];
            if (col.primaryKey) parts.push('PRIMARY KEY');
            if (col.notNull) parts.push('NOT NULL');
            if (col.unique) parts.push('UNIQUE');
            if (col.defaultValue !== null && col.defaultValue !== '') {
                parts.push(`DEFAULT ${col.defaultValue}`);
            }
            return parts.join(' ');
        });

        const sql = `CREATE TABLE ${this.escapeIdentifier(payload.name)} (\n  ${columns.join(',\n  ')}\n)`;
        return this.executeQuery(filePath, sql);
    }

    addColumn(filePath: string, payload: AddColumnPayload): QueryResult {
        const parts = [
            `ALTER TABLE ${this.escapeIdentifier(payload.tableName)}`,
            `ADD COLUMN ${this.escapeIdentifier(payload.column.name)}`,
            payload.column.type,
        ];
        if (payload.column.notNull && payload.column.defaultValue !== null) {
            parts.push('NOT NULL');
            parts.push(`DEFAULT ${payload.column.defaultValue}`);
        }
        return this.executeQuery(filePath, parts.join(' '));
    }

    createIndex(filePath: string, payload: CreateIndexPayload): QueryResult {
        const uniqueStr = payload.unique ? 'UNIQUE ' : '';
        const cols = payload.columns.map((c) => this.escapeIdentifier(c)).join(', ');
        const sql = `CREATE ${uniqueStr}INDEX ${this.escapeIdentifier(payload.indexName)} ON ${this.escapeIdentifier(payload.tableName)} (${cols})`;
        return this.executeQuery(filePath, sql);
    }

    dropIndex(filePath: string, indexName: string): QueryResult {
        return this.executeQuery(filePath, `DROP INDEX IF EXISTS ${this.escapeIdentifier(indexName)}`);
    }

    getTableData(filePath: string, tableName: string, limit: number, offset: number): QueryResult {
        const safeName = this.escapeIdentifier(tableName);
        return this.executeQuery(filePath, `SELECT * FROM ${safeName} LIMIT ${limit} OFFSET ${offset}`);
    }

    generateSQL(_filePath: string, operation: string, payload: unknown): string {
        switch (operation) {
            case 'createTable': {
                const p = payload as CreateTablePayload;
                const columns = p.columns.map((col) => {
                    const parts = [this.escapeIdentifier(col.name), col.type];
                    if (col.primaryKey) parts.push('PRIMARY KEY');
                    if (col.notNull) parts.push('NOT NULL');
                    if (col.unique) parts.push('UNIQUE');
                    if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
                    return parts.join(' ');
                });
                return `CREATE TABLE ${this.escapeIdentifier(p.name)} (\n  ${columns.join(',\n  ')}\n);`;
            }
            case 'addColumn': {
                const p = payload as AddColumnPayload;
                return `ALTER TABLE ${this.escapeIdentifier(p.tableName)} ADD COLUMN ${this.escapeIdentifier(p.column.name)} ${p.column.type};`;
            }
            case 'dropTable': {
                const name = payload as string;
                return `DROP TABLE IF EXISTS ${this.escapeIdentifier(name)};`;
            }
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    // --- Private helpers ---

    private getDatabase(filePath: string): OpenDatabase {
        const entry = this.databases.get(filePath);
        if (!entry) {
            throw new Error(`Database not open: ${filePath}`);
        }
        return entry;
    }

    private queryAll(db: SqlJsDatabase, sql: string): Record<string, unknown>[] {
        const results = db.exec(sql);
        if (results.length === 0) return [];

        const { columns, values } = results[0];
        return values.map((row: unknown[]) => {
            const obj: Record<string, unknown> = {};
            columns.forEach((col: string, i: number) => {
                obj[col] = row[i];
            });
            return obj;
        });
    }

    private getTables(db: SqlJsDatabase): TableInfo[] {
        const tables = this.queryAll(
            db,
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ) as Array<{ name: string }>;

        return tables.map((t) => {
            const columns = this.getColumns(db, t.name);
            const indexes = this.getIndexes(db, t.name);
            const foreignKeys = this.getForeignKeys(db, t.name);
            const countResult = this.queryAll(db, `SELECT COUNT(*) as count FROM "${t.name}"`) as Array<{ count: number }>;
            const rowCount = countResult.length > 0 ? countResult[0].count : 0;

            return {
                name: t.name,
                columns,
                indexes,
                foreignKeys,
                rowCount,
            };
        });
    }

    private getColumns(db: SqlJsDatabase, tableName: string): ColumnInfo[] {
        const columns = this.queryAll(db, `PRAGMA table_info("${tableName}")`) as Array<{
            cid: number;
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
        }>;

        const uniqueColumns = new Set<string>();
        const indexes = this.queryAll(db, `PRAGMA index_list("${tableName}")`) as Array<{
            name: string;
            unique: number;
        }>;
        for (const idx of indexes) {
            if (idx.unique) {
                const idxInfo = this.queryAll(db, `PRAGMA index_info("${idx.name}")`) as Array<{ name: string }>;
                if (idxInfo.length === 1) {
                    uniqueColumns.add(idxInfo[0].name);
                }
            }
        }

        return columns.map((col) => ({
            cid: col.cid,
            name: col.name,
            type: col.type || 'TEXT',
            notnull: col.notnull === 1,
            dflt_value: col.dflt_value,
            pk: col.pk > 0,
            unique: uniqueColumns.has(col.name),
        }));
    }

    private getIndexes(db: SqlJsDatabase, tableName: string): IndexInfo[] {
        const indexes = this.queryAll(db, `PRAGMA index_list("${tableName}")`) as Array<{
            name: string;
            unique: number;
        }>;

        return indexes
            .filter((idx) => !idx.name.startsWith('sqlite_'))
            .map((idx) => {
                const info = this.queryAll(db, `PRAGMA index_info("${idx.name}")`) as Array<{ name: string }>;
                return {
                    name: idx.name,
                    unique: idx.unique === 1,
                    columns: info.map((i) => i.name),
                };
            });
    }

    private getForeignKeys(db: SqlJsDatabase, tableName: string): ForeignKeyInfo[] {
        return this.queryAll(db, `PRAGMA foreign_key_list("${tableName}")`) as unknown as ForeignKeyInfo[];
    }

    private getViews(db: SqlJsDatabase): ViewInfo[] {
        return this.queryAll(
            db,
            "SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name"
        ) as unknown as ViewInfo[];
    }

    private isSelectQuery(sql: string): boolean {
        const upper = sql.toUpperCase().trimStart();
        return upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN');
    }

    private isDDLQuery(sql: string): boolean {
        const upper = sql.toUpperCase().trimStart();
        return upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP');
    }

    private splitStatements(sql: string): string[] {
        const statements: string[] = [];
        let current = '';
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];

            if (inString) {
                current += char;
                if (char === stringChar && sql[i + 1] !== stringChar) {
                    inString = false;
                }
                continue;
            }

            if (char === "'" || char === '"') {
                inString = true;
                stringChar = char;
                current += char;
                continue;
            }

            if (char === '-' && sql[i + 1] === '-') {
                const newline = sql.indexOf('\n', i);
                if (newline === -1) break;
                i = newline;
                continue;
            }

            if (char === ';') {
                if (current.trim()) {
                    statements.push(current.trim());
                }
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim()) {
            statements.push(current.trim());
        }

        return statements;
    }

    private escapeIdentifier(name: string): string {
        return `"${name.replace(/"/g, '""')}"`;
    }
}
