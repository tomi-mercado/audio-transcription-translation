"use server";

import { experimental_transcribe as transcribe, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { LANGUAGES } from "@/constants";
import { z } from "zod";

interface SuccessTranscriptionResult {
  success: true;
  transcript: string;
}

interface ErrorTranscriptionResult {
  success: false;
  error: string;
}

type TranscriptionResult =
  | SuccessTranscriptionResult
  | ErrorTranscriptionResult;

interface SuccessResult {
  success: true;
  result: {
    originalText: string;
    originalLanguage: "en" | "es";
    polishedOriginal: string;
    translatedText: string;
    targetLanguage: "en" | "es";
  };
}

interface ErrorResult {
  success: false;
  error: string;
}

type ProcessingResult = SuccessResult | ErrorResult;

const getOpenAI = (apiKey?: string) => {
  return createOpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
};

export async function transcribeAudio({
  audioBuffer,
  apiKey,
}: {
  audioBuffer: Uint8Array;
  apiKey?: string;
}): Promise<TranscriptionResult> {
  const openai = getOpenAI(apiKey);

  try {
    const result = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: audioBuffer,
    });

    return {
      success: true,
      transcript: result.text,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      error: "Failed to transcribe audio. Please try again.",
    };
  }
}

const polishParseResultSchema = z.object({
  detectedLanguage: z.enum(
    Object.keys(LANGUAGES) as [
      keyof typeof LANGUAGES,
      ...(keyof typeof LANGUAGES)[]
    ]
  ),
  polishedText: z.string(),
});

const polishment = async ({
  text,
  tone,
  openai,
}: {
  text: string;
  tone: string;
  openai: ReturnType<typeof createOpenAI>;
}) => {
  const polishResult = await generateText({
    model: openai("gpt-4.1-nano"),
    prompt: `
      Analyze this text and:
      1. Detect if it's primarily in English or Spanish
      2. Polish and improve the text ${
        tone ? `while maintaining the ${tone} tone` : ""
      }
      3. Fix any grammar, spelling, or clarity issues
      4. Keep the same language as the original

      Text: "${text}"

      Respond in this exact JSON format, without adding \`\`\`json or \`\`\`. The response should be a valid JSON object:
      {
        "detectedLanguage": "en" or "es",
        "polishedText": "the polished version in the same language"
      }
    `,
  });

  let polishJSON;
  try {
    polishJSON = JSON.parse(polishResult.text);
  } catch {
    console.error(
      "Failed to parse language detection response",
      polishResult.text
    );
    throw new Error("Failed to parse language detection response");
  }

  const polishData = polishParseResultSchema.parse(polishJSON);

  return polishData;
};

const translation = async ({
  text,
  tone,
  targetLanguage,
  originalLanguage,
  openai,
}: {
  text: string;
  tone: string;
  targetLanguage: keyof typeof LANGUAGES;
  originalLanguage: keyof typeof LANGUAGES;
  openai: ReturnType<typeof createOpenAI>;
}) => {
  const translationResult = await generateText({
    model: openai("gpt-4.1-nano"),
    prompt: `
      Translate this ${LANGUAGES[originalLanguage]} text to ${LANGUAGES[targetLanguage]}.
      Maintain the ${tone} tone and ensure the translation is natural and fluent.
      Only respond with the translated text, nothing else.

      Text to translate: "${text}"
    `,
  });

  return translationResult.text.trim();
};

export async function polishAndTranslateText({
  text,
  tone,
  apiKey,
}: {
  text: string;
  tone: string;
  apiKey?: string;
}): Promise<ProcessingResult> {
  const openai = getOpenAI(apiKey);

  try {
    const {
      detectedLanguage: originalLanguage,
      polishedText: polishedOriginal,
    } = await polishment({ text, tone, openai });
    const targetLanguage = originalLanguage === "en" ? "es" : "en";

    const translatedText = await translation({
      text: polishedOriginal,
      tone,
      targetLanguage,
      originalLanguage,
      openai,
    });

    return {
      success: true,
      result: {
        originalText: text,
        originalLanguage,
        polishedOriginal,
        translatedText,
        targetLanguage,
      },
    };
  } catch (error) {
    console.error("Processing error:", error);
    return {
      success: false,
      error: "Failed to process text. Please try again.",
    };
  }
}
