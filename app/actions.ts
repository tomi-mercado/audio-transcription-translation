"use server";

import { experimental_transcribe as transcribe, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { LANGUAGES } from "@/constants";
import { z } from "zod";

interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

interface ProcessingResult {
  success: boolean;
  result?: {
    originalText: string;
    originalLanguage: "en" | "es";
    polishedOriginal: string;
    translatedText: string;
    targetLanguage: "en" | "es";
  };
  error?: string;
}

export async function transcribeAudio(
  audioBuffer: Uint8Array
): Promise<TranscriptionResult> {
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

const polishment = async ({ text, tone }: { text: string; tone: string }) => {
  const polishResult = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `
      Analyze this text and:
      1. Detect if it's primarily in English or Spanish
      2. Polish and improve the text while maintaining the ${tone} tone
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
}: {
  text: string;
  tone: string;
  targetLanguage: keyof typeof LANGUAGES;
  originalLanguage: keyof typeof LANGUAGES;
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

export async function polishAndTranslateText(
  text: string,
  tone: string
): Promise<ProcessingResult> {
  try {
    const {
      detectedLanguage: originalLanguage,
      polishedText: polishedOriginal,
    } = await polishment({ text, tone });
    const targetLanguage = originalLanguage === "en" ? "es" : "en";

    const translatedText = await translation({
      text: polishedOriginal,
      tone,
      targetLanguage,
      originalLanguage,
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
