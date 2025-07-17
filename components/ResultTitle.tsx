import { LANGUAGES } from "@/constants";
import { Badge } from "./ui/badge";
import { CardTitle } from "./ui/card";

export const ResultTitle = ({
  originalLanguage,
  currentLanguage,
  targetLanguage,
}: {
  currentLanguage: keyof typeof LANGUAGES;
  originalLanguage: keyof typeof LANGUAGES;
  targetLanguage: keyof typeof LANGUAGES;
}) => {
  const isTranslation = currentLanguage === targetLanguage;
  return (
    <CardTitle className="flex items-center justify-between">
      {isTranslation ? "Translation" : "Original"} (
      {LANGUAGES[isTranslation ? targetLanguage : originalLanguage]})
      <Badge variant="secondary">{isTranslation ? "Target" : "Source"}</Badge>
    </CardTitle>
  );
};
