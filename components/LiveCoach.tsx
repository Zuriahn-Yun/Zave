import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Mic, MicOff, Volume2, XCircle } from 'lucide-react';

interface LiveCoachProps {
  onClose: () => void;
  context: string;
}

// Audio helpers (from docs)
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const uint8 = new Uint8Array(int16.buffer);
  
  // Custom manual encoding to avoid external libraries
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
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

const LiveCoach: React.FC<LiveCoachProps> = ({ onClose, context }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string>("Connecting...");
  
  // Refs for cleanup
  const sessionRef = useRef<any>(null); // To store session object
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    const startSession = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Audio setup
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContext.createGain();
        
        inputContextRef.current = inputAudioContext;
        outputContextRef.current = outputAudioContext;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Model Config
        const config = {
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
            },
            systemInstruction: `You are a helpful, hands-free repair coach. 
            The user is currently fixing: ${context}. 
            Be concise, encouraging, and clear. 
            Wait for the user to ask "What's next?" or confirm they finished a step.`,
          },
        };

        const sessionPromise = ai.live.connect({
          ...config,
          callbacks: {
            onopen: () => {
              if (!mounted) return;
              setStatus("Listening - Ask for help!");
              setIsActive(true);

              // Input processing
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
               const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
               
               if (base64EncodedAudioString) {
                 const ctx = outputContextRef.current;
                 if (!ctx) return;

                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                 const audioBuffer = await decodeAudioData(
                   decode(base64EncodedAudioString),
                   ctx,
                   24000,
                   1
                 );
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNode);
                 outputNode.connect(ctx.destination);
                 
                 source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                 });
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
               }

               const interrupted = message.serverContent?.interrupted;
               if (interrupted) {
                 sourcesRef.current.forEach(src => {
                   try { src.stop(); } catch(e) {}
                   sourcesRef.current.delete(src);
                 });
                 nextStartTimeRef.current = 0;
               }
            },
            onclose: () => {
               if(mounted) setStatus("Disconnected");
            },
            onerror: (e) => {
               console.error(e);
               if(mounted) setStatus("Error connecting");
            }
          }
        });
        
        sessionRef.current = await sessionPromise;

      } catch (err) {
        console.error("Live API Error:", err);
        setStatus("Failed to connect mic.");
      }
    };

    startSession();

    return () => {
      mounted = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (inputContextRef.current) inputContextRef.current.close();
      if (outputContextRef.current) outputContextRef.current.close();
      if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
      sourcesRef.current.forEach(s => s.stop());
      if (sessionRef.current) {
          try { (sessionRef.current as any).close(); } catch(e) {}
      }
    };
  }, [context]);

  // Keep Coach UI dark/techy regardless of app theme for contrast
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className="bg-slate-900/95 border border-emerald-500/30 shadow-2xl rounded-3xl p-6 w-80 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                <h3 className="text-white font-bold text-base tracking-wide">AI Mechanic</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1 rounded-full">
                <XCircle size={20} />
            </button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4 gap-6">
            <div className={`
                relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500
                ${isActive ? 'bg-emerald-500/10' : 'bg-slate-800/50'}
            `}>
                {isActive && <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75"></div>}
                {isActive ? (
                    <Mic size={32} className="text-emerald-400 relative z-10" />
                ) : (
                    <MicOff size={32} className="text-slate-500" />
                )}
            </div>
            <p className="text-slate-300 font-medium text-center text-sm">{status}</p>
        </div>

        <div className="bg-slate-950/50 rounded-xl p-3 text-center mt-2 border border-white/5">
             <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Say</p>
             <p className="text-xs text-slate-300 italic">"Hey Gemini, walk me through step 1"</p>
        </div>
      </div>
    </div>
  );
};

export default LiveCoach;