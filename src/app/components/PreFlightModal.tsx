'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ShieldCheck,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { RiskCheck } from '@/types';
import { cn } from '@/lib/utils';

interface PreFlightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProceed: () => void;
    checks: RiskCheck[];
    isLoading: boolean;
    migrationDetails?: {
        fromChain: string;
        toChain: string;
        amount: number;
        protocol: string;
    };
}

const statusConfig = {
    pass: {
        icon: CheckCircle2,
        color: 'text-matchbox-green',
        bg: 'bg-matchbox-green/10',
        border: 'border-matchbox-green/20',
    },
    warn: {
        icon: AlertTriangle,
        color: 'text-intl-orange',
        bg: 'bg-intl-orange/10',
        border: 'border-intl-orange/20',
    },
    fail: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
    },
};

const CheckItem = memo(({ check }: { check: RiskCheck }) => {
    const config = statusConfig[check.status];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'flex items-start gap-3 p-4 rounded-xl border',
                config.bg,
                config.border
            )}
        >
            <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.color)} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-primary uppercase tracking-wide">
                        {check.name}
                    </h4>
                    <span className={cn(
                        'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                        config.bg,
                        config.color
                    )}>
                        {check.status}
                    </span>
                </div>
                <p className="text-sm text-secondary mt-1">{check.message}</p>
            </div>
        </motion.div>
    );
});

CheckItem.displayName = 'CheckItem';

function PreFlightModal({
    isOpen,
    onClose,
    onProceed,
    checks,
    isLoading,
    migrationDetails,
}: PreFlightModalProps) {
    const { overallStatus, hasFailures, hasWarnings } = useMemo(() => {
        const failures = checks.filter((c) => c.status === 'fail');
        const warnings = checks.filter((c) => c.status === 'warn');

        let status: 'pass' | 'warn' | 'fail' = 'pass';
        if (failures.length > 0) status = 'fail';
        else if (warnings.length > 0) status = 'warn';

        return {
            overallStatus: status,
            hasFailures: failures.length > 0,
            hasWarnings: warnings.length > 0,
        };
    }, [checks]);

    const statusMessages = {
        pass: 'All safety checks passed. You are clear to proceed.',
        warn: 'Some warnings detected. Review before proceeding.',
        fail: 'Critical issues found. Migration not recommended.',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-surface rounded-3xl border border-divider shadow-soft-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-divider">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-primary uppercase tracking-tight">
                                        Pre-Flight Check
                                    </h2>
                                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                                        Safety Verification
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center hover:bg-divider transition-colors"
                            >
                                <X className="w-4 h-4 text-secondary" />
                            </button>
                        </div>

                        {/* Migration Summary */}
                        {migrationDetails && (
                            <div className="px-6 py-4 bg-surface-secondary/50 border-b border-divider">
                                <div className="flex items-center justify-center gap-3 text-sm">
                                    <span className="font-bold text-primary">{migrationDetails.fromChain}</span>
                                    <ArrowRight className="w-4 h-4 text-secondary" />
                                    <span className="font-bold text-primary">{migrationDetails.toChain}</span>
                                    <span className="text-secondary">•</span>
                                    <span className="font-mono text-accent">${migrationDetails.amount.toLocaleString()}</span>
                                    <span className="text-secondary">→</span>
                                    <span className="text-primary">{migrationDetails.protocol}</span>
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                                    <p className="text-sm font-bold text-secondary uppercase tracking-widest">
                                        Running Safety Checks...
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {checks.map((check, index) => (
                                        <CheckItem key={`${check.name}-${index}`} check={check} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!isLoading && checks.length > 0 && (
                            <div className="p-6 border-t border-divider bg-surface-secondary/30">
                                {/* Status Message */}
                                <div className={cn(
                                    'flex items-center gap-2 mb-4 p-3 rounded-xl',
                                    statusConfig[overallStatus].bg,
                                    'border',
                                    statusConfig[overallStatus].border
                                )}>
                                    {(() => {
                                        const Icon = statusConfig[overallStatus].icon;
                                        return <Icon className={cn('w-4 h-4', statusConfig[overallStatus].color)} />;
                                    })()}
                                    <span className={cn('text-sm font-medium', statusConfig[overallStatus].color)}>
                                        {statusMessages[overallStatus]}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-widest border border-divider text-secondary hover:bg-surface-secondary transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onProceed}
                                        disabled={hasFailures}
                                        className={cn(
                                            'flex-1 px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-colors',
                                            hasFailures
                                                ? 'bg-red-500/20 text-red-500 cursor-not-allowed'
                                                : hasWarnings
                                                    ? 'bg-intl-orange text-white hover:bg-intl-orange/90'
                                                    : 'bg-matchbox-green text-white hover:bg-matchbox-green/90'
                                        )}
                                    >
                                        {hasFailures ? 'Cannot Proceed' : hasWarnings ? 'Proceed Anyway' : 'Proceed'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default memo(PreFlightModal);
