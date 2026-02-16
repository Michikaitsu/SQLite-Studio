import React, { useCallback, useRef, useEffect, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useAppStore } from '../store/app-store';
import type { editor } from 'monaco-editor';

export const EditorPanel: React.FC = () => {
    const { tabs, activeTabId, updateTabContent, theme, activeDbPath, databases } = useAppStore();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const activeTab = tabs.find((t) => t.id === activeTabId);

    const [monacoInstance, setMonacoInstance] = useState<any>(null);

    const handleEditorMount: OnMount = useCallback(
        (editorInstance, monaco) => {
            editorRef.current = editorInstance;
            setMonacoInstance(monaco);
            editorInstance.focus();
        },
        []
    );

    useEffect(() => {
        if (!monacoInstance) return;

        const disposable = monacoInstance.languages.registerCompletionItemProvider('sql', {
            provideCompletionItems: (model: any, position: any) => {
                const { activeDbPath, databases } = useAppStore.getState();
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions: any[] = [];
                // Keywords
                const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET'];
                keywords.forEach(kw => {
                    suggestions.push({ label: kw, kind: monacoInstance.languages.CompletionItemKind.Keyword, insertText: kw, range });
                });

                if (activeDbPath) {
                    const dbInfo = databases.get(activeDbPath);
                    if (dbInfo) {
                        dbInfo.tables.forEach(table => {
                            suggestions.push({ label: table.name, kind: monacoInstance.languages.CompletionItemKind.Struct, insertText: `"${table.name}"`, detail: `Table`, range });
                            table.columns.forEach(col => {
                                suggestions.push({ label: `${table.name}.${col.name}`, kind: monacoInstance.languages.CompletionItemKind.Field, insertText: `"${col.name}"`, detail: col.type, range });
                                suggestions.push({ label: col.name, kind: monacoInstance.languages.CompletionItemKind.Field, insertText: `"${col.name}"`, detail: `${table.name}.${col.name}`, range });
                            });
                        });
                    }
                }
                return { suggestions };
            }
        });

        return () => disposable.dispose();
    }, [monacoInstance]);

    // Instead of complex refactoring, let's keep it in handleEditorMount but MAKE SURE TO DISPOSE.
    // AND use getState() to avoid stale closures.

    /* 
       Wait, I can't easily dispose from handleEditorMount because I can't return a cleanup function there.
       I will use a ref to store the disposable.
    */


    const handleChange = useCallback(
        (value: string | undefined) => {
            if (activeTabId && value !== undefined) {
                updateTabContent(activeTabId, value);
            }
        },
        [activeTabId, updateTabContent]
    );

    if (!activeTab) return null;

    return (
        <div className="editor-container">
            <div className="editor-wrapper">
                <Editor
                    key={activeTab.id}
                    height="100%"
                    language="sql"
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    value={activeTab.content}
                    onChange={handleChange}
                    onMount={handleEditorMount}
                    options={{
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        lineNumbers: 'on',
                        roundedSelection: true,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                        padding: { top: 10 },
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        acceptSuggestionOnEnter: 'on',
                        renderLineHighlight: 'gutter',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        contextmenu: true,
                        bracketPairColorization: { enabled: true },
                    }}
                />
            </div>
        </div>
    );
};
