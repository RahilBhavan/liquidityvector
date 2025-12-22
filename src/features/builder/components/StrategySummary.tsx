import { Minus, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VScoreResult } from '@/lib/utils/vScore';

interface StrategySummaryProps {
    nodes: any[];
}

export function StrategySummary({ nodes }: StrategySummaryProps) {
    // Calculate totals based on nodes
    const hasPool = nodes.some(n => n.data.type === 'pool');

    // Aggregate Simulation Data
    const totalGas = nodes.reduce((acc, node) => acc + (parseFloat(node.data.simulationData?.gas || '0') || 0), 0);
    const totalFees = nodes.reduce((acc, node) => acc + (parseFloat(node.data.simulationData?.bridgeFee || '0') || 0), 0);
    const avgApy = nodes.reduce((acc, node) => acc + (parseFloat(node.data.simulationData?.apy || '0') || 0), 0); // Simplified avg

    // Aggregate V-Score Logic
    // In a real app, we might weigh this by capital allocation. For now, we take the lowest score (weakest link principle).
    const scores: VScoreResult[] = nodes
        .filter(n => n.data.simulationData?.vScore)
        .map(n => n.data.simulationData.vScore);

    const lowestScore = scores.length > 0
        ? scores.reduce((prev, curr) => prev.total < curr.total ? prev : curr)
        : { total: 10, breakdown: { base: 10, tvlFactor: 0, auditFactor: 0, timeFactor: 0, exploitPenalty: 0 } };

    const isProfitable = avgApy > 0;

    if (nodes.length === 0) return null;

    return (
        <div className="absolute right-6 top-6 w-80 space-y-4 z-10 font-sans">
            {/* Efficiency Card */}
            <div className="neo-card overflow-hidden">
                <div className="bg-sumi-black p-4 text-white flex items-center justify-between">
                    <h3 className="font-bold uppercase tracking-wide text-sm">Strategy Analysis</h3>
                    <TrendingUp className={cn("w-4 h-4", isProfitable ? "text-matchbox-green" : "text-intl-orange")} />
                </div>

                <div className="p-4 space-y-4">
                    {/* Metrics */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-sumi-black/70">
                                <Plus className="w-3 h-3" /> Yield Potential
                            </span>
                            <span className="font-bold font-mono text-matchbox-green">
                                {hasPool ? `~${avgApy.toFixed(2)}% APY` : '--'}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-sumi-black/70">
                                <Minus className="w-3 h-3" /> Est. Cost
                            </span>
                            <span className="font-bold font-mono text-intl-orange">
                                -${(totalGas + totalFees).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* V-Score Safety Card */}
            <div className="neo-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-sumi-black/60">V-SCORE SAFETY</span>
                    <span className={cn("font-bold text-3xl",
                        lowestScore.total >= 8 ? "text-matchbox-green" :
                            lowestScore.total >= 5 ? "text-amber-500" : "text-intl-orange"
                    )}>
                        {lowestScore.total.toFixed(1)}
                    </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-dashed border-sumi-black/20 font-mono text-xs">
                    <div className="flex justify-between text-sumi-black/60">
                        <span>Base:</span>
                        <span>{lowestScore.breakdown.base.toFixed(1)}</span>
                    </div>
                    {lowestScore.breakdown.tvlFactor !== 0 && (
                        <div className="flex justify-between text-intl-orange">
                            <span>TVL Depth:</span>
                            <span>{lowestScore.breakdown.tvlFactor.toFixed(1)}</span>
                        </div>
                    )}
                    {lowestScore.breakdown.auditFactor !== 0 && (
                        <div className="flex justify-between text-intl-orange">
                            <span>Audit Risk:</span>
                            <span>{lowestScore.breakdown.auditFactor.toFixed(1)}</span>
                        </div>
                    )}
                    {lowestScore.breakdown.timeFactor !== 0 && (
                        <div className="flex justify-between text-sumi-black/60">
                            <span>Time Bonus:</span>
                            <span>{lowestScore.breakdown.timeFactor > 0 ? '+' : ''}{lowestScore.breakdown.timeFactor.toFixed(1)}</span>
                        </div>
                    )}
                    {lowestScore.breakdown.exploitPenalty !== 0 && (
                        <div className="flex justify-between text-red-600 font-bold">
                            <span>Past Exploits:</span>
                            <span>{lowestScore.breakdown.exploitPenalty.toFixed(1)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Warnings */}
            {!hasPool && (
                <div className="bg-amber-100 p-3 rounded border border-amber-200 flex gap-2 items-start shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-tight font-medium">
                        <strong>Missing Yield Source:</strong> Add a Pool to generate returns.
                    </p>
                </div>
            )}
        </div>
    );
}
