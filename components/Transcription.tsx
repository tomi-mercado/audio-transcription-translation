import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

const TIME_TO_SHOW_COPIED = 2000;

const bgColors = {
  gray: "bg-gray-50",
  blue: "bg-blue-50",
  green: "bg-green-50",
} as const;

export const Transcription = ({
  text,
  title,
  bgColor,
}: {
  title: string;
  text: string;
  bgColor: keyof typeof bgColors;
}) => {
  const { toast } = useToast();
  const [showCopied, setShowCopied] = useState(false);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      toast({
        title: "Copied!",
        description: `${section} copied to clipboard`,
      });

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setShowCopied(false);
      }, TIME_TO_SHOW_COPIED);
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-600">{title}</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(text, title)}
          className="h-8 w-8 p-0"
        >
          {showCopied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className={cn("text-gray-800 p-3 rounded-md", bgColors[bgColor])}>
        {text}
      </p>
    </div>
  );
};
