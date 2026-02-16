import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/app-store';

export const ContextMenu: React.FC = () => {
    const { contextMenu, hideContextMenu } = useAppStore();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contextMenu && menuRef.current) {
            const menu = menuRef.current;
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let x = contextMenu.x;
            let y = contextMenu.y;

            if (x + rect.width > viewportWidth) {
                x = viewportWidth - rect.width - 8;
            }
            if (y + rect.height > viewportHeight) {
                y = viewportHeight - rect.height - 8;
            }

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
        }
    }, [contextMenu]);

    if (!contextMenu) return null;

    return (
        <>
            <div className="context-menu-overlay" onClick={hideContextMenu} />
            <div
                ref={menuRef}
                className="context-menu"
                style={{ left: contextMenu.x, top: contextMenu.y }}
            >
                {contextMenu.items.map((item, index) => {
                    if (item.separator) {
                        return <div key={index} className="context-menu-separator" />;
                    }
                    return (
                        <button
                            key={index}
                            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                            onClick={() => {
                                item.action();
                                hideContextMenu();
                            }}
                        >
                            <span>{item.label}</span>
                            {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                        </button>
                    );
                })}
            </div>
        </>
    );
};
