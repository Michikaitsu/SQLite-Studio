import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { DatabaseService } from './services/database-service';
import { registerIpcHandlers } from './ipc/handlers';
import { createApplicationMenu } from './menu';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
const databaseService = new DatabaseService();

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        title: 'SQLite Studio',
        backgroundColor: '#0f0f17',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });

    console.log('isPackaged:', app.isPackaged);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Force dev mode if env var is set or not packaged
    const isDebug = !app.isPackaged || process.env.NODE_ENV === 'development';

    if (isDebug) {
        const devUrl = 'http://localhost:5173';
        console.log('Loading URL:', devUrl);
        mainWindow.loadURL(devUrl).catch(e => console.error('Failed to load URL:', e));
        mainWindow.webContents.openDevTools({ mode: 'bottom' });
    } else {
        console.log('Loading File:', path.join(__dirname, '../../dist/index.html'));
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    registerIpcHandlers(ipcMain, databaseService, () => mainWindow);

    const menu = createApplicationMenu(() => mainWindow);
    Menu.setApplicationMenu(menu);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    databaseService.closeAll();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    databaseService.closeAll();
});
