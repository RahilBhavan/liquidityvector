import { DragEvent } from 'react';
import { ArrowRightLeft, Wallet, Link as LinkIcon, PiggyBank, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BuilderSidebar() {
    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/label', label);
        event.dataTransfer.effectAllowed = 'move';
    };

    const items = [
        { type: 'wallet', label: 'Source Wallet', icon: Wallet, color: 'bg-sumi-black' },
        { type: 'bridge', label: 'Cross-Chain Bridge', icon: LinkIcon, color: 'bg-intl-orange' },
        { type: 'swap', label: 'Token Swap', icon: ArrowRightLeft, color: 'bg-cobalt-blue' },
        { type: 'pool', label: 'Yield Pool', icon: PiggyBank, color: 'bg-matchbox-green' },
    ];

    return (
        <div className="w-64 border-r-2 border-sumi-black/10 bg-white p-6 flex flex-col h-full">
            <div className="mb-8">
                <h3 className="font-sans text-xl font-bold uppercase tracking-tight text-sumi-black mb-1">Tools</h3>
                <p className="text-xs text-sumi-black/60 font-mono">Drag to canvas to build</p>
            </div>

            <div className="space-y-3 flex-1">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.label}
                            onDragStart={(event) => onDragStart(event, item.type, item.label)}
                            draggable
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border border-sumi-black/10 cursor-grab hover:shadow-md hover:border-sumi-black transition-all bg-white group",
                            )}
                        >
                            <div className={cn("p-2 rounded text-white transition-colors", item.color)}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm text-sumi-black group-hover:text-cobalt-blue transition-colors">
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-auto pt-6 border-t border-sumi-black/10">
                <button className="w-full py-3 bg-cobalt-blue text-white font-bold uppercase rounded-lg shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Simulate
                </button>
            </div>
        </div>
    );
}
