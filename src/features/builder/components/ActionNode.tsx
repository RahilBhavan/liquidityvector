import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, Wallet, Link as LinkIcon, PiggyBank, Activity } from 'lucide-react';

export type ActionType = 'wallet' | 'swap' | 'bridge' | 'pool' | 'trigger';

interface ActionNodeProps {
    data: {
        label: string;
        type: ActionType;
        details?: string;
        network?: string;
        simulationData?: {
            apy?: number;
            gas?: number;
            time?: number;
            risk?: 'Low' | 'Medium' | 'High';
        };
    };
    selected?: boolean;
}

const getIcon = (type: ActionType) => {
    switch (type) {
        case 'wallet': return Wallet;
        case 'swap': return ArrowRightLeft;
        case 'bridge': return LinkIcon;
        case 'pool': return PiggyBank;
        case 'trigger': return Activity;
        default: return Activity;
    }
};

const getColor = (type: ActionType) => {
    switch (type) {
        case 'wallet': return 'bg-sumi-black text-white';
        case 'swap': return 'bg-cobalt-blue text-white';
        case 'bridge': return 'bg-intl-orange text-white';
        case 'pool': return 'bg-matchbox-green text-white';
        default: return 'bg-white text-sumi-black';
    }
};

const ActionNode = ({ data, selected }: ActionNodeProps) => {
    const Icon = getIcon(data.type);

    return (
        <div className={cn(
            "w-[250px] bg-white rounded-lg border-2 shadow-sm transition-all relative overflow-hidden",
            selected ? "border-sumi-black ring-2 ring-sumi-black/20" : "border-sumi-black/20",
            "hover:shadow-md hover:border-sumi-black/50"
        )}>
            {/* Header */}
            <div className={cn("p-3 flex items-center gap-3", getColor(data.type))}>
                <div className="p-1.5 bg-white/20 rounded-md">
                    <Icon className="w-4 h-4" />
                </div>
                <div>
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">{data.type}</div>
                    <div className="font-bold text-sm">{data.label}</div>
                </div>
                {data.network && (
                    <div className="ml-auto text-[10px] font-mono bg-black/20 px-2 py-0.5 rounded">
                        {data.network}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-3 bg-paper-white space-y-2">
                <p className="text-xs font-mono text-sumi-black/70">
                    {data.details || "Configure this action..."}
                </p>

                {data.simulationData && (
                    <div className="pt-2 border-t border-sumi-black/10 grid grid-cols-2 gap-2">
                        {data.simulationData.apy !== undefined && (
                            <div className="bg-matchbox-green/10 p-1.5 rounded">
                                <span className="block text-[8px] font-bold uppercase text-matchbox-green">APY</span>
                                <span className="block text-xs font-bold font-mono">{data.simulationData.apy}%</span>
                            </div>
                        )}
                        {data.simulationData.gas !== undefined && (
                            <div className="bg-sumi-black/5 p-1.5 rounded">
                                <span className="block text-[8px] font-bold uppercase text-sumi-black/60">Gas</span>
                                <span className="block text-xs font-bold font-mono">${data.simulationData.gas}</span>
                            </div>
                        )}
                        {data.simulationData.time !== undefined && (
                            <div className="bg-sumi-black/5 p-1.5 rounded">
                                <span className="block text-[8px] font-bold uppercase text-sumi-black/60">Time</span>
                                <span className="block text-xs font-bold font-mono">{data.simulationData.time}m</span>
                            </div>
                        )}
                        {data.simulationData.risk && (
                            <div className={cn("p-1.5 rounded",
                                data.simulationData.risk === 'High' ? "bg-intl-orange/10 text-intl-orange" :
                                    data.simulationData.risk === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                                <span className="block text-[8px] font-bold uppercase">Risk</span>
                                <span className="block text-xs font-bold font-mono">{data.simulationData.risk}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-sumi-black border-2 border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-sumi-black border-2 border-white"
            />
        </div>
    );
};

export default memo(ActionNode);
