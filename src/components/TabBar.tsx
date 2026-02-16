import React from 'react';
import { useAppStore } from '../store/app-store';
import { CloseIcon, PlusIcon } from './Icons';

export const TabBar: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, closeTab, addTab, activeView, setActiveView } =
        useAppStore();

    return (
        <div>
            <div className="view-switcher">
                <button
                    className={`view-switch-btn ${activeView === 'editor' ? 'active' : ''}`}
                    onClick={() => setActiveView('editor')}
                >
                    SQL Editor
                </button>
                <button
                    className={`view-switch-btn ${activeView === 'schema' ? 'active' : ''}`}
                    onClick={() => setActiveView('schema')}
                >
                    Schema Designer
                </button>
            </div>

            {activeView === 'editor' && (
                <div className="tab-bar">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.isDirty && <span className="tab-dirty" />}
                            <span className="tab-label">{tab.title}</span>
                            <button
                                className="tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    ))}
                    <button
                        className="tab-add"
                        onClick={() => addTab({ title: `Query ${tabs.length + 1}` })}
                        title="New Query Tab"
                    >
                        <PlusIcon />
                    </button>
                </div>
            )}
        </div>
    );
};
