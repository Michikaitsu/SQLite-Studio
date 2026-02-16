import type { SqliteStudioAPI } from '../electron/preload';

declare global {
    interface Window {
        sqliteStudio: SqliteStudioAPI;
    }
}

export { };
