"use server"

import { experimental_transcribe as transcribe } from "ai"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface TranscriptionResult {
  success: boolean
  transcript?: string
  error?: string
}

interface ProcessingResult {
  success: boolean
  result?: {
    originalText: string
    originalLanguage: "en" | "es"
    polishedOriginal: string
    translatedText: string
    targetLanguage: "en" | "es"
  }
  error?: string
}

export async function transcribeAudio(audioBuffer: Uint8Array): Promise<TranscriptionResult> {
  try {
    const result = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: audioBuffer,
    })

    return {
      success: true,
      transcript: result.text,
    }
  } catch (error) {
    console.error("Transcription error:", error)
    return {
      success: false,
      error: "Failed to transcribe audio. Please try again.",
    }
  }
}

export async function polishAndTranslateText(text: string, tone: string): Promise<ProcessingResult> {
  try {
    // First, detect the language and polish the original text
    const polishResult = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Analyze this text and:
        1. Detect if it's primarily in English or Spanish
        2. Polish and improve the text while maintaining the ${tone} tone
        3. Fix any grammar, spelling, or clarity issues
        4. Keep the same language as the original

        Text: "${text}"

        Respond in this exact JSON format:
        {
          "detectedLanguage": "en" or "es",
          "polishedText": "the polished version in the same language"
        }
      `,
    })

    let polishData
    try {
      polishData = JSON.parse(polishResult.text)
    } catch {
      throw new Error("Failed to parse language detection response")
    }

    const originalLanguage = polishData.detectedLanguage as "en" | "es"
    const polishedOriginal = polishData.polishedText
    const targetLanguage = originalLanguage === "en" ? "es" : "en"

    // Now translate to the target language
    const translateResult = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Translate this ${originalLanguage === "en" ? "English" : "Spanish"} text to ${targetLanguage === "en" ? "English" : "Spanish"}.
        Maintain the ${tone} tone and ensure the translation is natural and fluent.
        Only respond with the translated text, nothing else.

        Text to translate: "${polishedOriginal}"
      `,
    })

    return {
      success: true,
      result: {
        originalText: text,
        originalLanguage,
        polishedOriginal,
        translatedText: translateResult.text.trim(),
        targetLanguage,
      },
    }
  } catch (error) {
    console.error("Processing error:", error)
    return {
      success: false,
      error: "Failed to process text. Please try again.",
    }
  }
}
