// Shared type definitions between Main and Renderer processes

export interface DatabaseInfo {
    path: string;
    name: string;
    size: number;
    tables: TableInfo[];
    views: ViewInfo[];
}

export interface TableInfo {
    name: string;
    columns: ColumnInfo[];
    indexes: IndexInfo[];
    foreignKeys: ForeignKeyInfo[];
    rowCount: number;
}

export interface ColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: boolean;
    dflt_value: string | null;
    pk: boolean;
    unique: boolean;
}

export interface IndexInfo {
    name: string;
    unique: boolean;
    columns: string[];
}

export interface ForeignKeyInfo {
    id: number;
    seq: number;
    table: string;
    from: string;
    to: string;
    on_update: string;
    on_delete: string;
}

export interface ViewInfo {
    name: string;
    sql: string;
}

export interface QueryResult {
    type: 'select' | 'mutation' | 'error' | 'ddl';
    columns?: string[];
    rows?: Record<string, unknown>[];
    affectedRows?: number;
    error?: string;
    executionTime: number;
}

export interface TabState {
    id: string;
    title: string;
    content: string;
    filePath?: string;
    isDirty: boolean;
    language: string;
}

// Schema diagram types
export interface SchemaNode {
    id: string;
    tableName: string;
    position: { x: number; y: number };
    columns: ColumnInfo[];
    foreignKeys: ForeignKeyInfo[];
}

export interface SchemaEdge {
    id: string;
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
}

// IPC Channel definitions
export const IPC_CHANNELS = {
    // Database management
    DB_OPEN: 'db:open',
    DB_CREATE: 'db:create',
    DB_CLOSE: 'db:close',
    DB_GET_INFO: 'db:get-info',
    DB_LIST_OPEN: 'db:list-open',

    // Query execution
    QUERY_EXECUTE: 'query:execute',
    QUERY_EXECUTE_SELECTED: 'query:execute-selected',

    // Schema operations
    SCHEMA_GET: 'schema:get',
    SCHEMA_APPLY_DDL: 'schema:apply-ddl',
    SCHEMA_GENERATE_SQL: 'schema:generate-sql',

    // Table operations
    TABLE_DROP: 'table:drop',
    TABLE_CREATE: 'table:create',
    TABLE_ADD_COLUMN: 'table:add-column',
    TABLE_GET_DATA: 'table:get-data',

    // Index operations
    INDEX_CREATE: 'index:create',
    INDEX_DROP: 'index:drop',

    // File operations
    FILE_SAVE_SQL: 'file:save-sql',
    FILE_OPEN_SQL: 'file:open-sql',
    FILE_DIALOG_OPEN_DB: 'file:dialog-open-db',
    FILE_DIALOG_CREATE_DB: 'file:dialog-create-db',

    // App
    APP_GET_THEME: 'app:get-theme',
    APP_SET_THEME: 'app:set-theme',
} as const;

export type Theme = 'dark' | 'light';

export interface CreateTablePayload {
    name: string;
    columns: Array<{
        name: string;
        type: string;
        primaryKey: boolean;
        notNull: boolean;
        unique: boolean;
        defaultValue: string | null;
    }>;
}

export interface AddColumnPayload {
    tableName: string;
    column: {
        name: string;
        type: string;
        notNull: boolean;
        defaultValue: string | null;
    };
}

export interface CreateIndexPayload {
    tableName: string;
    indexName: string;
    columns: string[];
    unique: boolean;
}
