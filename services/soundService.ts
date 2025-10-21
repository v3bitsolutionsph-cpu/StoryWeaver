// A small library of base64-encoded WAV files for sound effects.
// In a real app, you might load these from a server.
const soundLibrary = {
    sparkle: "UklGRiYSAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YRISAAA PsACAAAAAALgA4ADyAPgA/AD6APgA9ADsAOAA2gC8AJMAZwA+ADQAJwAhABEA//8A/v/8//n/+P/3//X/8//s/+f/3//P/7v/m/+G/3z/bv9q/2f/Zv9j/2L/Yf9h/2H/Yv9l/2r/bv95/4T/j/+f/6b/s/+7/8H/y//T//f//v//AAAAAwADAAQABgAIAAkACwANAA8AEQATABUAFwAZABsAHQAeACAAIgAkACYAKAAqACwALgAwADIANgA4ADoAPAA+AEAAQgBEAEgASgBMAE4AUABSAFQAVgBYAFoAXABeAGIAZABmAGgAagBsAG4AcAByAHQAdgB4AHoAfAB+AIAAggCEAIYAhwCMAI4AkgCUAJYAmACaAJoAkwCPgIsAigCAAHoAdgBsAGgAXgBYAFIAUgBRAFAATgBMAEoASABGAEQAQgA+ADoANgAyACwAJgAgABwAGgAWABIAEAANAAoABwADAAAAAAEAAwAFAAcACQALAA0ADwARABMAFQAXABkAGwAdAB8AIQEjASgBKgEtAS8BMwE1ATcBOQE7AT0BPwFDAUUBSwFNAVIBVQFZAVsBXwFjAWUBZwFpAWsBbgFwAXIBdQF3AXsBfwGCAYQBhgGKAY0BkAGTAZUBmQGbAZ4BoQGjAaUBpwGpAasBrQGvAbEBswG1AbcBvQG/AcIBwgHD",
    thump: "UklGRjIAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVAAAAEQzLjUuMy4yMDBjZDAyZGRhdGEUAAAA+fn5/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+5ubm4uLi4+Pj5eXl6urq7e3t8fHx9PT09/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+/v7+/v7+/v7+/v7+/v7+/v7+/////////////v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+",
    whoosh: "UklGRkIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YUIgAAB+/+D/3v/c/9v/2f/Y/9X/1P/S/8//zP/L/8j/x//F/8T/w//C/8H/v/+9/7n/tf+x/6//qP+m/6T/nf+a/5f/kv+Q/43/iv+I/4H/f/98/3n/d/9z/2//a/9o/2X/Y/9i/2D/Xv9c/1v/VP9T/1L/SP9G/0T/QP8+/zr/Nv8w/yv/KP8k/x//Gv8V/xL/Dv8L/wf/A/7//u/+5/7X/sf+r/6j/pv+k/53/mv+W/5L/kP+N/4r/iP+B/3//fP95/3f/c/9v/2r/aP9l/2P/Yv9g/17/XP9b/1T/U/9S/0j/Rv9E/0D/Pv86/zb/MP8r/yj/JP8f/xr/Ff8S/w7/C/8H/wP/Af7//v/+6/7j/tv+x/6v/qP+m/6T/nf+a/5f/kv+Q/43/iv+I/4H/f/98/3n/d/9z/2//a/9o/2X/Y/9i/2D/Xv9c/1v/VP9T/1L/SP9G/0T/QP8+/zr/Nv8w/yv/KP8k/x//Gv8V/xL/Dv8L/wf/A/8B/g==",
};

export type SoundEffect = keyof typeof soundLibrary;

// A cache for the decoded audio buffers
const audioBuffers: Partial<Record<SoundEffect, AudioBuffer>> = {};

/**
 * Decodes a base64 string into an ArrayBuffer.
 * @param base64 The base64-encoded string.
 * @returns An ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Preloads and decodes all sound effects into AudioBuffers.
 * This should be called once when the AudioContext is created.
 * @param ctx The AudioContext to use for decoding.
 */
export async function preloadSounds(ctx: AudioContext): Promise<void> {
    for (const key in soundLibrary) {
        const soundName = key as SoundEffect;
        if (!audioBuffers[soundName]) {
            try {
                const arrayBuffer = base64ToBuffer(soundLibrary[soundName]);
                audioBuffers[soundName] = await ctx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error(`Failed to decode sound: ${soundName}`, e);
            }
        }
    }
}

/**
 * Plays a preloaded sound effect.
 * @param soundName The name of the sound to play.
 * @param ctx The AudioContext to use for playback.
 */
export function playSound(soundName: SoundEffect, ctx: AudioContext) {
    const buffer = audioBuffers[soundName];
    if (buffer && ctx.state === 'running') {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } else if (ctx.state !== 'running') {
        console.warn('Cannot play sound, AudioContext is not running. It must be resumed after user interaction.');
    } else {
        console.warn(`Sound not found or not preloaded: ${soundName}`);
    }
}
