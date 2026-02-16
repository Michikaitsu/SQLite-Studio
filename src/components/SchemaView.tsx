import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    NodeTypes,
    Handle,
    Position,
    BackgroundVariant,
    MarkerType,
    getRectOfNodes,
    getTransformForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppStore } from '../store/app-store';
import type { TableInfo, ColumnInfo } from '../../shared/types';
import { toPng, toSvg } from 'html-to-image';

// ... inside SchemaView component
// Custom Table Node component for React Flow
const TableNodeComponent: React.FC<{ data: TableNodeData; selected: boolean }> = ({
    data,
    selected,
}) => {
    return (
        <div className={`table-node ${selected ? 'selected' : ''}`}>
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <div className="table-node-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
                <span>{data.tableName}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {data.rowCount} rows
                </span>
            </div>
            <div className="table-node-columns">
                {data.columns.map((col) => (
                    <div key={col.name} className="table-node-column">
                        {col.pk && <span className="pk-icon">🔑</span>}
                        {data.foreignKeyColumns.has(col.name) && <span className="fk-icon">🔗</span>}
                        <span className="col-name">{col.name}</span>
                        <span className="col-type-badge">{col.type}</span>
                        {col.notnull && (
                            <span style={{ fontSize: '9px', color: 'var(--warning)' }}>NN</span>
                        )}
                        {col.unique && (
                            <span style={{ fontSize: '9px', color: 'var(--info)' }}>UQ</span>
                        )}
                    </div>
                ))}
            </div>
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
        </div>
    );
};

interface TableNodeData {
    tableName: string;
    columns: ColumnInfo[];
    rowCount: number;
    foreignKeyColumns: Set<string>;
}

const nodeTypes: NodeTypes = {
    tableNode: TableNodeComponent,
};

export const SchemaView: React.FC = () => {
    const { activeDbPath, databases, theme, addToast, addTab } = useAppStore();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [generatedSql, setGeneratedSql] = useState<string | null>(null);

    const dbInfo = activeDbPath ? databases.get(activeDbPath) : null;

    const handleExport = useCallback((format: 'png' | 'svg') => {
        // We export the viewport to capture the actual content, but we transform it to fit the whole graph
        const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
        if (!viewportElement) return;

        // Calculate bounds of all nodes to determine the export size
        const nodesBounds = getRectOfNodes(nodes);
        const margin = 50;
        const width = nodesBounds.width + (margin * 2);
        const height = nodesBounds.height + (margin * 2);

        const exporter = format === 'png' ? toPng : toSvg;

        exporter(viewportElement, {
            backgroundColor: theme === 'dark' ? '#1e1e2e' : '#ffffff',
            width: width,
            height: height,
            style: {
                width: width.toString() + 'px',
                height: height.toString() + 'px',
                transform: `translate(${-nodesBounds.x + margin}px, ${-nodesBounds.y + margin}px) scale(1)`,
            },
            pixelRatio: format === 'png' ? 2 : 1, // High resolution for PNG
        })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `schema-export.${format}`;
                link.href = dataUrl;
                link.click();
                addToast({ type: 'success', message: `Schema exported as ${format.toUpperCase()}` });
            })
            .catch((err) => {
                console.error('Export failed:', err);
                addToast({ type: 'error', message: 'Failed to export schema' });
            });
    }, [nodes, theme, addToast]);

    // Build nodes and edges from database schema
    useEffect(() => {
        if (!dbInfo) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const COLS_PER_ROW = 3;
        const NODE_WIDTH = 260;
        const NODE_SPACING_X = 320;
        const NODE_SPACING_Y = 60;

        const newNodes: Node[] = dbInfo.tables.map((table, index) => {
            const col = index % COLS_PER_ROW;
            const row = Math.floor(index / COLS_PER_ROW);
            const estimatedHeight = 40 + table.columns.length * 26;

            const fkCols = new Set(table.foreignKeys.map((fk) => fk.from));

            return {
                id: table.name,
                type: 'tableNode',
                position: {
                    x: col * NODE_SPACING_X + 50,
                    y: row * (200 + NODE_SPACING_Y) + 50,
                },
                data: {
                    tableName: table.name,
                    columns: table.columns,
                    rowCount: table.rowCount,
                    foreignKeyColumns: fkCols,
                } as TableNodeData,
                draggable: true,
            };
        });

        const newEdges: Edge[] = [];
        dbInfo.tables.forEach((table) => {
            table.foreignKeys.forEach((fk) => {
                newEdges.push({
                    id: `${table.name}.${fk.from}->${fk.table}.${fk.to}`,
                    source: table.name,
                    target: fk.table,
                    label: `${fk.from} → ${fk.to}`,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: 'var(--accent-primary)',
                    },
                    labelStyle: {
                        fontSize: 10,
                        fill: 'var(--text-muted)',
                    },
                    labelBgStyle: {
                        fill: 'var(--bg-elevated)',
                        fillOpacity: 0.9,
                    },
                    labelBgPadding: [4, 2] as [number, number],
                    labelBgBorderRadius: 4,
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [dbInfo, setNodes, setEdges]);

    const handleGenerateSQL = useCallback(() => {
        if (!dbInfo) return;

        const sqlParts: string[] = [];

        dbInfo.tables.forEach((table) => {
            const colDefs = table.columns.map((col) => {
                const parts = [`  "${col.name}" ${col.type}`];
                if (col.pk) parts.push('PRIMARY KEY');
                if (col.notnull) parts.push('NOT NULL');
                if (col.unique) parts.push('UNIQUE');
                if (col.dflt_value !== null) parts.push(`DEFAULT ${col.dflt_value}`);
                return parts.join(' ');
            });

            // Foreign key constraints
            table.foreignKeys.forEach((fk) => {
                colDefs.push(
                    `  FOREIGN KEY ("${fk.from}") REFERENCES "${fk.table}" ("${fk.to}") ON DELETE ${fk.on_delete} ON UPDATE ${fk.on_update}`
                );
            });

            sqlParts.push(`CREATE TABLE "${table.name}" (\n${colDefs.join(',\n')}\n);`);
        });

        // Indexes
        dbInfo.tables.forEach((table) => {
            table.indexes.forEach((idx) => {
                const uniqueStr = idx.unique ? 'UNIQUE ' : '';
                const cols = idx.columns.map((c) => `"${c}"`).join(', ');
                sqlParts.push(`CREATE ${uniqueStr}INDEX "${idx.name}" ON "${table.name}" (${cols});`);
            });
        });

        // Views
        dbInfo.views.forEach((view) => {
            if (view.sql) {
                sqlParts.push(view.sql + ';');
            }
        });

        const fullSql = sqlParts.join('\n\n');
        setGeneratedSql(fullSql);
    }, [dbInfo]);

    const handleCopySqlToEditor = useCallback(() => {
        if (generatedSql) {
            const tabId = addTab({ title: 'Generated Schema' });
            useAppStore.getState().updateTabContent(tabId, generatedSql);
            useAppStore.getState().setActiveView('editor');
            addToast({ type: 'success', message: 'Schema SQL copied to new editor tab' });
        }
    }, [generatedSql, addTab, addToast]);

    if (!dbInfo) {
        return (
            <div className="empty-state">
                <div className="empty-state-title">No database selected</div>
                <p className="empty-state-text">Open a database to view its schema diagram.</p>
            </div>
        );
    }

    if (dbInfo.tables.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-title">Empty database</div>
                <p className="empty-state-text">This database has no tables yet. Create one using the SQL editor.</p>
            </div>
        );
    }

    return (
        <div className="schema-container">
            <div className="schema-toolbar">
                <div className="btn-group" style={{ display: 'flex', gap: '8px', marginRight: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => handleExport('png')} title="Export as PNG">
                        Export PNG
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleExport('svg')} title="Export as SVG">
                        Export SVG
                    </button>
                </div>
                <button className="btn btn-secondary" onClick={handleGenerateSQL}>
                    Generate SQL
                </button>
                {generatedSql && (
                    <button className="btn btn-primary" onClick={handleCopySqlToEditor}>
                        Open in Editor
                    </button>
                )}
            </div>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color={theme === 'dark' ? '#2a2a45' : '#d0d2da'}
                />
                <Controls
                    style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        borderRadius: '8px',
                    }}
                />
                <MiniMap
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                    }}
                    nodeColor={theme === 'dark' ? '#7c6ff7' : '#6c5ce7'}
                    maskColor={theme === 'dark' ? 'rgba(15,15,23,0.8)' : 'rgba(248,249,252,0.8)'}
                />
            </ReactFlow>

            {generatedSql && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px',
                        maxWidth: '400px',
                        maxHeight: '300px',
                        overflow: 'auto',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 5,
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        whiteSpace: 'pre-wrap',
                        color: 'var(--text-primary)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                        }}
                    >
                        <strong>Generated SQL</strong>
                        <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => setGeneratedSql(null)}
                        >
                            ✕
                        </button>
                    </div>
                    {generatedSql}
                </div>
            )}
        </div>
    );
};
