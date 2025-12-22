import { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface SavedStrategy {
    id: string;
    name: string;
    date: number;
    nodeCount: number;
    preview: string; // JSON string
}

interface StrategyManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    onLoad: (strategy: SavedStrategy) => void;
    currentNodesCount: number;
}

export function StrategyManagerModal({ isOpen, onClose, onSave, onLoad, currentNodesCount }: StrategyManagerModalProps) {
    const [mode, setMode] = useState<'save' | 'load'>('save');
    const [name, setName] = useState('');
    const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Load strategies from local storage
            try {
                const stored = localStorage.getItem('lv_strategies');
                if (stored) {
                    setSavedStrategies(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Failed to load strategies", e);
            }
        }
    }, [isOpen]);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = savedStrategies.filter(s => s.id !== id);
        setSavedStrategies(updated);
        localStorage.setItem('lv_strategies', JSON.stringify(updated));
    };

    const handleSaveClick = () => {
        if (!name.trim()) return;
        onSave(name);
        onClose();
        setName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumi-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border-2 border-sumi-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b-2 border-sumi-black bg-sumi-black text-white flex justify-between items-center">
                    <h2 className="font-bold uppercase tracking-wider flex items-center gap-2">
                        {mode === 'save' ? <Save className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                        {mode === 'save' ? 'Save Strategy' : 'Load Strategy'}
                    </h2>
                    <button onClick={onClose} className="hover:text-intl-orange transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b-2 border-sumi-black">
                    <button
                        onClick={() => setMode('save')}
                        className={cn("flex-1 p-3 font-bold uppercase text-xs hover:bg-sumi-black/5 transition-colors", mode === 'save' ? "bg-matchbox-green/20" : "")}
                    >
                        Save Current
                    </button>
                    <button
                        onClick={() => setMode('load')}
                        className={cn("flex-1 p-3 font-bold uppercase text-xs hover:bg-sumi-black/5 transition-colors", mode === 'load' ? "bg-cobalt-blue/20" : "")}
                    >
                        Load Library
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    {mode === 'save' ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-sumi-black/60">Strategy Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Yield Farm Alpha"
                                    className="w-full p-3 border-2 border-sumi-black rounded bg-paper-white font-mono focus:outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transition-shadow"
                                    autoFocus
                                />
                            </div>

                            <div className="bg-sumi-black/5 p-4 rounded border border-sumi-black/10">
                                <div className="text-xs font-bold text-sumi-black/60 uppercase mb-2">Current State</div>
                                <div className="flex items-center gap-2 text-sm font-mono">
                                    <div className="w-2 h-2 rounded-full bg-matchbox-green" />
                                    {currentNodesCount} Nodes in configuration
                                </div>
                            </div>

                            <button
                                onClick={handleSaveClick}
                                disabled={!name.trim()}
                                className="w-full py-3 bg-matchbox-green text-white border-2 border-sumi-black font-bold uppercase tracking-wider hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save to Library
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {savedStrategies.length === 0 ? (
                                <div className="text-center py-10 text-sumi-black/40 font-mono italic text-sm">
                                    No saved strategies found.
                                </div>
                            ) : (
                                savedStrategies.map((strategy) => (
                                    <div
                                        key={strategy.id}
                                        onClick={() => { onLoad(strategy); onClose(); }}
                                        className="group relative p-3 border-2 border-sumi-black/10 hover:border-sumi-black rounded cursor-pointer transition-all hover:bg-white bg-paper-white"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-sumi-black uppercase text-sm group-hover:underline decoration-2 underline-offset-2 decoration-cobalt-blue">
                                                    {strategy.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-sumi-black/60 font-mono">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(strategy.date).toLocaleDateString()}
                                                    <span className="text-sumi-black/20">|</span>
                                                    {strategy.nodeCount} nodes
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(strategy.id, e)}
                                                className="p-1.5 text-sumi-black/40 hover:text-intl-orange hover:bg-intl-orange/10 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
