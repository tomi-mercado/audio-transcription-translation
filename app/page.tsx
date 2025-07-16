"use client";

import { RecordingTime } from "@/components/RecordingTime";
import { Transcription } from "@/components/Transcription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useCallback, useReducer, useRef } from "react";
import { polishAndTranslateText, transcribeAudio } from "./actions";

type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "success"
  | "error";

interface TranscriptionResult {
  originalText: string;
  originalLanguage: "en" | "es";
  polishedOriginal: string;
  translatedText: string;
  targetLanguage: "en" | "es";
}

interface AppState {
  recordingState: RecordingState;
  tone: string;
  result: TranscriptionResult | null;
  error: string | null;
  recordingTime: number;
}

type AppAction =
  | { type: "START_RECORDING" }
  | { type: "PAUSE_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "SET_TONE"; payload: string }
  | { type: "SET_RESULT"; payload: TranscriptionResult }
  | { type: "SET_ERROR"; payload: string }
  | { type: "INCREMENT_RECORDING_TIME" }
  | { type: "RESET_APP" };

const initialState: AppState = {
  recordingState: "idle",
  tone: "",
  result: null,
  error: null,
  recordingTime: 0,
};

const reducerThrower = (state: AppState, action: AppAction) => {
  throw new Error(
    `Cannot perform ${action.type} in ${state.recordingState} state`
  );
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_RECORDING":
      if (state.recordingState !== "idle") {
        reducerThrower(state, action);
      }
      return {
        ...state,
        recordingState: "recording",
        recordingTime: 0,
        error: null,
      };
    case "PAUSE_RECORDING":
      if (state.recordingState !== "recording") {
        reducerThrower(state, action);
      }
      return { ...state, recordingState: "paused" };
    case "STOP_RECORDING":
      if (state.recordingState !== "recording") {
        reducerThrower(state, action);
      }
      return { ...state, recordingState: "processing", recordingTime: 0 };
    case "SET_TONE":
      if (state.recordingState !== "idle") {
        reducerThrower(state, action);
      }
      return { ...state, tone: action.payload };
    case "SET_RESULT":
      if (state.recordingState !== "processing") {
        reducerThrower(state, action);
      }
      return {
        ...state,
        result: action.payload,
        recordingState: "success",
        error: null,
      };
    case "SET_ERROR":
      if (state.recordingState !== "processing") {
        reducerThrower(state, action);
      }
      return {
        ...state,
        error: action.payload,
        recordingState: "error",
        result: null,
      };
    case "INCREMENT_RECORDING_TIME":
      return { ...state, recordingTime: state.recordingTime + 1 };
    case "RESET_APP":
      if (
        state.recordingState !== "success" &&
        state.recordingState !== "error"
      ) {
        reducerThrower(state, action);
      }
      return {
        ...initialState,
        tone: state.tone, // Keep the tone setting
      };
    default:
      return state;
  }
}

export default function AudioTranscriptionApp() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { recordingState, tone, result, error, recordingTime } = state;

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
      dispatch({
        type: "SET_ERROR",
        payload: "Failed to access microphone. Please check permissions.",
      });
      console.error("Error starting recording:", err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.pause();
      dispatch({ type: "PAUSE_RECORDING" });
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === "paused") {
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
      const transcriptionResult = await transcribeAudio(audioBuffer);

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error || "Transcription failed");
      }

      // Polish and translate
      const processResult = await polishAndTranslateText(
        transcriptionResult.transcript!,
        tone || "professional"
      );

      if (!processResult.success) {
        throw new Error(processResult.error || "Processing failed");
      }

      dispatch({ type: "SET_RESULT", payload: processResult.result! });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Audio Transcription & Translation
          </h1>
          <p className="text-gray-600">
            Record, transcribe, polish, and translate between English and
            Spanish
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Recording Controls
            </CardTitle>
            <CardDescription>
              Record your audio and specify the desired tone for polishing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone (optional)</Label>
              <Input
                id="tone"
                placeholder="e.g., professional, casual, formal, friendly"
                value={tone}
                onChange={(e) =>
                  dispatch({ type: "SET_TONE", payload: e.target.value })
                }
                disabled={recordingState !== "idle"}
              />
            </div>

            <div className="flex items-center justify-center space-x-4">
              {recordingState === "idle" && (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="bg-red-500 hover:bg-red-600"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              )}

              {recordingState === "recording" && (
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

              {recordingState === "paused" && (
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

              {recordingState === "processing" && (
                <Button disabled size="lg">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </Button>
              )}
            </div>

            {(recordingState === "recording" ||
              recordingState === "paused") && (
              <div className="text-center">
                <RecordingTime recordingTime={recordingTime} />
                <p className="text-sm text-gray-500 mt-1">
                  {recordingState === "recording" ? "Recording..." : "Paused"}
                </p>
              </div>
            )}

            {(recordingState === "success" || recordingState === "error") && (
              <div className="flex justify-center">
                <Button onClick={resetApp} variant="outline">
                  Start New Recording
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {recordingState === "error" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-800">
                <h3 className="font-semibold">Error</h3>
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {recordingState === "success" && result && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Original (
                  {result.originalLanguage === "en" ? "English" : "Spanish"})
                  <Badge variant="outline">Source</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Transcription
                  text={result.originalText}
                  title="Raw Transcription"
                  bgColor="gray"
                />
                <Separator />
                <Transcription
                  text={result.polishedOriginal}
                  title="Polished Version"
                  bgColor="blue"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Translation (
                  {result.targetLanguage === "en" ? "English" : "Spanish"})
                  <Badge variant="secondary">Target</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Transcription
                  text={result.translatedText}
                  title="Translation"
                  bgColor="green"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
