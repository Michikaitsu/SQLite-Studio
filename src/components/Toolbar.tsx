import React from 'react';
import { useAppStore } from '../store/app-store';
import { DatabaseIcon, PlayIcon, SaveIcon, PlusIcon, FolderOpenIcon, SunIcon, MoonIcon, LayoutIcon, CodeIcon } from './Icons';

interface ToolbarProps {
    onOpenDatabase: () => void;
    onCreateDatabase: () => void;
    onExecuteQuery: () => void;
    onSaveFile: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    onOpenDatabase,
    onCreateDatabase,
    onExecuteQuery,
    onSaveFile,
}) => {
    const {
        theme,
        toggleTheme,
        activeDbPath,
        databases,
        setActiveDb,
        activeView,
        setActiveView,
        tabs,
        addTab,
    } = useAppStore();

    const dbEntries = Array.from(databases.entries());

    return (
        <div className="toolbar">
            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={onCreateDatabase} title="New Database (Ctrl+N)">
                    <PlusIcon />
                    <span>New DB</span>
                </button>
                <button className="toolbar-btn" onClick={onOpenDatabase} title="Open Database (Ctrl+O)">
                    <FolderOpenIcon />
                    <span>Open DB</span>
                </button>
            </div>

            <div className="toolbar-separator" />

            {activeDbPath && (
                <>
                    <div className="toolbar-db-selector">
                        <DatabaseIcon />
                        <select
                            value={activeDbPath || ''}
                            onChange={(e) => setActiveDb(e.target.value || null)}
                        >
                            {dbEntries.map(([path, info]) => (
                                <option key={path} value={path}>
                                    {info.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="toolbar-separator" />

                    <div className="toolbar-group">
                        <button
                            className="toolbar-btn"
                            onClick={() => addTab({ title: 'Query ' + (tabs.length + 1) })}
                            title="New Query (Ctrl+T)"
                        >
                            <PlusIcon />
                            <span>Query</span>
                        </button>
                        <button
                            className="toolbar-btn primary"
                            onClick={onExecuteQuery}
                            title="Execute Query (Ctrl+Enter)"
                        >
                            <PlayIcon />
                            <span>Run</span>
                        </button>
                        <button className="toolbar-btn" onClick={onSaveFile} title="Save SQL (Ctrl+S)">
                            <SaveIcon />
                        </button>
                    </div>

                    <div className="toolbar-separator" />

                    <div className="toolbar-group">
                        <button
                            className={`toolbar-btn ${activeView === 'editor' ? 'active' : ''}`}
                            onClick={() => setActiveView('editor')}
                            title="SQL Editor"
                        >
                            <CodeIcon />
                            <span>Editor</span>
                        </button>
                        <button
                            className={`toolbar-btn ${activeView === 'schema' ? 'active' : ''}`}
                            onClick={() => setActiveView('schema')}
                            title="Schema Designer"
                        >
                            <LayoutIcon />
                            <span>Schema</span>
                        </button>
                    </div>
                </>
            )}

            <div className="toolbar-spacer" />

            <div className="toolbar-group">
                <button className="toolbar-btn" onClick={toggleTheme} title="Toggle Theme">
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
            </div>
        </div>
    );
};
