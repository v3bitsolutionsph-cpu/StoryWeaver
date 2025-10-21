import { useState, useRef, useCallback, useEffect } from 'react';
import { StorytellerStatus, Turn } from '../types';
import { createGeminiSession, createBlob, decodeAudioData, decode } from '../services/geminiService';
import { playSound, preloadSounds } from '../services/soundService';
import type { SoundEffect } from '../services/soundService';
import type { LiveSession, LiveServerMessage } from "@google/genai";

export const useStoryteller = () => {
    const [status, setStatus] = useState<StorytellerStatus>(StorytellerStatus.IDLE);
    const [conversation, setConversation] = useState<Turn[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = useCallback(() => {
        if (microphoneStreamRef.current) {
            microphoneStreamRef.current.getTracks().forEach(track => track.stop());
            microphoneStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
        
        setStatus(StorytellerStatus.IDLE);
        setError(null); // Clear any existing errors on cleanup
    }, []);
    
    const stopSession = useCallback(() => {
        cleanup();
    }, [cleanup]);

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        try {
            // Handle tool calls for sound effects
            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'playSoundEffect' && outputAudioContextRef.current) {
                        const sound = fc.args.sound as SoundEffect;
                        if (sound) {
                            playSound(sound, outputAudioContextRef.current);
                        }
                        // Important: Send a response back to the model to confirm the function was run
                        sessionPromiseRef.current?.then(session => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: "ok" },
                                }
                            });
                        });
                    }
                }
            }

            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscriptionRef.current += text;
            } else if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscriptionRef.current += text;
                // Eagerly update UI with user's speech
                setConversation(prev => {
                    const last = prev[prev.length -1];
                    if(last && last.speaker === 'user') {
                        return [...prev.slice(0, -1), { speaker: 'user', text: currentInputTranscriptionRef.current }];
                    }
                    return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current }];
                });
            }

            if (message.serverContent?.turnComplete) {
                const userInput = currentInputTranscriptionRef.current.trim();
                const aiResponse = currentOutputTranscriptionRef.current.trim();
                
                // Atomically update conversation log to prevent race conditions
                setConversation(prev => {
                    const updatedConversation = [...prev];
                    
                    // Finalize the user's turn with the complete transcript
                    if (userInput && updatedConversation.length > 0) {
                        const lastTurnIndex = updatedConversation.length - 1;
                        if (updatedConversation[lastTurnIndex].speaker === 'user') {
                            updatedConversation[lastTurnIndex] = { ...updatedConversation[lastTurnIndex], text: userInput };
                        }
                    }

                    // Add the AI's response as a new turn
                    if (aiResponse) {
                        updatedConversation.push({ speaker: 'ai', text: aiResponse });
                    }
                    
                    return updatedConversation;
                });

                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                setStatus(StorytellerStatus.LISTENING);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
                setStatus(StorytellerStatus.SPEAKING);
                const outputAudioContext = outputAudioContextRef.current;
                if (!outputAudioContext) return;
                
                const bytes = decode(base64Audio);
                const audioBuffer = await decodeAudioData(bytes, outputAudioContext, 24000, 1);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                    if (audioSourcesRef.current.size === 0) {
                         setStatus(StorytellerStatus.LISTENING);
                    }
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }

            if(message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
        } catch(e) {
            console.error("Error handling message:", e);
            setError("An error occurred while processing the AI's response. Please try again.");
            setStatus(StorytellerStatus.ERROR);
            cleanup();
        }

    }, [cleanup]);

    const startSession = useCallback(async () => {
        setError(null);
        if (status !== StorytellerStatus.IDLE && status !== StorytellerStatus.ERROR) {
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphoneStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputAudioContextRef.current = outputAudioContext;

            // AudioContexts often start in a 'suspended' state and need to be resumed by a user gesture.
            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }

            // Preload sounds for playback
            await preloadSounds(outputAudioContext);

            setConversation([]);

            sessionPromiseRef.current = createGeminiSession({
                onOpen: () => {
                    const inputAudioContext = inputAudioContextRef.current;
                    if (!inputAudioContext || !microphoneStreamRef.current) return;
                    
                    const source = inputAudioContext.createMediaStreamSource(microphoneStreamRef.current);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then(session => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);

                    setStatus(StorytellerStatus.LISTENING);
                },
                onMessage: handleMessage,
                onError: (e: ErrorEvent) => {
                    console.error("Session Error:", e);
                    setError("An error occurred with the AI storyteller. Please try again.");
                    setStatus(StorytellerStatus.ERROR);
                    cleanup();
                },
                onClose: () => {
                   cleanup();
                },
            });

            // Handle potential connection errors
            sessionPromiseRef.current.catch(err => {
                console.error("Session Connection Error:", err);
                setError("Could not connect to the storyteller. Please check your internet connection and try again.");
                setStatus(StorytellerStatus.ERROR);
                cleanup();
            });

        } catch (err) {
            console.error("Failed to start session:", err);
            if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'NotFoundError')) {
                setError("Could not access microphone. Please grant permission and try again.");
            } else {
                setError("Something went wrong while setting up the storyteller. Please try again.");
            }
            setStatus(StorytellerStatus.ERROR);
        }
    }, [status, cleanup, handleMessage]);
    
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return { status, conversation, error, startSession, stopSession };
};