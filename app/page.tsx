"use client";

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
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { polishAndTranslateText, transcribeAudio } from "./actions";

type RecordingState = "idle" | "recording" | "paused" | "processing";

interface TranscriptionResult {
  originalText: string;
  originalLanguage: "en" | "es";
  polishedOriginal: string;
  translatedText: string;
  targetLanguage: "en" | "es";
}

export default function AudioTranscriptionApp() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [tone, setTone] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>(
    {}
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);

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
      setRecordingState("recording");
      setRecordingTime(0);
      startTimer();
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.");
      console.error("Error starting recording:", err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.pause();
      setRecordingState("paused");
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === "paused") {
      mediaRecorderRef.current.resume();
      setRecordingState("recording");
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingState("processing");
      stopTimer();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setRecordingState("processing");

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

      setResult(processResult.result!);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during processing"
      );
      console.error("Error processing audio:", err);
    } finally {
      setRecordingState("idle");
      setRecordingTime(0);
    }
  };

  const resetApp = () => {
    setRecordingState("idle");
    setResult(null);
    setError(null);
    setRecordingTime(0);
    setTone("");
    stopTimer();

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [section]: true }));
      toast({
        title: "Copied!",
        description: `${section} copied to clipboard`,
      });

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [section]: false }));
      }, 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
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
                onChange={(e) => setTone(e.target.value)}
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
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {formatTime(recordingTime)}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  {recordingState === "recording" ? "Recording..." : "Paused"}
                </p>
              </div>
            )}

            {(result || error) && (
              <div className="flex justify-center">
                <Button onClick={resetApp} variant="outline">
                  Start New Recording
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-800">
                <h3 className="font-semibold">Error</h3>
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-600">
                      Raw Transcription
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          result.originalText,
                          "Raw Transcription"
                        )
                      }
                      className="h-8 w-8 p-0"
                    >
                      {copiedStates["Raw Transcription"] ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-md">
                    {result.originalText}
                  </p>
                </div>
                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-600">
                      Polished Version
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          result.polishedOriginal,
                          "Polished Version"
                        )
                      }
                      className="h-8 w-8 p-0"
                    >
                      {copiedStates["Polished Version"] ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-gray-800 bg-blue-50 p-3 rounded-md">
                    {result.polishedOriginal}
                  </p>
                </div>
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-600">
                      Translated & Polished
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          result.translatedText,
                          "Translated & Polished"
                        )
                      }
                      className="h-8 w-8 p-0"
                    >
                      {copiedStates["Translated & Polished"] ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-gray-800 bg-green-50 p-3 rounded-md">
                    {result.translatedText}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
