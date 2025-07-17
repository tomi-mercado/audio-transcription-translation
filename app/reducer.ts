type RecordingState =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "success"
  | "error-result"
  | "error-api-key"
  | "error-microphone";

export interface TranscriptionResult {
  originalText: string;
  originalLanguage: "en" | "es";
  polishedOriginal: string;
  translatedText: string;
  targetLanguage: "en" | "es";
}

interface BaseState {
  recordingState: RecordingState;
  tone: string;
  apiKey?: string;
}

interface ProcessingAppState extends BaseState {
  recordingState: "processing";
  recordingTime: number;
}

interface ErrorAppState extends BaseState {
  recordingState: "error-result" | "error-api-key" | "error-microphone";
  error: string;
}

interface IdleAppState extends BaseState {
  recordingState: "idle";
}

interface RecordingAppState extends BaseState {
  recordingState: "recording";
  recordingTime: number;
}

interface PausedAppState
  extends BaseState,
    Pick<RecordingAppState, "recordingTime"> {
  recordingState: "paused";
}

interface SuccessAppState extends BaseState {
  recordingState: "success";
  result: TranscriptionResult;
}

type AppState =
  | IdleAppState
  | PausedAppState
  | RecordingAppState
  | ProcessingAppState
  | SuccessAppState
  | ErrorAppState;

type AppAction =
  | { type: "START_RECORDING" }
  | { type: "PAUSE_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "SET_TONE"; payload: string }
  | { type: "SET_API_KEY"; payload: string }
  | { type: "SET_RESULT"; payload: TranscriptionResult }
  | { type: "SET_ERROR_RESULT"; payload: string }
  | { type: "SET_ERROR_MICROPHONE" }
  | { type: "SET_ERROR_API_KEY" }
  | { type: "INCREMENT_RECORDING_TIME" }
  | { type: "RESET_APP" };

export const initialState: AppState = {
  recordingState: "idle",
  tone: "",
};

const getThrowError = (state: AppState, action: AppAction) => {
  return `Cannot perform ${action.type} in ${state.recordingState} state`;
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_RECORDING":
      if (state.recordingState !== "idle") {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...state,
        recordingState: "recording",
        recordingTime: 0,
      };

    case "PAUSE_RECORDING":
      if (state.recordingState !== "recording") {
        throw new Error(getThrowError(state, action));
      }
      return { ...state, recordingState: "paused" };

    case "STOP_RECORDING":
      if (state.recordingState !== "recording") {
        throw new Error(getThrowError(state, action));
      }
      return { ...state, recordingState: "processing", recordingTime: 0 };

    case "SET_TONE":
      if (state.recordingState !== "idle") {
        throw new Error(getThrowError(state, action));
      }
      return { ...state, tone: action.payload };

    case "SET_API_KEY":
      if (state.recordingState !== "idle") {
        throw new Error(getThrowError(state, action));
      }
      return { ...state, apiKey: action.payload };

    case "SET_RESULT":
      if (state.recordingState !== "processing") {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...state,
        result: action.payload,
        recordingState: "success",
      };

    case "SET_ERROR_RESULT":
      if (state.recordingState !== "processing") {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...state,
        error: action.payload,
        recordingState: "error-result",
      };

    case "SET_ERROR_API_KEY":
      if (state.recordingState !== "idle") {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...state,
        recordingState: "error-api-key",
        error: "API key is required to process audio",
      };

    case "SET_ERROR_MICROPHONE":
      if (state.recordingState !== "recording") {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...state,
        recordingState: "error-microphone",
        error: "Failed to access microphone. Please check permissions.",
      };

    case "INCREMENT_RECORDING_TIME":
      if (state.recordingState !== "recording") {
        throw new Error(getThrowError(state, action));
      }
      return { ...state, recordingTime: state.recordingTime + 1 };

    case "RESET_APP":
      if (
        state.recordingState !== "success" &&
        state.recordingState !== "error-result"
      ) {
        throw new Error(getThrowError(state, action));
      }
      return {
        ...initialState,
        tone: state.tone, // Keep the tone setting
      };
    default:
      // @ts-expect-error - If this ts expect error throws, it means that there is an action that is not handled
      throw new Error(`Unknown action: ${action.type}`);
  }
}
