import { TranscriptionResult } from "@/app/reducer";
import { ResultTitle } from "./ResultTitle";
import { Transcription } from "./Transcription";
import { Card, CardContent, CardHeader } from "./ui/card";

export const Result = ({ result }: { result: TranscriptionResult }) => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <ResultTitle
            originalLanguage={result.originalLanguage}
            currentLanguage={result.originalLanguage}
            targetLanguage={result.targetLanguage}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <Transcription
            text={result.polishedOriginal}
            title="Polished Version"
            bgColor="blue"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <ResultTitle
            originalLanguage={result.originalLanguage}
            currentLanguage={result.targetLanguage}
            targetLanguage={result.targetLanguage}
          />
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
  );
};
