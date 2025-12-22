import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    title = "Ready to Analyze",
    description = "Select your origin network and capital to discover optimal yield routes.",
    actionLabel = "Start Analysis",
    onAction
}: EmptyStateProps) {
    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full text-center space-y-6"
            >
                <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-soft-gray rounded-full animate-pulse opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Search className="w-10 h-10 text-sumi-black/40" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="font-mono text-xl font-bold uppercase tracking-tight text-sumi-black">
                        {title}
                    </h3>
                    <p className="font-sans text-sumi-black/60 text-lg">
                        {description}
                    </p>
                </div>

                {onAction && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onAction}
                        className="neo-button-primary inline-flex items-center gap-2"
                    >
                        {actionLabel}
                        <ArrowRight className="w-4 h-4" />
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}
