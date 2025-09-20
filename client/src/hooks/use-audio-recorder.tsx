import { useState, useRef, useCallback } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformCallbackRef = useRef<((data: number[]) => void) | null>(null);

  const startRecording = useCallback(async (onWaveformData?: (data: number[]) => void) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      waveformCallbackRef.current = onWaveformData || null;

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
          if (analyserRef.current && state.isRecording) {
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
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setState(prev => ({ 
          ...prev, 
          audioBlob, 
          isRecording: false 
        }));
      };

      mediaRecorder.start(1000); // Collect data every second
      
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
  }, [state.isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
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
    }
  }, [state.isRecording]);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      error: null,
    });
    chunksRef.current = [];
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    reset,
  };
}
