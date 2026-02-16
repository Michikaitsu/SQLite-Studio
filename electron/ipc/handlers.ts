import { IpcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { DatabaseService } from '../services/database-service';
import { IPC_CHANNELS } from '../../shared/types';
import type { CreateTablePayload, AddColumnPayload, CreateIndexPayload, Theme } from '../../shared/types';

let currentTheme: Theme = 'dark';

export function registerIpcHandlers(
    ipcMain: IpcMain,
    dbService: DatabaseService,
    getWindow: () => BrowserWindow | null
): void {
    // --- Database management ---
    ipcMain.handle(IPC_CHANNELS.DB_OPEN, async (_event, filePath: string) => {
        return dbService.open(filePath);
    });

    ipcMain.handle(IPC_CHANNELS.DB_CREATE, async (_event, filePath: string) => {
        return dbService.create(filePath);
    });

    ipcMain.handle(IPC_CHANNELS.DB_CLOSE, async (_event, filePath: string) => {
        dbService.close(filePath);
    });

    ipcMain.handle(IPC_CHANNELS.DB_GET_INFO, async (_event, filePath: string) => {
        return dbService.getInfo(filePath);
    });

    ipcMain.handle(IPC_CHANNELS.DB_LIST_OPEN, async () => {
        return dbService.listOpen();
    });

    // --- Query execution ---
    ipcMain.handle(IPC_CHANNELS.QUERY_EXECUTE, async (_event, dbPath: string, sql: string) => {
        const results = dbService.executeMultipleStatements(dbPath, sql);
        return results[results.length - 1] || { type: 'error', error: 'No statements to execute', executionTime: 0 };
    });

    ipcMain.handle(IPC_CHANNELS.QUERY_EXECUTE_SELECTED, async (_event, dbPath: string, sql: string) => {
        return dbService.executeQuery(dbPath, sql);
    });

    // --- Schema operations ---
    ipcMain.handle(IPC_CHANNELS.SCHEMA_GET, async (_event, dbPath: string) => {
        return dbService.getInfo(dbPath);
    });

    ipcMain.handle(IPC_CHANNELS.SCHEMA_APPLY_DDL, async (_event, dbPath: string, sql: string) => {
        return dbService.executeQuery(dbPath, sql);
    });

    ipcMain.handle(IPC_CHANNELS.SCHEMA_GENERATE_SQL, async (_event, dbPath: string, operation: string, payload: unknown) => {
        return dbService.generateSQL(dbPath, operation, payload);
    });

    // --- Table operations ---
    ipcMain.handle(IPC_CHANNELS.TABLE_DROP, async (_event, dbPath: string, tableName: string) => {
        return dbService.dropTable(dbPath, tableName);
    });

    ipcMain.handle(IPC_CHANNELS.TABLE_CREATE, async (_event, dbPath: string, payload: CreateTablePayload) => {
        return dbService.createTable(dbPath, payload);
    });

    ipcMain.handle(IPC_CHANNELS.TABLE_ADD_COLUMN, async (_event, dbPath: string, payload: AddColumnPayload) => {
        return dbService.addColumn(dbPath, payload);
    });

    ipcMain.handle(IPC_CHANNELS.TABLE_GET_DATA, async (_event, dbPath: string, tableName: string, limit: number, offset: number) => {
        return dbService.getTableData(dbPath, tableName, limit, offset);
    });

    // --- Index operations ---
    ipcMain.handle(IPC_CHANNELS.INDEX_CREATE, async (_event, dbPath: string, payload: CreateIndexPayload) => {
        return dbService.createIndex(dbPath, payload);
    });

    ipcMain.handle(IPC_CHANNELS.INDEX_DROP, async (_event, dbPath: string, indexName: string) => {
        return dbService.dropIndex(dbPath, indexName);
    });

    // --- File operations ---
    ipcMain.handle(IPC_CHANNELS.FILE_SAVE_SQL, async (_event, content: string, filePath?: string) => {
        let targetPath = filePath;

        if (!targetPath) {
            const win = getWindow();
            if (!win) return null;
            const result = await dialog.showSaveDialog(win, {
                filters: [{ name: 'SQL Files', extensions: ['sql'] }],
                defaultPath: 'query.sql',
            });
            if (result.canceled || !result.filePath) return null;
            targetPath = result.filePath;
        }

        fs.writeFileSync(targetPath, content, 'utf-8');
        return targetPath;
    });

    ipcMain.handle(IPC_CHANNELS.FILE_OPEN_SQL, async () => {
        const win = getWindow();
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            filters: [{ name: 'SQL Files', extensions: ['sql'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        const content = fs.readFileSync(result.filePaths[0], 'utf-8');
        return { content, filePath: result.filePaths[0] };
    });

    ipcMain.handle(IPC_CHANNELS.FILE_DIALOG_OPEN_DB, async () => {
        const win = getWindow();
        if (!win) return null;
        const result = await dialog.showOpenDialog(win, {
            filters: [
                { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle(IPC_CHANNELS.FILE_DIALOG_CREATE_DB, async () => {
        const win = getWindow();
        if (!win) return null;
        const result = await dialog.showSaveDialog(win, {
            filters: [{ name: 'SQLite Database', extensions: ['db'] }],
            defaultPath: 'new_database.db',
        });
        if (result.canceled || !result.filePath) return null;
        return result.filePath;
    });

    // --- Theme ---
    ipcMain.handle(IPC_CHANNELS.APP_GET_THEME, async () => {
        return currentTheme;
    });

    ipcMain.handle(IPC_CHANNELS.APP_SET_THEME, async (_event, theme: Theme) => {
        currentTheme = theme;
    });
}
