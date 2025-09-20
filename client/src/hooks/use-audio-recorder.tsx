import { useState, useRef, useCallback } from "react";

// Add Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface AudioRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  transcript: string;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    transcript: "",
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCallbackRef = useRef<((data: number[]) => void) | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);

  const startRecording = useCallback(async (onWaveformData?: (data: number[]) => void) => {
    try {
      setState(prev => ({ ...prev, error: null, transcript: "" }));
      transcriptRef.current = "";
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      waveformCallbackRef.current = onWaveformData || null;

      // Initialize Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }
          
          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            setState(prev => ({ 
              ...prev, 
              transcript: transcriptRef.current 
            }));
          }
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech' || event.error === 'network') {
            // Continue silently for no-speech or network errors - these are common and non-fatal
            return;
          }
          if (event.error === 'not-allowed') {
            setState(prev => ({ 
              ...prev, 
              error: 'Microphone access denied. Please enable microphone permissions and try again.' 
            }));
            return;
          }
          setState(prev => ({ 
            ...prev, 
            error: `Speech recognition error: ${event.error}` 
          }));
        };
        
        speechRecognitionRef.current = recognition;
        recognition.start();
      } else {
        console.warn('Web Speech API not supported, audio will be recorded without transcription');
      }

      // Set up audio analysis for waveform visualization
      if (onWaveformData) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateWaveform = () => {
          if (analyserRef.current && isRecordingRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const waveformData = Array.from(dataArray).slice(0, 7);
            onWaveformData(waveformData);
            requestAnimationFrame(updateWaveform);
          }
        };
        updateWaveform();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        isRecordingRef.current = false;
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setState(prev => ({ 
          ...prev, 
          audioBlob, 
          isRecording: false,
          transcript: transcriptRef.current
        }));
      };

      mediaRecorder.start(1000); // Collect data every second
      
      isRecordingRef.current = true;
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        duration: 0, 
        audioBlob: null 
      }));

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

    } catch (error) {
      console.error("Error starting recording:", error);
      setState(prev => ({ 
        ...prev, 
        error: "Failed to start recording. Please check microphone permissions." 
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      transcript: "",
      error: null,
    });
    chunksRef.current = [];
    transcriptRef.current = "";
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    reset,
  };
}
