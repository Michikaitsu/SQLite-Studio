# SQLite Studio

A professional desktop application for managing and modeling SQLite databases, developed with Electron, React, and TypeScript.

## Architecture Overview

The application follows a strict separation between the **Main Process** (Backend/Database) and the **Renderer Process** (UI/Frontend):

### 1. Main Process (`electron/`)
*   **Technology**: Electron (Node.js)
*   **Responsibility**:
    *   File system access (opening/saving .db and .sql files)
    *   SQLite database management via `sql.js` (WASM-based for maximum compatibility)
    *   Native menus and dialogs
*   **Communication**: Exposes IPC handlers that can be safely called by the renderer.
*   **Security**: `contextIsolation: true`, `nodeIntegration: false`. Access only via `preload.js` API.

### 2. Service Layer (`electron/services/`)
*   **DatabaseService**: Encapsulates all `sql.js` logic.
    *   Manages open database connections in memory.
    *   Executes SQL queries and maps results to typed objects.
    *   Handles schema introspection (tables, columns, indexes).
    *   Saves changes atomically back to the disk.

### 3. Shared Layer (`shared/`)
*   **Types**: Common TypeScript definitions for database objects (`TableInfo`, `ColumnInfo`) and IPC channels. Guarantees type safety between frontend and backend.

### 4. Renderer Process (`src/`)
*   **Technology**: React 18, Vite
*   **State Management**: `zustand` store (`src/store/app-store.ts`).
    *   Central store for database metadata, UI state (tabs, sidebar), and theme.
*   **UI Components**:
    *   Custom components without large UI libraries (CSS variables, Flex/Grid).
    *   **Monaco Editor**: For SQL editing with syntax highlighting.
    *   **React Flow**: For visual schema modeling (ER diagrams).
*   **Styling**: Modern CSS with CSS variables for theming (Dark/Light mode).

## Project Structure

```
sqlite-studio/
├── electron/               # Backend code
│   ├── main.ts             # Entry point
│   ├── preload.ts          # IPC Bridge
│   ├── menu.ts             # Native menus
│   ├── ipc/                # Message handlers
│   └── services/           # Business logic (SQLite)
├── src/                    # Frontend code
│   ├── components/         # React UI components
│   ├── store/              # Zustand state management
│   ├── styles/             # Global CSS
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── shared/                 # Shared types
│   └── types.ts
├── dist/                   # Frontend build output
├── dist-electron/          # Backend build output
└── release/                # Final executables (Installer)
```

## Technology Decisions

1.  **sql.js (WASM)** instead of `better-sqlite3`:
    *   Avoids native compilation issues (node-gyp/Python/C++ dependencies) on Windows.
    *   Enables portable builds without complex CI/CD pipelines.
    *   Performance is absolutely sufficient for desktop applications (in-memory operations).

2.  **Vite**:
    *   Extremely fast HMR (Hot Module Replacement) for development.
    *   Optimized production build.

3.  **Zustand**:
    *   More minimalist than Redux, but powerful enough for complex apps.
    *   No context provider wrapping needed ("Flux-like").

4.  **Monaco Editor**:
    *   The standard for code editors (VS Code engine). Provides best SQL support.

## Build & Distribution

The application is packaged with `electron-builder`.

### Prerequisites
*   Node.js >= 18 installed.

### Commands

*   **Development**: `npm run dev`
    *   Starts Vite server and compiles Electron code in watch mode.
*   **Build**: `npm run electron:build`
    *   Creates the final Windows installer (`.exe`) in the `release/` folder.

The build process:
1.  `npm run build:electron`: Compiles TS to JS (`dist-electron/`).
2.  `npm run build:renderer`: Builds the React app (`dist/`).
3.  `electron-builder`: Packages everything, copies `sql-wasm.wasm`, and creates the installer.
