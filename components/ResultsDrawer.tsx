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
import { Transcription } from "./Transcription";

export function ResultsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { results, deleteResult, clearAllResults } = useResults();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLanguageLabel = (lang: "en" | "es") => {
    return lang === "en" ? "English" : "Spanish";
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
                            <Transcription
                              title="Polished Original"
                              text={result.polishedOriginal}
                              bgColor="blue"
                              showTruncate={true}
                              maxLength={100}
                            />
                            <Separator />
                            <Transcription
                              title="Translation"
                              text={result.translatedText}
                              bgColor="green"
                              showTruncate={true}
                              maxLength={100}
                            />
                          </div>
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
