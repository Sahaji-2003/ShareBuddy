import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export function GlassCard({ children, className, hoverEffect = false, ...props }: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={hoverEffect ? { scale: 1.01, translateY: -2 } : {}}
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 p-4 sm:p-5 shadow-xl backdrop-blur-sm transition-all",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
}
