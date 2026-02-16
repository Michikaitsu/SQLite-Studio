import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';

export function createApplicationMenu(getWindow: () => BrowserWindow | null): Menu {
    const template: MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Database',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => getWindow()?.webContents.send('menu:action', 'new-database'),
                },
                {
                    label: 'Open Database',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => getWindow()?.webContents.send('menu:action', 'open-database'),
                },
                { type: 'separator' },
                {
                    label: 'New Query',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => getWindow()?.webContents.send('menu:action', 'new-query'),
                },
                {
                    label: 'Open SQL File',
                    click: () => getWindow()?.webContents.send('menu:action', 'open-sql'),
                },
                {
                    label: 'Save SQL File',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => getWindow()?.webContents.send('menu:action', 'save-sql'),
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'Query',
            submenu: [
                {
                    label: 'Execute Query',
                    accelerator: 'CmdOrCtrl+Enter',
                    click: () => getWindow()?.webContents.send('menu:action', 'execute-query'),
                },
                {
                    label: 'Execute Selected',
                    accelerator: 'CmdOrCtrl+Shift+Enter',
                    click: () => getWindow()?.webContents.send('menu:action', 'execute-selected'),
                },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Theme',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => getWindow()?.webContents.send('menu:action', 'toggle-theme'),
                },
                {
                    label: 'Toggle Sidebar',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => getWindow()?.webContents.send('menu:action', 'toggle-sidebar'),
                },
                { type: 'separator' },
                {
                    label: 'Schema View',
                    click: () => getWindow()?.webContents.send('menu:action', 'show-schema'),
                },
                { type: 'separator' },
                { role: 'toggleDevTools' },
                { role: 'reload' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About SQLite Studio',
                    click: () => getWindow()?.webContents.send('menu:action', 'about'),
                },
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
}
