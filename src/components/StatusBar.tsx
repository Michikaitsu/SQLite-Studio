import React from 'react';
import { useAppStore } from '../store/app-store';

export const StatusBar: React.FC = () => {
    const { activeDbPath, databases, theme, tabs, activeTabId } = useAppStore();

    const dbInfo = activeDbPath ? databases.get(activeDbPath) : null;
    const activeTab = tabs.find((t) => t.id === activeTabId);

    return (
        <div className="status-bar">
            <div className="status-item">
                <span
                    className={`status-dot ${activeDbPath ? 'connected' : 'disconnected'}`}
                />
                <span>{activeDbPath ? 'Connected' : 'No connection'}</span>
            </div>

            {dbInfo && (
                <>
                    <div className="status-item">
                        <span>{dbInfo.name}</span>
                    </div>
                    <div className="status-item">
                        <span>
                            {dbInfo.tables.length} table{dbInfo.tables.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="status-item">
                        <span>{formatSize(dbInfo.size)}</span>
                    </div>
                </>
            )}

            <div className="status-spacer" />

            {activeTab && (
                <div className="status-item">
                    <span>SQL</span>
                </div>
            )}

            <div className="status-item">
                <span>{theme === 'dark' ? '🌙' : '☀️'} {theme}</span>
            </div>

            <div className="status-item">
                <span>SQLite Studio v1.0</span>
            </div>
        </div>
    );
};

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
