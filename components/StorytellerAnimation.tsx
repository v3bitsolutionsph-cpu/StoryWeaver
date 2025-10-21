import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StorytellerStatus } from '../types';

// Softer, more thematic colors
const statusColors = {
    [StorytellerStatus.IDLE]: 'bg-slate-500',
    [StorytellerStatus.LISTENING]: 'bg-sky-500',
    [StorytellerStatus.THINKING]: 'bg-amber-400',
    [StorytellerStatus.SPEAKING]: 'bg-emerald-500',
    [StorytellerStatus.ERROR]: 'bg-red-500',
};

// Refined orb animations for a more fluid feel
const orbVariants = {
    [StorytellerStatus.IDLE]: {
        scale: [1, 1.03, 1],
        boxShadow: '0 0 15px 5px rgba(100, 116, 139, 0.3)',
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
    },
    [StorytellerStatus.LISTENING]: {
        scale: [1, 1.08, 1],
        boxShadow: '0 0 25px 12px rgba(14, 165, 233, 0.4)',
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    [StorytellerStatus.THINKING]: {
        scale: 1.05,
        rotate: [0, 360],
        boxShadow: '0 0 30px 15px rgba(251, 191, 36, 0.3)',
        transition: { 
            rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
            default: { duration: 0.8, ease: 'backInOut' }
        },
    },
    [StorytellerStatus.SPEAKING]: {
        scale: [1, 1.06, 1],
        boxShadow: '0 0 28px 14px rgba(16, 185, 129, 0.4)',
        transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
    },
    [StorytellerStatus.ERROR]: {
        scale: 1,
        x: [0, -5, 5, -5, 5, 0],
        backgroundColor: '#ef4444',
        boxShadow: '0 0 20px 10px rgba(239, 68, 68, 0.7)',
        transition: { x: { duration: 0.4 }, default: { duration: 0.2 } },
    }
};

// Smoother transitions for background effects
const effectContainerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } },
};

// More subtle, continuous listening waves
const ListeningEffect = () => (
    <motion.div key="listening" {...effectContainerVariants} className="absolute inset-0 flex justify-center items-center">
        {[...Array(4)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-32 h-32 rounded-full border border-sky-400/80"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{
                    scale: 3.5,
                    opacity: 0,
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: i * 1,
                }}
            />
        ))}
    </motion.div>
);

// A more abstract, swirling "thinking" animation
const ThinkingEffect = () => (
    <motion.div key="thinking" {...effectContainerVariants} className="absolute inset-0 flex justify-center items-center overflow-hidden">
        <motion.div 
            className="absolute w-48 h-48"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
            <div className="absolute top-0 left-1/2 w-16 h-16 bg-amber-300/50 rounded-full blur-xl -translate-x-1/2" />
            <div className="absolute bottom-0 left-1/4 w-12 h-12 bg-amber-200/50 rounded-full blur-lg" />
            <div className="absolute top-1/3 right-0 w-10 h-10 bg-white/40 rounded-full blur-md" />
        </motion.div>
    </motion.div>
);

// Softer, wave-like speaking pulses
const SpeakingEffect = () => (
    <motion.div key="speaking" {...effectContainerVariants} className="absolute inset-0 flex justify-center items-center">
        <motion.div
            className="absolute w-32 h-32 rounded-full border-2 border-emerald-300/90"
            animate={{
                scale: [1, 2.5],
                opacity: [0.8, 0],
            }}
             transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
            }}
        />
        <motion.div
            className="absolute w-32 h-32 rounded-full border-2 border-emerald-300/50"
            animate={{
                scale: [1, 2.5],
                opacity: [0.6, 0],
            }}
             transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 1
            }}
        />
    </motion.div>
);

const StorytellerAnimation: React.FC<{ status: StorytellerStatus }> = ({ status }) => {
    return (
        <div className="relative flex justify-center items-center h-64 w-64">
            <AnimatePresence mode="wait">
                {status === StorytellerStatus.LISTENING && <ListeningEffect />}
                {status === StorytellerStatus.THINKING && <ThinkingEffect />}
                {status === StorytellerStatus.SPEAKING && <SpeakingEffect />}
            </AnimatePresence>

            <motion.div
                className={`w-32 h-32 rounded-full ${statusColors[status]}`}
                variants={orbVariants}
                animate={status}
                // Add a default transition for properties not covered by variants, like backgroundColor
                transition={{ duration: 0.5, ease: "anticipate" }}
            />
        </div>
    );
};

export default StorytellerAnimation;
