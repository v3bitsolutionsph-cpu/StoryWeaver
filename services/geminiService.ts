import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from "@google/genai";

// Audio Encoding utilities
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Audio Decoding utilities
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const playSoundEffectDeclaration: FunctionDeclaration = {
    name: 'playSoundEffect',
    description: 'Plays a sound effect to make the story more engaging.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sound: {
                type: Type.STRING,
                description: 'The name of the sound effect to play.',
                enum: ['sparkle', 'thump', 'whoosh'],
            },
        },
        required: ['sound'],
    },
};

export function createGeminiSession(callbacks: {
    onMessage: (message: LiveServerMessage) => Promise<void>;
    onError: (e: ErrorEvent) => void;
    onClose: (e: CloseEvent) => void;
    onOpen: () => void;
}): Promise<LiveSession> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are a master storyteller for children aged 4 to 8. Your stories are engaging, simple, positive, and always have a gentle moral. You speak in a friendly, warm, and slightly animated voice. To make the story more immersive, you can use sound effects. When something magical happens, you can call `playSoundEffect({sound: "sparkle"})`. For a fall or a heavy step, use `playSoundEffect({sound: "thump"})`. For quick movements, use `playSoundEffect({sound: "whoosh"})`. When a child speaks, you listen patiently and incorporate their ideas into the story you are building together. Keep your responses relatively short, ending with a question to encourage the child to contribute more to the story, like "What do you think happened next?" or "What color was the dragon?".',
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [{ functionDeclarations: [playSoundEffectDeclaration] }]
        },
    });

    return sessionPromise;
}
