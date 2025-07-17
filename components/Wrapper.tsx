"use client";

import { ResultsDrawer } from "@/components/ResultsDrawer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mic } from "lucide-react";

export const Wrapper = ({
  children,
  feedback,
}: {
  children: React.ReactNode;
  feedback: React.ReactNode;
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-end">
          <ResultsDrawer />
        </div>
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
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>

        {feedback}
      </div>
    </div>
  );
};
