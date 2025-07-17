import { Card, CardContent } from "./ui/card";

export const ErrorFeedback = ({ error }: { error: string }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="text-red-800">
          <h3 className="font-semibold">Error</h3>
          <p>{error}</p>
        </div>
      </CardContent>
    </Card>
  );
};
