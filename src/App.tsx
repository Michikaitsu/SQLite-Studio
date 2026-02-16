import React, { useEffect, useCallback } from 'react';
import { useAppStore } from './store/app-store';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { EditorPanel } from './components/EditorPanel';
import { SchemaView } from './components/SchemaView';
import { ResultsPanel } from './components/ResultsPanel';
import { StatusBar } from './components/StatusBar';
import { ContextMenu } from './components/ContextMenu';
import { ToastContainer } from './components/ToastContainer';
import { EmptyState } from './components/EmptyState';

export const App: React.FC = () => {
    const {
        theme,
        toggleTheme,
        sidebarVisible,
        toggleSidebar,
        activeView,
        activeDbPath,
        activeTabId,
        tabs,
        addTab,
        addToast,
        setActiveView,
        updateTabContent,
        updateTabDirty,
        updateTabFilePath,
    } = useAppStore();

    const handleOpenDatabase = useCallback(async () => {
        try {
            const filePath = await window.sqliteStudio.dialogOpenDb();
            if (filePath) {
                const info = await window.sqliteStudio.openDatabase(filePath);
                useAppStore.getState().addDatabase(info);
                addToast({ type: 'success', message: `Opened ${info.name}` });
            }
        } catch (error) {
            addToast({ type: 'error', message: `Failed to open database: ${error}` });
        }
    }, [addToast]);

    const handleCreateDatabase = useCallback(async () => {
        try {
            const filePath = await window.sqliteStudio.dialogCreateDb();
            if (filePath) {
                const info = await window.sqliteStudio.createDatabase(filePath);
                useAppStore.getState().addDatabase(info);
                addToast({ type: 'success', message: `Created ${info.name}` });
            }
        } catch (error) {
            addToast({ type: 'error', message: `Failed to create database: ${error}` });
        }
    }, [addToast]);

    const handleExecuteQuery = useCallback(async () => {
        const state = useAppStore.getState();
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!tab || !state.activeDbPath) return;

        try {
            const result = await window.sqliteStudio.executeQuery(state.activeDbPath, tab.content);
            state.setQueryResult(tab.id, result);

            if (result.type === 'ddl' || result.type === 'mutation') {
                const info = await window.sqliteStudio.getDatabaseInfo(state.activeDbPath);
                state.updateDatabase(info);
            }
        } catch (error) {
            addToast({ type: 'error', message: `Query error: ${error}` });
        }
    }, [addToast]);

    const handleSaveFile = useCallback(async () => {
        const state = useAppStore.getState();
        const tab = state.tabs.find((t) => t.id === state.activeTabId);
        if (!tab) return;

        try {
            const savedPath = await window.sqliteStudio.saveSqlFile(tab.content, tab.filePath);
            if (savedPath) {
                updateTabFilePath(tab.id, savedPath);
                updateTabDirty(tab.id, false);
                const fileName = savedPath.split(/[\\/]/).pop() || 'Untitled';
                useAppStore.getState().updateTabTitle(tab.id, fileName);
                addToast({ type: 'success', message: `Saved ${fileName}` });
            }
        } catch (error) {
            addToast({ type: 'error', message: `Save failed: ${error}` });
        }
    }, [addToast, updateTabDirty, updateTabFilePath]);

    // Menu actions handler
    useEffect(() => {
        const cleanup = window.sqliteStudio.onMenuAction((action: string) => {
            switch (action) {
                case 'new-database':
                    handleCreateDatabase();
                    break;
                case 'open-database':
                    handleOpenDatabase();
                    break;
                case 'new-query':
                    addTab({ title: 'Query ' + (tabs.length + 1) });
                    break;
                case 'open-sql':
                    (async () => {
                        const result = await window.sqliteStudio.openSqlFile();
                        if (result) {
                            const name = result.filePath.split(/[\\/]/).pop() || 'Untitled';
                            addTab({ title: name, content: result.content, filePath: result.filePath });
                        }
                    })();
                    break;
                case 'save-sql':
                    handleSaveFile();
                    break;
                case 'execute-query':
                    handleExecuteQuery();
                    break;
                case 'toggle-theme':
                    toggleTheme();
                    break;
                case 'toggle-sidebar':
                    toggleSidebar();
                    break;
                case 'show-schema':
                    setActiveView('schema');
                    break;
            }
        });

        return cleanup;
    }, [handleOpenDatabase, handleCreateDatabase, handleExecuteQuery, handleSaveFile, addTab, tabs.length, toggleTheme, toggleSidebar, setActiveView]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                handleExecuteQuery();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                handleSaveFile();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleExecuteQuery, handleSaveFile]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const hasActiveDb = activeDbPath !== null;
    const activeTab = tabs.find((t) => t.id === activeTabId);

    return (
        <div className="app-container" data-theme={theme}>
            <Toolbar
                onOpenDatabase={handleOpenDatabase}
                onCreateDatabase={handleCreateDatabase}
                onExecuteQuery={handleExecuteQuery}
                onSaveFile={handleSaveFile}
            />
            <div className="app-body">
                <Sidebar
                    onOpenDatabase={handleOpenDatabase}
                    onCreateDatabase={handleCreateDatabase}
                />
                <div className="main-content">
                    {hasActiveDb ? (
                        <>
                            <TabBar />
                            {activeTab ? (
                                activeView === 'editor' ? (
                                    <>
                                        <EditorPanel />
                                        <ResultsPanel />
                                    </>
                                ) : (
                                    <SchemaView />
                                )
                            ) : (
                                <EmptyState
                                    type="no-tab"
                                    onNewQuery={() => addTab({ title: 'Query ' + (tabs.length + 1) })}
                                />
                            )}
                        </>
                    ) : (
                        <EmptyState
                            type="no-database"
                            onOpenDatabase={handleOpenDatabase}
                            onCreateDatabase={handleCreateDatabase}
                        />
                    )}
                </div>
            </div>
            <StatusBar />
            <ContextMenu />
            <ToastContainer />
        </div>
    );
};
