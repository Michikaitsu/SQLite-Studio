import React from 'react';
import { useAppStore } from '../store/app-store';
import { DatabaseIcon, PlusIcon, FolderOpenIcon } from './Icons';

interface EmptyStateProps {
    type: 'no-database' | 'no-tab';
    onOpenDatabase?: () => void;
    onCreateDatabase?: () => void;
    onNewQuery?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    type,
    onOpenDatabase,
    onCreateDatabase,
    onNewQuery,
}) => {
    if (type === 'no-database') {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <DatabaseIcon />
                </div>
                <h2 className="empty-state-title">Welcome to SQLite Studio</h2>
                <p className="empty-state-text">
                    Open an existing SQLite database or create a new one to get started.
                    You can write SQL queries, explore schemas, and visualize table relationships.
                </p>
                <div className="empty-state-actions">
                    <button className="btn btn-primary" onClick={onOpenDatabase}>
                        <FolderOpenIcon />
                        Open Database
                    </button>
                    <button className="btn btn-secondary" onClick={onCreateDatabase}>
                        <PlusIcon />
                        New Database
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            </div>
            <h2 className="empty-state-title">No Query Tab Open</h2>
            <p className="empty-state-text">
                Create a new query tab to start writing SQL or explore the database schema.
            </p>
            <div className="empty-state-actions">
                <button className="btn btn-primary" onClick={onNewQuery}>
                    <PlusIcon />
                    New Query
                </button>
            </div>
        </div>
    );
};
