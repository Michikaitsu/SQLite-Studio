import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
    QueryResult,
    DatabaseInfo,
    CreateTablePayload,
    AddColumnPayload,
    CreateIndexPayload,
    Theme,
} from '../shared/types';

const api = {
    // Database management
    openDatabase: (filePath: string): Promise<DatabaseInfo> =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_OPEN, filePath),

    createDatabase: (filePath: string): Promise<DatabaseInfo> =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_CREATE, filePath),

    closeDatabase: (filePath: string): Promise<void> =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_CLOSE, filePath),

    getDatabaseInfo: (filePath: string): Promise<DatabaseInfo> =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_GET_INFO, filePath),

    listOpenDatabases: (): Promise<string[]> =>
        ipcRenderer.invoke(IPC_CHANNELS.DB_LIST_OPEN),

    // Query execution
    executeQuery: (dbPath: string, sql: string): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.QUERY_EXECUTE, dbPath, sql),

    executeSelectedQuery: (dbPath: string, sql: string): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.QUERY_EXECUTE_SELECTED, dbPath, sql),

    // Schema operations
    getSchema: (dbPath: string): Promise<DatabaseInfo> =>
        ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GET, dbPath),

    applyDDL: (dbPath: string, sql: string): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_APPLY_DDL, dbPath, sql),

    generateSQL: (dbPath: string, operation: string, payload: unknown): Promise<string> =>
        ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GENERATE_SQL, dbPath, operation, payload),

    // Table operations
    dropTable: (dbPath: string, tableName: string): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.TABLE_DROP, dbPath, tableName),

    createTable: (dbPath: string, payload: CreateTablePayload): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.TABLE_CREATE, dbPath, payload),

    addColumn: (dbPath: string, payload: AddColumnPayload): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.TABLE_ADD_COLUMN, dbPath, payload),

    getTableData: (dbPath: string, tableName: string, limit: number, offset: number): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.TABLE_GET_DATA, dbPath, tableName, limit, offset),

    // Index operations
    createIndex: (dbPath: string, payload: CreateIndexPayload): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.INDEX_CREATE, dbPath, payload),

    dropIndex: (dbPath: string, indexName: string): Promise<QueryResult> =>
        ipcRenderer.invoke(IPC_CHANNELS.INDEX_DROP, dbPath, indexName),

    // File operations
    saveSqlFile: (content: string, filePath?: string): Promise<string | null> =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_SAVE_SQL, content, filePath),

    openSqlFile: (): Promise<{ content: string; filePath: string } | null> =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN_SQL),

    dialogOpenDb: (): Promise<string | null> =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_OPEN_DB),

    dialogCreateDb: (): Promise<string | null> =>
        ipcRenderer.invoke(IPC_CHANNELS.FILE_DIALOG_CREATE_DB),

    // Theme
    getTheme: (): Promise<Theme> =>
        ipcRenderer.invoke(IPC_CHANNELS.APP_GET_THEME),

    setTheme: (theme: Theme): Promise<void> =>
        ipcRenderer.invoke(IPC_CHANNELS.APP_SET_THEME, theme),

    // Event listeners
    onMenuAction: (callback: (action: string) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
        ipcRenderer.on('menu:action', handler);
        return () => ipcRenderer.removeListener('menu:action', handler);
    },
};

contextBridge.exposeInMainWorld('sqliteStudio', api);

export type SqliteStudioAPI = typeof api;
