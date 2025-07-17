"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface TranscriptionResult {
  id: string;
  timestamp: number;
  originalText: string;
  originalLanguage: "en" | "es";
  polishedOriginal: string;
  translatedText: string;
  targetLanguage: "en" | "es";
  tone?: string;
}

interface ResultsContextType {
  results: TranscriptionResult[];
  loadResults: () => void;
  saveResult: (result: Omit<TranscriptionResult, "id" | "timestamp">) => void;
  deleteResult: (id: string) => void;
  clearAllResults: () => void;
  refreshResults: () => void;
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined);

export function ResultsProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<TranscriptionResult[]>([]);

  const loadResults = () => {
    try {
      const savedResults = localStorage.getItem("transcription-results");
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults) as TranscriptionResult[];
        setResults(parsedResults.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Error loading results from localStorage:", error);
      setResults([]);
    }
  };

  const saveResult = (
    result: Omit<TranscriptionResult, "id" | "timestamp">
  ) => {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
