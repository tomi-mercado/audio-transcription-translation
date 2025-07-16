import { Badge } from "./ui/badge";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export const RecordingTime = ({ recordingTime }: { recordingTime: number }) => {
  return (
    <Badge variant="secondary" className="text-lg px-4 py-2">
      {formatTime(recordingTime)}
    </Badge>
  );
};
