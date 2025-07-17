export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";

export const getDefaultApiKey = (): string | undefined => {
  if (isDevelopment) {
    return process.env.OPENAI_API_KEY;
  }
  return undefined;
};
