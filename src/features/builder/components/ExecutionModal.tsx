import { useState, useEffect } from 'react';
import { X, CheckCircle2, Loader2, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Node } from '@xyflow/react';

interface ExecutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
}

interface TransactionStep {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'signing' | 'broadcasting' | 'confirmed';
    hash?: string;
}

export function ExecutionModal({ isOpen, onClose, nodes }: ExecutionModalProps) {
    const [steps, setSteps] = useState<TransactionStep[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Generate steps from nodes when opened
    useEffect(() => {
        if (isOpen && nodes.length > 0) {
            const newSteps: TransactionStep[] = [];

            // Naive ordering: just filter specifically actionable nodes
            // In a real app, we'd traverse the DAG (Directed Acyclic Graph)
            nodes.forEach((node, index) => {
                if (node.data.type === 'bridge') {
                    newSteps.push({
                        id: `step-${index}-approve`,
                        title: `Approve USDC Spend`,
                        description: `Allow Stargate to spend your USDC`,
                        status: 'pending'
                    });
                    newSteps.push({
                        id: `step-${index}-bridge`,
                        title: `Bridge to ${node.data.network || 'Destination'}`,
                        description: `Initiate cross-chain transfer via ${node.data.label}`,
                        status: 'pending'
                    });
                } else if (node.data.type === 'swap') {
                    newSteps.push({
                        id: `step-${index}-swap`,
                        title: `Execute Swap`,
                        description: `Swap tokens via ${node.data.label}`,
                        status: 'pending'
                    });
                } else if (node.data.type === 'pool') {
                    newSteps.push({
                        id: `step-${index}-deposit`,
                        title: `Deposit Liquidity`,
                        description: `Supply assets to ${node.data.label}`,
                        status: 'pending'
                    });
                }
            });

            if (newSteps.length === 0) {
                newSteps.push({
                    id: 'step-empty',
                    title: 'No Actions Detected',
                    description: 'Add Bridge, Swap, or Pool nodes to deploy.',
                    status: 'pending' // effectively disabled
                });
            }

            setSteps(newSteps);
            setCurrentStepIndex(0);
            setIsComplete(false);
        }
    }, [isOpen, nodes]);

    const handleSign = async () => {
        if (steps.length === 0) return;

        // 1. Signing State
        updateStepStatus(currentStepIndex, 'signing');
        await new Promise(r => setTimeout(r, 1500)); // Simulate Wallet Popup

        // 2. Broadcasting State
        updateStepStatus(currentStepIndex, 'broadcasting');
        await new Promise(r => setTimeout(r, 2000)); // Simulate Chain time

        // 3. Confirmed
        updateStepStatus(currentStepIndex, 'confirmed', '0x' + Math.random().toString(16).substr(2, 40));

        // Move to next
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsComplete(true);
        }
    };

    const updateStepStatus = (index: number, status: TransactionStep['status'], hash?: string) => {
        setSteps(prev => prev.map((step, i) =>
            i === index ? { ...step, status, hash } : step
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumi-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white border-2 border-sumi-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b-2 border-sumi-black bg-intl-orange text-white flex justify-between items-center">
                    <h2 className="font-bold uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" />
                        Strategy Execution
                    </h2>
                    <button onClick={onClose} className="hover:text-sumi-black transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-paper-white relative">
                    {/* Progress Bar */}
                    <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-sumi-black/10 -z-0" />

                    <div className="space-y-6 relative z-10">
                        {steps.map((step, index) => {
                            const isCurrent = index === currentStepIndex && !isComplete;
                            const isPast = index < currentStepIndex || isComplete;

                            return (
                                <div key={step.id} className={cn("flex gap-4 transition-all duration-300",
                                    (isCurrent || isPast) ? "opacity-100" : "opacity-40 blur-[1px]")}
                                >
                                    {/* Icon Indicator */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 bg-white transition-colors duration-300",
                                        step.status === 'confirmed' ? "border-matchbox-green bg-matchbox-green text-white" :
                                            step.status === 'signing' || step.status === 'broadcasting' ? "border-cobalt-blue text-cobalt-blue animate-pulse" :
                                                "border-sumi-black text-sumi-black font-mono font-bold"
                                    )}>
                                        {step.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5" /> :
                                            step.status === 'broadcasting' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                                (index + 1)}
                                    </div>

                                    {/* Step Details */}
                                    <div className="flex-1 bg-white border-2 border-sumi-black p-4 rounded shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sumi-black uppercase text-sm">{step.title}</h3>
                                            {step.hash && (
                                                <a href="#" className="text-[10px] flex items-center gap-1 text-cobalt-blue hover:underline">
                                                    View TX <ExternalLink className="w-2 h-2" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-xs text-sumi-black/60 mt-1 font-mono leading-relaxed">
                                            {step.description}
                                        </p>

                                        {/* Dynamic Status Text */}
                                        <div className="mt-3 flex items-center gap-2">
                                            {step.status === 'signing' && (
                                                <span className="text-[10px] font-bold text-intl-orange uppercase animate-pulse">Waiting for Wallet Signature...</span>
                                            )}
                                            {step.status === 'broadcasting' && (
                                                <span className="text-[10px] font-bold text-cobalt-blue uppercase flex items-center gap-2">
                                                    Broadcasting to Network...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t-2 border-sumi-black bg-white flex justify-between items-center">
                    {isComplete ? (
                        <div className="w-full text-center">
                            <div className="mb-2 text-matchbox-green font-bold uppercase flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Strategy Deployed Successfully
                            </div>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-sumi-black text-white font-bold uppercase rounded hover:bg-sumi-black/80"
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex justify-between items-center gap-4">
                            <div className="text-xs font-mono text-sumi-black/60">
                                {steps.length > 0 ? `Step ${currentStepIndex + 1} of ${steps.length}` : 'No actions needed'}
                            </div>
                            <button
                                onClick={handleSign}
                                disabled={steps.length === 0 || steps[currentStepIndex].status !== 'pending'}
                                className="flex-1 max-w-[200px] py-3 bg-cobalt-blue text-white font-bold uppercase tracking-wider rounded border-2 border-sumi-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed"
                            >
                                {steps[currentStepIndex]?.status === 'pending' ? 'Sign Transaction' : 'Processing...'}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
