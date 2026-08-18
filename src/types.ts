export enum AutomationState {
  IDLE = 'IDLE',
  INITIAL_WAIT = 'INITIAL_WAIT',
  FIND_LIKE_OR_SKIP = 'FIND_LIKE_OR_SKIP',
  WAIT_AFTER_LIKE = 'WAIT_AFTER_LIKE',
  DOUBLE_TAP_CENTER = 'DOUBLE_TAP_CENTER',
  OPEN_RECENTS = 'OPEN_RECENTS',
  SWITCH_TO_PREVIOUS_APP = 'SWITCH_TO_PREVIOUS_APP',
  WAIT_FOR_LOADING = 'WAIT_FOR_LOADING',
  WAIT_FOR_LOADING_TO_FINISH = 'WAIT_FOR_LOADING_TO_FINISH',
  WAIT_AFTER_LOADING_FINISH = 'WAIT_AFTER_LOADING_FINISH',
  WAIT_AFTER_SKIP = 'WAIT_AFTER_SKIP',
}

export interface AutomationConfig {
  likeVideoText: string;
  skipText: string;
  loadingText: string;
  initialDelayMs: number;
  waitAfterLikeMs: number;
  waitAfterSkipMs: number;
  mainScanIntervalMs: number;
  loadingSettleDelayMs: number;
  loadingTimeoutMs: number;
  tapDurationMs: number;
  doubleTapGapMs: number;
  recentsDoubleTapGapMs: number;
}

export const DEFAULT_CONFIG: AutomationConfig = {
  likeVideoText: 'Like video',
  skipText: 'Skip',
  loadingText: 'Loading',
  initialDelayMs: 5000,
  waitAfterLikeMs: 5000,
  waitAfterSkipMs: 4000,
  mainScanIntervalMs: 1000,
  loadingSettleDelayMs: 1000,
  loadingTimeoutMs: 30000,
  tapDurationMs: 60,
  doubleTapGapMs: 150,
  recentsDoubleTapGapMs: 150,
};

export interface LogEntry {
  id: string;
  timestamp: string;
  state: AutomationState;
  message: string;
  type: 'info' | 'action' | 'gesture' | 'status' | 'warning';
}

export interface GestureEvent {
  id: string;
  type: 'tap' | 'double_tap' | 'recents';
  x?: number;
  y?: number;
  timestamp: number;
}
