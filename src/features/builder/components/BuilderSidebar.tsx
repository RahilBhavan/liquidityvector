import { DragEvent } from 'react';
import { ArrowRightLeft, Wallet, Link as LinkIcon, PiggyBank, Play, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BuilderSidebar() {
    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/label', label);
        event.dataTransfer.effectAllowed = 'move';
    };

    const toolGroups = [
        {
            title: "Assets",
            items: [
                { type: 'wallet', label: 'Wallet', icon: Wallet, color: 'bg-sumi-black' },
            ]
        },
        {
            title: "Actions",
            items: [
                { type: 'bridge', label: 'Bridge', icon: LinkIcon, color: 'bg-intl-orange' },
                { type: 'swap', label: 'Swap', icon: ArrowRightLeft, color: 'bg-cobalt-blue' },
            ]
        },
        {
            title: "Yield",
            items: [
                { type: 'pool', label: 'Liquidity Pool', icon: PiggyBank, color: 'bg-matchbox-green' },
            ]
        }
    ];

    return (
        <div className="w-72 border-r-2 border-sumi-black/10 bg-white p-6 flex flex-col h-full z-20 shadow-xl shadow-sumi-black/5">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-sumi-black text-white flex items-center justify-center rounded">
                        <Plus className="w-5 h-5" />
                    </div>
                    <h3 className="font-sans text-xl font-bold uppercase tracking-tight text-sumi-black">Toolkit</h3>
                </div>
                <p className="text-xs text-sumi-black/60 font-mono leading-relaxed">
                    Drag components to the canvas to build your yield strategy.
                </p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                {toolGroups.map((group) => (
                    <div key={group.title}>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-sumi-black/40 mb-3">{group.title}</h4>
                        <div className="space-y-2">
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.label}
                                        onDragStart={(event) => onDragStart(event, item.type, item.label)}
                                        draggable
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border-2 border-transparent hover:border-sumi-black cursor-grab transition-all bg-paper-white group hover:bg-white hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none",
                                        )}
                                    >
                                        <div className={cn("p-2 rounded text-white transition-transform group-hover:scale-110", item.color)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-sm text-sumi-black">
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-sumi-black/10">
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4">
                    <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                        <strong>Pro Tip:</strong> connect a Wallet to a Bridge, then to a Pool to verify cross-chain yield paths.
                    </p>
                </div>
            </div>
        </div>
    );
}
