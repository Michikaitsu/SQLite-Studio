import React, { useCallback } from 'react';
import { useAppStore } from '../store/app-store';
import {
    DatabaseIcon,
    TableIcon,
    ColumnIcon,
    KeyIcon,
    ForeignKeyIcon,
    IndexIcon,
    ViewIcon,
    ChevronIcon,
    PlusIcon,
    TrashIcon,
} from './Icons';
import type { TableInfo, ColumnInfo } from '../../shared/types';

interface SidebarProps {
    onOpenDatabase: () => void;
    onCreateDatabase: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDatabase, onCreateDatabase }) => {
    const {
        sidebarVisible,
        databases,
        activeDbPath,
        setActiveDb,
        expandedNodes,
        toggleNode,
        showContextMenu,
        addTab,
        addToast,
    } = useAppStore();

    const refreshDb = useCallback(async (dbPath: string) => {
        try {
            const info = await window.sqliteStudio.getDatabaseInfo(dbPath);
            useAppStore.getState().updateDatabase(info);
        } catch (error) {
            addToast({ type: 'error', message: `Refresh failed: ${error}` });
        }
    }, [addToast]);

    const handleCloseDb = useCallback(async (dbPath: string) => {
        try {
            await window.sqliteStudio.closeDatabase(dbPath);
            useAppStore.getState().removeDatabase(dbPath);
            addToast({ type: 'info', message: 'Database closed' });
        } catch (error) {
            addToast({ type: 'error', message: `Close failed: ${error}` });
        }
    }, [addToast]);

    const handleDropTable = useCallback(async (dbPath: string, tableName: string) => {
        try {
            const result = await window.sqliteStudio.dropTable(dbPath, tableName);
            if (result.type === 'error') {
                addToast({ type: 'error', message: result.error || 'Drop failed' });
            } else {
                addToast({ type: 'success', message: `Dropped table ${tableName}` });
                await refreshDb(dbPath);
            }
        } catch (error) {
            addToast({ type: 'error', message: `Drop failed: ${error}` });
        }
    }, [addToast, refreshDb]);

    const handleTableContextMenu = useCallback(
        (e: React.MouseEvent, dbPath: string, tableName: string) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Select Top 100 Rows',
                    action: () => {
                        const tabId = addTab({ title: `${tableName} - SELECT` });
                        useAppStore.getState().updateTabContent(tabId, `SELECT * FROM "${tableName}" LIMIT 100;`);
                    },
                },
                {
                    label: 'Add Column...',
                    action: () => {
                        const tabId = addTab({ title: `${tableName} - ALTER` });
                        useAppStore
                            .getState()
                            .updateTabContent(
                                tabId,
                                `ALTER TABLE "${tableName}" ADD COLUMN new_column TEXT;`
                            );
                    },
                },
                {
                    label: 'Create Index...',
                    action: () => {
                        const tabId = addTab({ title: `${tableName} - INDEX` });
                        useAppStore
                            .getState()
                            .updateTabContent(
                                tabId,
                                `CREATE INDEX "idx_${tableName}_column" ON "${tableName}" ("column_name");`
                            );
                    },
                },
                { label: '', separator: true, action: () => { } },
                {
                    label: 'Drop Table',
                    danger: true,
                    action: () => handleDropTable(dbPath, tableName),
                },
            ]);
        },
        [showContextMenu, addTab, handleDropTable]
    );

    const handleDbContextMenu = useCallback(
        (e: React.MouseEvent, dbPath: string) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e.clientX, e.clientY, [
                {
                    label: 'New Query',
                    action: () => addTab({ title: 'Query' }),
                },
                {
                    label: 'Refresh',
                    action: () => refreshDb(dbPath),
                },
                { label: '', separator: true, action: () => { } },
                {
                    label: 'Close Database',
                    danger: true,
                    action: () => handleCloseDb(dbPath),
                },
            ]);
        },
        [showContextMenu, addTab, refreshDb, handleCloseDb]
    );

    const handleColumnClick = useCallback(
        (tableName: string, column: ColumnInfo) => {
            const tabId = addTab({ title: `${tableName}.${column.name}` });
            useAppStore
                .getState()
                .updateTabContent(tabId, `SELECT "${column.name}" FROM "${tableName}" LIMIT 100;`);
        },
        [addTab]
    );

    if (!sidebarVisible) return null;

    const dbEntries = Array.from(databases.entries());

    return (
        <div className={`sidebar ${sidebarVisible ? '' : 'collapsed'}`}>
            <div className="sidebar-header">
                <span className="sidebar-title">Explorer</span>
            </div>
            <div className="sidebar-content">
                {dbEntries.length === 0 ? (
                    <div style={{ padding: '20px 14px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
                            No databases open
                        </p>
                        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '6px' }} onClick={onOpenDatabase}>
                            Open Database
                        </button>
                        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onCreateDatabase}>
                            New Database
                        </button>
                    </div>
                ) : (
                    dbEntries.map(([dbPath, dbInfo]) => {
                        const dbNodeId = `db:${dbPath}`;
                        const isDbExpanded = expandedNodes.has(dbNodeId);
                        const isActive = activeDbPath === dbPath;

                        return (
                            <div key={dbPath}>
                                <div
                                    className={`tree-item ${isActive ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveDb(dbPath);
                                        toggleNode(dbNodeId);
                                    }}
                                    onContextMenu={(e) => handleDbContextMenu(e, dbPath)}
                                >
                                    <span className={`tree-chevron ${isDbExpanded ? 'open' : ''}`}>
                                        <ChevronIcon />
                                    </span>
                                    <span className="tree-item-icon" style={{ color: 'var(--accent-primary)' }}>
                                        <DatabaseIcon />
                                    </span>
                                    <span className="tree-item-label">{dbInfo.name}</span>
                                    <span className="tree-item-badge">{dbInfo.tables.length}</span>
                                </div>

                                {isDbExpanded && (
                                    <>
                                        {/* Tables */}
                                        {dbInfo.tables.map((table) => (
                                            <TableTreeItem
                                                key={table.name}
                                                table={table}
                                                dbPath={dbPath}
                                                expandedNodes={expandedNodes}
                                                toggleNode={toggleNode}
                                                onContextMenu={handleTableContextMenu}
                                                onColumnClick={handleColumnClick}
                                            />
                                        ))}

                                        {/* Views */}
                                        {dbInfo.views.length > 0 && (
                                            <div>
                                                <div
                                                    className="tree-item"
                                                    onClick={() => toggleNode(`views:${dbPath}`)}
                                                    style={{ paddingLeft: '30px' }}
                                                >
                                                    <span className={`tree-chevron ${expandedNodes.has(`views:${dbPath}`) ? 'open' : ''}`}>
                                                        <ChevronIcon />
                                                    </span>
                                                    <span className="tree-item-icon" style={{ color: 'var(--info)' }}>
                                                        <ViewIcon />
                                                    </span>
                                                    <span className="tree-item-label">Views</span>
                                                    <span className="tree-item-badge">{dbInfo.views.length}</span>
                                                </div>
                                                {expandedNodes.has(`views:${dbPath}`) &&
                                                    dbInfo.views.map((view) => (
                                                        <div
                                                            key={view.name}
                                                            className="tree-item"
                                                            style={{ paddingLeft: '62px' }}
                                                        >
                                                            <span className="tree-item-icon" style={{ color: 'var(--info)' }}>
                                                                <ViewIcon />
                                                            </span>
                                                            <span className="tree-item-label">{view.name}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

// Sub-component for table tree items
const TableTreeItem: React.FC<{
    table: TableInfo;
    dbPath: string;
    expandedNodes: Set<string>;
    toggleNode: (id: string) => void;
    onContextMenu: (e: React.MouseEvent, dbPath: string, tableName: string) => void;
    onColumnClick: (tableName: string, column: ColumnInfo) => void;
}> = ({ table, dbPath, expandedNodes, toggleNode, onContextMenu, onColumnClick }) => {
    const nodeId = `table:${dbPath}:${table.name}`;
    const isExpanded = expandedNodes.has(nodeId);

    return (
        <div>
            <div
                className="tree-item"
                style={{ paddingLeft: '30px' }}
                onClick={() => toggleNode(nodeId)}
                onContextMenu={(e) => onContextMenu(e, dbPath, table.name)}
            >
                <span className={`tree-chevron ${isExpanded ? 'open' : ''}`}>
                    <ChevronIcon />
                </span>
                <span className="tree-item-icon" style={{ color: 'var(--warning)' }}>
                    <TableIcon />
                </span>
                <span className="tree-item-label">{table.name}</span>
                <span className="tree-item-badge">{table.rowCount}</span>
            </div>

            {isExpanded &&
                table.columns.map((col) => (
                    <div
                        key={col.name}
                        className="tree-item"
                        style={{ paddingLeft: '62px' }}
                        onClick={() => onColumnClick(table.name, col)}
                    >
                        <span className="tree-item-icon">
                            {col.pk ? (
                                <span style={{ color: 'var(--warning)' }}>
                                    <KeyIcon />
                                </span>
                            ) : (
                                <span style={{ color: 'var(--text-muted)' }}>
                                    <ColumnIcon />
                                </span>
                            )}
                        </span>
                        <span className="tree-item-label">{col.name}</span>
                        {col.pk && <span className="col-pk">PK</span>}
                        <span className="col-type">{col.type}</span>
                    </div>
                ))}

            {isExpanded && table.indexes.length > 0 && (
                <div
                    className="tree-item"
                    style={{ paddingLeft: '62px', color: 'var(--text-muted)', fontSize: '11px' }}
                >
                    <span className="tree-item-icon" style={{ color: 'var(--text-muted)' }}>
                        <IndexIcon />
                    </span>
                    <span className="tree-item-label">
                        {table.indexes.length} index{table.indexes.length !== 1 ? 'es' : ''}
                    </span>
                </div>
            )}

            {isExpanded && table.foreignKeys.length > 0 && (
                <div
                    className="tree-item"
                    style={{ paddingLeft: '62px', color: 'var(--text-muted)', fontSize: '11px' }}
                >
                    <span className="tree-item-icon" style={{ color: 'var(--info)' }}>
                        <ForeignKeyIcon />
                    </span>
                    <span className="tree-item-label">
                        {table.foreignKeys.length} foreign key{table.foreignKeys.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </div>
    );
};
