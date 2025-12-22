import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, Wallet, Link as LinkIcon, PiggyBank, Activity, Droplets, AlertCircle } from 'lucide-react';

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
            bridgeFee?: number;
            slippage?: number;
            poolDepth?: string;
            impermanentLoss?: string;
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
    const hasSimulation = !!data.simulationData;

    return (
        <div className={cn(
            "w-[280px] bg-white rounded-lg border-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden group",
            selected ? "border-sumi-black ring-1 ring-sumi-black" : "border-sumi-black",
            "hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]"
        )}>
            {/* Header */}
            <div className={cn("p-3 flex items-center gap-3 border-b-2 border-sumi-black", getColor(data.type))}>
                <div className="p-1.5 bg-black/20 rounded-md">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase font-bold tracking-widest opacity-80 leading-none mb-1">{data.type}</div>
                    <div className="font-bold text-base truncate leading-none">{data.label}</div>
                </div>
                {data.network && (
                    <div className="ml-auto text-[10px] font-bold font-mono bg-black/20 px-2 py-1 rounded border border-white/10 uppercase">
                        {data.network}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-3 bg-paper-white space-y-3">
                <p className="text-xs font-medium text-sumi-black/70 leading-relaxed border-b border-sumi-black/10 pb-3">
                    {data.details || "Configure this action..."}
                </p>

                {hasSimulation ? (
                    <div className="grid grid-cols-2 gap-2">
                        {/* Primary Yield/Metric */}
                        {data.simulationData?.apy !== undefined && (
                            <div className="col-span-2 bg-white border-2 border-matchbox-green/20 p-2 rounded flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-matchbox-green">Proj. APY</span>
                                <span className="text-lg font-bold font-mono text-matchbox-green">{data.simulationData.apy}%</span>
                            </div>
                        )}

                        {/* Cost Metrics Group */}
                        <div className="col-span-2 grid grid-cols-3 gap-1">
                            {data.simulationData?.gas !== undefined && (
                                <div className="bg-sumi-black/5 p-1.5 rounded text-center">
                                    <span className="block text-[8px] font-bold uppercase text-sumi-black/50 mb-0.5">Gas</span>
                                    <span className="block text-xs font-bold font-mono">${data.simulationData.gas}</span>
                                </div>
                            )}
                            {data.simulationData?.bridgeFee !== undefined && (
                                <div className="bg-intl-orange/10 p-1.5 rounded text-center border border-intl-orange/20">
                                    <span className="block text-[8px] font-bold uppercase text-intl-orange mb-0.5">Fee</span>
                                    <span className="block text-xs font-bold font-mono text-intl-orange">${data.simulationData.bridgeFee}</span>
                                </div>
                            )}
                            {data.simulationData?.slippage !== undefined && (
                                <div className="bg-sumi-black/5 p-1.5 rounded text-center">
                                    <span className="block text-[8px] font-bold uppercase text-sumi-black/50 mb-0.5">Slip</span>
                                    <span className="block text-xs font-bold font-mono">{data.simulationData.slippage}%</span>
                                </div>
                            )}
                        </div>

                        {/* Secondary Metrics */}
                        {data.simulationData?.poolDepth && (
                            <div className="col-span-2 flex items-center justify-between px-2 py-1 bg-white border border-sumi-black/10 rounded">
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-sumi-black/60">
                                    <Droplets className="w-3 h-3" /> Depth
                                </span>
                                <span className="text-xs font-mono font-bold">{data.simulationData.poolDepth}</span>
                            </div>
                        )}

                        {data.simulationData?.risk && (
                            <div className={cn("col-span-2 p-1.5 rounded flex items-center gap-2 justify-center border",
                                data.simulationData.risk === 'High' ? "bg-red-50 border-red-200 text-red-700" :
                                    data.simulationData.risk === 'Medium' ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            )}>
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase">{data.simulationData.risk} Risk</span>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="h-16 flex items-center justify-center border-2 border-dashed border-sumi-black/10 rounded bg-sumi-black/[0.02]">
                        <span className="text-[10px] font-bold uppercase text-sumi-black/30">No Simulation Data</span>
                    </div>
                )}
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-sumi-black !border-2 !border-white !-left-2 transition-transform hover:scale-125"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-sumi-black !border-2 !border-white !-right-2 transition-transform hover:scale-125"
            />
        </div>
    );
};

export default memo(ActionNode);

