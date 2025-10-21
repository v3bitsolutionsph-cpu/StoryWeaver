import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StorytellerAnimation from './components/StorytellerAnimation';
import { useStoryteller } from './hooks/useStoryteller';
import { StorytellerStatus, Turn } from './types';

const MicrophoneIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-8 h-8"}>
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 1 1-13.5 0v-1.5A.75.75 0 0 1 6 10.5Z" />
    </svg>
);

const StopIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-8 h-8"}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);

const ErrorIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-12 h-12 text-red-500"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

const ErrorModal: React.FC<{ message: string; onClose: () => void; }> = ({ message, onClose }) => {
    return (
        <motion.div
            className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-gray-800 rounded-2xl p-8 shadow-2xl text-center max-w-md w-full flex flex-col items-center"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <ErrorIcon />
                <h2 className="text-2xl font-bold text-red-400 mt-4 mb-2">Oops! Something went wrong.</h2>
                <p className="text-gray-300 mb-8">{message}</p>
                <button 
                    onClick={onClose} 
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-red-400 transform hover:scale-105"
                >
                    Reset
                </button>
            </motion.div>
        </motion.div>
    );
};


const ControlButton: React.FC<{ status: StorytellerStatus; onStart: () => void; onStop: () => void; }> = ({ status, onStart, onStop }) => {
    const isIdle = status === StorytellerStatus.IDLE || status === StorytellerStatus.ERROR;
    const handleClick = isIdle ? onStart : onStop;
    
    const baseClasses = "rounded-full p-6 text-white shadow-lg transform transition-transform duration-200 ease-in-out focus:outline-none focus:ring-4";
    const activeClasses = isIdle 
        ? "bg-green-500 hover:bg-green-600 focus:ring-green-400 active:scale-95" 
        : "bg-red-500 hover:bg-red-600 focus:ring-red-400 active:scale-95";

    return (
        <button onClick={handleClick} className={`${baseClasses} ${activeClasses}`} disabled={status === StorytellerStatus.ERROR}>
            {isIdle ? <MicrophoneIcon /> : <StopIcon />}
        </button>
    );
};


const ConversationLog: React.FC<{ conversation: Turn[] }> = ({ conversation }) => {
    const endOfLogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);
    
    return (
        <div className="w-full max-w-4xl h-64 lg:h-80 bg-gray-800/50 rounded-lg p-4 overflow-y-auto space-y-4 font-sans">
            {conversation.map((turn, index) => (
                <div key={index} className={`flex items-start gap-3 ${turn.speaker === 'user' ? 'justify-end' : ''}`}>
                    {turn.speaker === 'ai' && <div className="w-8 h-8 rounded-full bg-green-500 flex-shrink-0 mt-1" />}
                    <div className={`p-3 rounded-lg max-w-md ${turn.speaker === 'ai' ? 'bg-gray-700' : 'bg-blue-600'}`}>
                        <p className="text-base">{turn.text}</p>
                    </div>
                     {turn.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                </div>
            ))}
             <div ref={endOfLogRef} />
        </div>
    );
};


const App: React.FC = () => {
    const { status, conversation, error, startSession, stopSession } = useStoryteller();

    const statusText: Record<StorytellerStatus, string> = {
        [StorytellerStatus.IDLE]: "Let's create a story! Press the button and tell me what it's about.",
        [StorytellerStatus.LISTENING]: "I'm listening... tell me your idea!",
        [StorytellerStatus.THINKING]: "A great idea! Let me think...",
        [StorytellerStatus.SPEAKING]: "Here's what happens...",
        [StorytellerStatus.ERROR]: "An error occurred. Please try again."
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex flex-col items-center justify-center p-4 font-serif">
            <AnimatePresence>
                {status === StorytellerStatus.ERROR && error && (
                    <ErrorModal message={error} onClose={stopSession} />
                )}
            </AnimatePresence>

            <header className="text-center mb-6">
                <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-blue-400 to-purple-500">
                    AI Storyteller
                </h1>
                <p className="text-gray-300 mt-2 text-lg">Your Magical Story Companion</p>
            </header>
            
            <main className="flex flex-col items-center gap-6 w-full">
                <StorytellerAnimation status={status} />
                <p className="text-xl text-center text-gray-200 h-12">{statusText[status]}</p>
                <ControlButton status={status} onStart={startSession} onStop={stopSession} />
                <ConversationLog conversation={conversation} />
            </main>
        </div>
    );
};

export default App;