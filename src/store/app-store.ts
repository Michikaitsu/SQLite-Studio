import { create } from 'zustand';
import type { DatabaseInfo, QueryResult, TabState, Theme } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
    // Theme
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;

    // Sidebar
    sidebarVisible: boolean;
    toggleSidebar: () => void;

    // Active View
    activeView: 'editor' | 'schema';
    setActiveView: (view: 'editor' | 'schema') => void;

    // Databases
    databases: Map<string, DatabaseInfo>;
    activeDbPath: string | null;
    setActiveDb: (path: string | null) => void;
    addDatabase: (info: DatabaseInfo) => void;
    removeDatabase: (path: string) => void;
    updateDatabase: (info: DatabaseInfo) => void;

    // Tabs
    tabs: TabState[];
    activeTabId: string | null;
    addTab: (tab?: Partial<TabState>) => string;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTabContent: (id: string, content: string) => void;
    updateTabTitle: (id: string, title: string) => void;
    updateTabDirty: (id: string, isDirty: boolean) => void;
    updateTabFilePath: (id: string, filePath: string) => void;

    // Query Results
    queryResults: Map<string, QueryResult>;
    setQueryResult: (tabId: string, result: QueryResult) => void;
    clearQueryResult: (tabId: string) => void;

    // Context Menu
    contextMenu: {
        visible: boolean;
        x: number;
        y: number;
        items: ContextMenuItem[];
    } | null;
    showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
    hideContextMenu: () => void;

    // Expanded tree nodes
    expandedNodes: Set<string>;
    toggleNode: (nodeId: string) => void;

    // Results panel height
    resultsPanelHeight: number;
    setResultsPanelHeight: (height: number) => void;

    // Toasts
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    removeToast: (id: string) => void;
}

export interface ContextMenuItem {
    label: string;
    icon?: string;
    shortcut?: string;
    danger?: boolean;
    separator?: boolean;
    action: () => void;
}

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

export const useAppStore = create<AppState>((set, get) => ({
    // Theme
    theme: 'dark',
    setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
    },
    toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
    },

    // Sidebar
    sidebarVisible: true,
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

    // Active View
    activeView: 'editor',
    setActiveView: (view) => set({ activeView: view }),

    // Databases
    databases: new Map(),
    activeDbPath: null,
    setActiveDb: (path) => set({ activeDbPath: path }),
    addDatabase: (info) =>
        set((state) => {
            const newMap = new Map(state.databases);
            newMap.set(info.path, info);
            return {
                databases: newMap,
                activeDbPath: state.activeDbPath || info.path,
            };
        }),
    removeDatabase: (path) =>
        set((state) => {
            const newMap = new Map(state.databases);
            newMap.delete(path);
            const newActive =
                state.activeDbPath === path
                    ? (newMap.keys().next().value ?? null)
                    : state.activeDbPath;
            return { databases: newMap, activeDbPath: newActive };
        }),
    updateDatabase: (info) =>
        set((state) => {
            const newMap = new Map(state.databases);
            newMap.set(info.path, info);
            return { databases: newMap };
        }),

    // Tabs
    tabs: [],
    activeTabId: null,
    addTab: (partial) => {
        const id = uuidv4();
        const tab: TabState = {
            id,
            title: partial?.title || 'Untitled',
            content: partial?.content || '',
            filePath: partial?.filePath,
            isDirty: false,
            language: partial?.language || 'sql',
        };
        set((state) => ({
            tabs: [...state.tabs, tab],
            activeTabId: id,
        }));
        return id;
    },
    closeTab: (id) =>
        set((state) => {
            const idx = state.tabs.findIndex((t) => t.id === id);
            const newTabs = state.tabs.filter((t) => t.id !== id);
            let newActive = state.activeTabId;
            if (state.activeTabId === id) {
                if (newTabs.length > 0) {
                    newActive = newTabs[Math.min(idx, newTabs.length - 1)].id;
                } else {
                    newActive = null;
                }
            }
            const newResults = new Map(state.queryResults);
            newResults.delete(id);
            return { tabs: newTabs, activeTabId: newActive, queryResults: newResults };
        }),
    setActiveTab: (id) => set({ activeTabId: id }),
    updateTabContent: (id, content) =>
        set((state) => ({
            tabs: state.tabs.map((t) =>
                t.id === id ? { ...t, content, isDirty: true } : t
            ),
        })),
    updateTabTitle: (id, title) =>
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
        })),
    updateTabDirty: (id, isDirty) =>
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, isDirty } : t)),
        })),
    updateTabFilePath: (id, filePath) =>
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, filePath } : t)),
        })),

    // Query Results
    queryResults: new Map(),
    setQueryResult: (tabId, result) =>
        set((state) => {
            const newMap = new Map(state.queryResults);
            newMap.set(tabId, result);
            return { queryResults: newMap };
        }),
    clearQueryResult: (tabId) =>
        set((state) => {
            const newMap = new Map(state.queryResults);
            newMap.delete(tabId);
            return { queryResults: newMap };
        }),

    // Context Menu
    contextMenu: null,
    showContextMenu: (x, y, items) =>
        set({ contextMenu: { visible: true, x, y, items } }),
    hideContextMenu: () => set({ contextMenu: null }),

    // Expanded nodes
    expandedNodes: new Set(),
    toggleNode: (nodeId) =>
        set((state) => {
            const newSet = new Set(state.expandedNodes);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return { expandedNodes: newSet };
        }),

    // Results panel
    resultsPanelHeight: 250,
    setResultsPanelHeight: (height) => set({ resultsPanelHeight: height }),

    // Toasts
    toasts: [],
    addToast: (toast) => {
        const id = uuidv4();
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));
        setTimeout(() => {
            get().removeToast(id);
        }, 4000);
    },
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
}));
