"use client";

import { ErrorFeedback } from "@/components/ErrorFeedback";
import { RecordingTime } from "@/components/RecordingTime";
import { Result } from "@/components/Result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrapper } from "@/components/Wrapper";
import { useResults } from "@/contexts/ResultsContext";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useCallback, useReducer, useRef } from "react";
import { polishAndTranslateText, transcribeAudio } from "./actions";
import { appReducer, initialState } from "./reducer";

export default function AudioTranscriptionApp() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { saveResult } = useResults();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      dispatch({ type: "INCREMENT_RECORDING_TIME" });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = async () => {
    if (process.env.NODE_ENV === "production" && !state.apiKey) {
      if (state.recordingState === "error-api-key") {
        return;
      }

      dispatch({
        type: "SET_ERROR_API_KEY",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        await processAudio(audioBlob);

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      dispatch({ type: "START_RECORDING" });
      startTimer();
    } catch (err) {
      if (state.recordingState === "error-microphone") {
        return;
      }

      dispatch({
        type: "SET_ERROR_MICROPHONE",
      });
      console.error("Error starting recording:", err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state.recordingState === "recording") {
      mediaRecorderRef.current.pause();
      dispatch({ type: "PAUSE_RECORDING" });
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state.recordingState === "paused") {
      mediaRecorderRef.current.resume();
      dispatch({ type: "START_RECORDING" });
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      dispatch({ type: "STOP_RECORDING" });
      stopTimer();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert blob to buffer for transcription
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = new Uint8Array(arrayBuffer);

      // Transcribe audio
      const transcriptionResult = await transcribeAudio({
        audioBuffer,
        apiKey: state.apiKey,
      });

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || "Transcription failed");
      }

      // Polish and translate
      const processResult = await polishAndTranslateText({
        text: transcriptionResult.transcript!,
        tone: state.tone || "professional",
        apiKey: state.apiKey,
      });

      if (!processResult.success) {
        throw new Error(processResult.error || "Processing failed");
      }

      dispatch({ type: "SET_RESULT", payload: processResult.result! });
      // Save to context (which updates localStorage and notifies consumers)
      saveResult(processResult.result!);
    } catch (err) {
      dispatch({
        type: "SET_ERROR_RESULT",
        payload:
          err instanceof Error
            ? err.message
            : "An error occurred during processing",
      });
      console.error("Error processing audio:", err);
    }
  };

  const resetApp = () => {
    dispatch({ type: "RESET_APP" });
    stopTimer();

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <Wrapper
      feedback={
        <>
          {(state.recordingState === "error-result" ||
            state.recordingState === "error-api-key" ||
            state.recordingState === "error-microphone") && (
            <ErrorFeedback error={state.error} />
          )}

          {state.recordingState === "success" && (
            <Result result={state.result} />
          )}
        </>
      }
    >
      {process.env.NODE_ENV !== "development" && (
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            placeholder="Enter your API key"
            value={state.apiKey}
            onChange={(e) =>
              dispatch({ type: "SET_API_KEY", payload: e.target.value })
            }
            disabled={state.recordingState !== "idle"}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="tone">Tone (optional)</Label>
        <Input
          id="tone"
          placeholder="e.g., professional, casual, formal, friendly"
          value={state.tone}
          onChange={(e) =>
            dispatch({ type: "SET_TONE", payload: e.target.value })
          }
          disabled={state.recordingState !== "idle"}
        />
      </div>

      <div className="flex items-center justify-center space-x-4">
        {(state.recordingState === "idle" ||
          state.recordingState === "error-api-key" ||
          state.recordingState === "error-microphone") && (
          <Button
            onClick={startRecording}
            size="lg"
            className="bg-red-500 hover:bg-red-600"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        )}

        {state.recordingState === "recording" && (
          <>
            <Button onClick={pauseRecording} variant="outline" size="lg">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button onClick={stopRecording} size="lg">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        )}

        {state.recordingState === "paused" && (
          <>
            <Button
              onClick={resumeRecording}
              size="lg"
              className="bg-green-500 hover:bg-green-600"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
            <Button onClick={stopRecording} size="lg">
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        )}

        {state.recordingState === "processing" && (
          <Button disabled size="lg">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </Button>
        )}
      </div>

      {(state.recordingState === "recording" ||
        state.recordingState === "paused") && (
        <div className="text-center">
          <RecordingTime recordingTime={state.recordingTime} />
          <p className="text-sm text-gray-500 mt-1">
            {state.recordingState === "recording" ? "Recording..." : "Paused"}
          </p>
        </div>
      )}

      {(state.recordingState === "success" ||
        state.recordingState === "error-result") && (
        <div className="flex justify-center">
          <Button onClick={resetApp} variant="outline">
            Start New Recording
          </Button>
        </div>
      )}
    </Wrapper>
  );
}
