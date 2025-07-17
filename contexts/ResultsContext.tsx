"use client";

import { LANGUAGES } from "@/constants";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";

const transcriptionResultSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  originalText: z.string(),
  originalLanguage: z.enum(
    Object.keys(LANGUAGES) as [
      keyof typeof LANGUAGES,
      ...(keyof typeof LANGUAGES)[]
    ]
  ),
  polishedOriginal: z.string(),
  translatedText: z.string(),
  targetLanguage: z.enum(
    Object.keys(LANGUAGES) as [
      keyof typeof LANGUAGES,
      ...(keyof typeof LANGUAGES)[]
    ]
  ),
  tone: z.string().optional(),
});

type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;

interface ResultsContextType {
  results: TranscriptionResult[];
  loadResults: () => void;
  saveResult: (result: Omit<TranscriptionResult, "id" | "timestamp">) => void;
  deleteResult: (id: string) => void;
  clearAllResults: () => void;
  refreshResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [results, setResults] = useState<TranscriptionResult[]>([]);

  const loadResults = () => {
    let savedResults;
    try {
      const localStorageResults = localStorage.getItem("transcription-results");

      if (!localStorageResults) {
        setResults([]);
        return;
      }

      savedResults = JSON.parse(localStorageResults);
    } catch (error) {
      console.error("Error loading results from localStorage:", error);
      setResults([]);
    }

    if (!Array.isArray(savedResults)) {
      setResults([]);
      return;
    }

    const parseResults = savedResults.map((result) =>
      transcriptionResultSchema.safeParse(result)
    );
    const validResults = parseResults.filter((result) => result.success);

    setResults(validResults.map((result) => result.data));
  };

  const saveResult = (
    result: Omit<TranscriptionResult, "id" | "timestamp">
  ) => {
    try {
      const id = crypto.randomUUID();
      const newResult: TranscriptionResult = {
        ...result,
        id,
        timestamp: Date.now(),
      };

      const updatedResults = [newResult, ...results];
      localStorage.setItem(
        "transcription-results",
        JSON.stringify(updatedResults)
      );
      setResults(updatedResults);
    } catch (error) {
      console.error("Error saving result to localStorage:", error);
    }
  };

  const deleteResult = (id: string) => {
    try {
      const updatedResults = results.filter((result) => result.id !== id);
      localStorage.setItem(
        "transcription-results",
        JSON.stringify(updatedResults)
      );
      setResults(updatedResults);
    } catch (error) {
      console.error("Error deleting result:", error);
    }
  };

  const clearAllResults = () => {
    try {
      localStorage.removeItem("transcription-results");
      setResults([]);
    } catch (error) {
      console.error("Error clearing results:", error);
    }
  };

  const refreshResults = () => {
    loadResults();
  };

  // Load results on mount
  useEffect(() => {
    loadResults();
  }, []);

  const value: ResultsContextType = useMemo(
    () => ({
      results,
      loadResults,
      saveResult,
      deleteResult,
      clearAllResults,
      refreshResults,
    }),
    [
      results,
      loadResults,
      saveResult,
      deleteResult,
      clearAllResults,
      refreshResults,
    ]
  );

  return (
    <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
  );
}

export function useResults() {
  const context = useContext(ResultsContext);
  if (context === undefined) {
    throw new Error("useResults must be used within a ResultsProvider");
  }
  return context;
}
