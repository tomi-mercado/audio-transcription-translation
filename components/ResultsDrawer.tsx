"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useResults } from "@/contexts/ResultsContext";
import { FileText, History, Trash2 } from "lucide-react";
import { useState } from "react";

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

interface ResultsDrawerProps {
  onResultSelect?: (result: TranscriptionResult) => void;
}

export function ResultsDrawer({ onResultSelect }: ResultsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { results, deleteResult, clearAllResults } = useResults();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLanguageLabel = (lang: "en" | "es") => {
    return lang === "en" ? "English" : "Spanish";
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          History ({results.length})
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Transcription History
            </DrawerTitle>
            <DrawerDescription>
              View and manage your saved transcription results
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>No saved transcriptions yet</p>
                <p className="text-sm">
                  Your transcriptions will appear here after completion
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllResults}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {results.map((result) => (
                      <Card key={result.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium">
                                {formatDate(result.timestamp)}
                              </CardTitle>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {getLanguageLabel(result.originalLanguage)} →{" "}
                                  {getLanguageLabel(result.targetLanguage)}
                                </Badge>
                                {result.tone && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.tone}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteResult(result.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Polished Original
                              </p>
                              <p className="text-sm bg-blue-50 p-2 rounded border">
                                {truncateText(result.polishedOriginal)}
                              </p>
                            </div>
                            <Separator />
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Translation
                              </p>
                              <p className="text-sm bg-green-50 p-2 rounded border">
                                {truncateText(result.translatedText)}
                              </p>
                            </div>
                          </div>
                          {onResultSelect && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3"
                              onClick={() => {
                                onResultSelect(result);
                                setIsOpen(false);
                              }}
                            >
                              View Full Result
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
