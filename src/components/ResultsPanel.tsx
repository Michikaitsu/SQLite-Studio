import React from 'react';
import { useAppStore } from '../store/app-store';
import type { QueryResult } from '../../shared/types';

export const ResultsPanel: React.FC = () => {
    const { activeTabId, queryResults, resultsPanelHeight } = useAppStore();

    if (!activeTabId) return null;

    const result = queryResults.get(activeTabId);
    if (!result) return null;

    return (
        <div className="results-panel" style={{ height: resultsPanelHeight }}>
            <div className="results-header">
                <div className="results-header-left">
                    <span className="results-tab active">Results</span>
                </div>
                <div className="results-stats">
                    {result.type === 'select' && result.rows && (
                        <span>{result.rows.length} rows</span>
                    )}
                    {result.type === 'mutation' && (
                        <span>{result.affectedRows} affected</span>
                    )}
                    <span> · {result.executionTime.toFixed(1)}ms</span>
                </div>
            </div>
            <div className="results-body">
                <ResultContent result={result} />
            </div>
        </div>
    );
};

const ResultContent: React.FC<{ result: QueryResult }> = ({ result }) => {
    if (result.type === 'error') {
        return <div className="error-display">⚠ {result.error}</div>;
    }

    if (result.type === 'select' && result.columns && result.rows) {
        return (
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                            {result.columns.map((col) => (
                                <th key={col}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {result.rows.map((row, i) => (
                            <tr key={i}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                                {result.columns!.map((col) => {
                                    const val = row[col];
                                    const isNull = val === null || val === undefined;
                                    return (
                                        <td key={col} className={isNull ? 'null-value' : ''}>
                                            {isNull ? 'NULL' : String(val)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (result.type === 'mutation') {
        return (
            <div className="mutation-result success">
                <div className="icon">✓</div>
                <div>
                    <div className="message">Query executed successfully</div>
                    <div className="details">
                        {result.affectedRows} row{result.affectedRows !== 1 ? 's' : ''} affected
                        · {result.executionTime.toFixed(1)}ms
                    </div>
                </div>
            </div>
        );
    }

    if (result.type === 'ddl') {
        return (
            <div className="mutation-result success">
                <div className="icon">✓</div>
                <div>
                    <div className="message">DDL statement executed successfully</div>
                    <div className="details">{result.executionTime.toFixed(1)}ms</div>
                </div>
            </div>
        );
    }

    return null;
};
