import { AutomationConfig, AutomationState, DEFAULT_CONFIG, GestureEvent, LogEntry } from '../types';

export type StatusListener = (status: string, state: AutomationState) => void;
export type LogListener = (entry: LogEntry) => void;
export type GestureListener = (gesture: GestureEvent) => void;
export type TargetScreenInspector = () => {
  hasLikeVideo: boolean;
  hasSkip: boolean;
  hasLoading: boolean;
  performClick: (target: 'like' | 'skip') => boolean;
};

export class AutomationEngine {
  private config: AutomationConfig = { ...DEFAULT_CONFIG };
  private state: AutomationState = AutomationState.IDLE;
  private isServiceEnabled: boolean = true;
  private isServiceConnected: boolean = true;
  private sessionId: number = 0;

  private timeouts: number[] = [];
  private intervals: number[] = [];

  private statusListeners = new Set<StatusListener>();
  private logListeners = new Set<LogListener>();
  private gestureListeners = new Set<GestureListener>();

  private targetInspector: TargetScreenInspector | null = null;
  private loadingWaitStartElapsed: number = 0;

  constructor(initialConfig?: Partial<AutomationConfig>) {
    if (initialConfig) {
      this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    }
  }

  public updateConfig(newConfig: Partial<AutomationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): AutomationConfig {
    return { ...this.config };
  }

  public setServiceEnabled(enabled: boolean) {
    this.isServiceEnabled = enabled;
    if (!enabled && this.state !== AutomationState.IDLE) {
      this.stopAutomation();
    }
    this.notifyStatus(
      enabled
        ? 'Service enabled and ready. Press Start when ready.'
        : 'Accessibility service is disabled. Enable it, then press Start.',
      this.state
    );
  }

  public getServiceEnabled(): boolean {
    return this.isServiceEnabled;
  }

  public setServiceConnected(connected: boolean) {
    this.isServiceConnected = connected;
  }

  public getServiceConnected(): boolean {
    return this.isServiceConnected;
  }

  public setTargetInspector(inspector: TargetScreenInspector | null) {
    this.targetInspector = inspector;
  }

  public getState(): AutomationState {
    return this.state;
  }

  public addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public addLogListener(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public addGestureListener(listener: GestureListener): () => void {
    this.gestureListeners.add(listener);
    return () => this.gestureListeners.delete(listener);
  }

  private notifyStatus(status: string, state: AutomationState) {
    this.statusListeners.forEach((l) => l(status, state));
  }

  private triggerGesture(gesture: Omit<GestureEvent, 'id' | 'timestamp'>) {
    const event: GestureEvent = {
      ...gesture,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    };
    this.gestureListeners.forEach((l) => l(event));
  }

  private clearAllTimers() {
    this.timeouts.forEach((id) => window.clearTimeout(id));
    this.intervals.forEach((id) => window.clearInterval(id));
    this.timeouts = [];
    this.intervals = [];
  }

  private safeSetTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this.timeouts = this.timeouts.filter((t) => t !== id);
      fn();
    }, ms);
    this.timeouts.push(id);
    return id;
  }

  public startAutomation(): boolean {
    if (!this.isServiceEnabled) {
      this.notifyStatus('Accessibility service is disabled. Enable it, then press Start.', this.state);
      return false;
    }

    if (!this.isServiceConnected) {
      this.notifyStatus('Service connection pending. Turn it off/on in Settings.', this.state);
      return false;
    }

    this.clearAllTimers();
    this.sessionId++;
    const session = this.sessionId;

    this.state = AutomationState.INITIAL_WAIT;
    let secondsLeft = Math.ceil(this.config.initialDelayMs / 1000);
    this.notifyStatus(`Started: waiting ${secondsLeft} seconds`, this.state);

    const intervalId = window.setInterval(() => {
      if (!this.isCurrentSession(session)) {
        window.clearInterval(intervalId);
        return;
      }
      secondsLeft--;
      if (secondsLeft > 0) {
        this.notifyStatus(`Started: waiting ${secondsLeft} second${secondsLeft > 1 ? 's' : ''}`, this.state);
      } else {
        window.clearInterval(intervalId);
        this.intervals = this.intervals.filter((id) => id !== intervalId);
        if (session === this.sessionId) {
          this.state = AutomationState.FIND_LIKE_OR_SKIP;
          this.notifyStatus('Service active', this.state);
          this.performMainScan(session);
        }
      }
    }, 1000);
    this.intervals.push(intervalId);

    return true;
  }

  public stopAutomation() {
    this.sessionId++;
    this.clearAllTimers();
    this.state = AutomationState.IDLE;
    this.notifyStatus('Service stopped', this.state);
  }

  private isCurrentSession(session: number): boolean {
    return session === this.sessionId && this.state !== AutomationState.IDLE;
  }

  private performMainScan(session: number) {
    if (!this.isCurrentSession(session) || this.state !== AutomationState.FIND_LIKE_OR_SKIP) return;

    this.notifyStatus('Service active', this.state);

    if (!this.targetInspector) {
      this.safeSetTimeout(() => {
        if (!this.isCurrentSession(session)) return;
        this.onLikeVideoClicked(session);
      }, 4000);
      return;
    }

    const { hasLikeVideo, hasSkip, performClick } = this.targetInspector();

    if (hasLikeVideo) {
      const clicked = performClick('like');
      if (clicked) {
        this.triggerGesture({ type: 'tap' });
        this.onLikeVideoClicked(session);
      } else {
        this.safeSetTimeout(() => this.performMainScan(session), this.config.mainScanIntervalMs);
      }
      return;
    }

    if (hasSkip) {
      const clicked = performClick('skip');
      if (clicked) {
        this.triggerGesture({ type: 'tap' });
        this.onSkipClicked(session);
      } else {
        this.safeSetTimeout(() => this.performMainScan(session), this.config.mainScanIntervalMs);
      }
      return;
    }

    this.safeSetTimeout(() => {
      this.performMainScan(session);
    }, this.config.mainScanIntervalMs);
  }

  private onLikeVideoClicked(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.WAIT_AFTER_LIKE;
    this.notifyStatus('Service active', this.state);

    this.safeSetTimeout(() => {
      if (!this.isCurrentSession(session)) return;

      this.state = AutomationState.DOUBLE_TAP_CENTER;
      this.notifyStatus('Service active', this.state);

      this.doubleTapCentre(session, (success) => {
        if (!this.isCurrentSession(session)) return;
        if (success) {
          this.switchToPreviousApp(session);
        } else {
          this.abortRouteToMainScan(session);
        }
      });
    }, this.config.waitAfterLikeMs);
  }

  private doubleTapCentre(session: number, onResult: (success: boolean) => void) {
    this.triggerGesture({ type: 'double_tap' });
    this.safeSetTimeout(() => {
      if (!this.isCurrentSession(session)) {
        onResult(false);
        return;
      }
      onResult(true);
    }, this.config.tapDurationMs * 2 + this.config.doubleTapGapMs);
  }

  private switchToPreviousApp(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.OPEN_RECENTS;
    this.notifyStatus('Service active', this.state);
    this.triggerGesture({ type: 'recents' });

    this.safeSetTimeout(() => {
      if (!this.isCurrentSession(session)) return;

      this.state = AutomationState.SWITCH_TO_PREVIOUS_APP;
      this.notifyStatus('Service active', this.state);
      this.triggerGesture({ type: 'recents' });
      this.beginLoadingWait(session);
    }, this.config.recentsDoubleTapGapMs);
  }

  private abortRouteToMainScan(session: number) {
    if (!this.isCurrentSession(session)) return;
    this.state = AutomationState.FIND_LIKE_OR_SKIP;
    this.notifyStatus('Service active', this.state);
    this.safeSetTimeout(() => {
      this.performMainScan(session);
    }, this.config.mainScanIntervalMs);
  }

  private beginLoadingWait(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.WAIT_FOR_LOADING;
    this.loadingWaitStartElapsed = Date.now();
    this.notifyStatus('Service active', this.state);

    this.performLoadingCheck(session);
  }

  private performLoadingCheck(session: number) {
    if (!this.isCurrentSession(session)) return;
    if (
      this.state !== AutomationState.WAIT_FOR_LOADING &&
      this.state !== AutomationState.WAIT_FOR_LOADING_TO_FINISH
    ) {
      return;
    }

    if (!this.targetInspector) {
      this.safeSetTimeout(() => this.finishLoadingWait(session), 2000);
      return;
    }

    const { hasLikeVideo, hasSkip, hasLoading } = this.targetInspector();
    const targetScreenReady = hasLikeVideo || hasSkip;

    if (this.state === AutomationState.WAIT_FOR_LOADING) {
      if (targetScreenReady) {
        this.finishLoadingWait(session);
      } else if (hasLoading) {
        this.state = AutomationState.WAIT_FOR_LOADING_TO_FINISH;
        this.notifyStatus('Service active', this.state);
        this.safeSetTimeout(() => this.performLoadingCheck(session), this.config.mainScanIntervalMs);
      } else {
        const elapsed = Date.now() - this.loadingWaitStartElapsed;
        if (elapsed >= this.config.loadingTimeoutMs) {
          this.returnToMainScanAfterLoading(session);
        } else {
          this.safeSetTimeout(() => this.performLoadingCheck(session), this.config.mainScanIntervalMs);
        }
      }
    } else if (this.state === AutomationState.WAIT_FOR_LOADING_TO_FINISH) {
      if (hasLoading && !targetScreenReady) {
        this.safeSetTimeout(() => this.performLoadingCheck(session), this.config.mainScanIntervalMs);
      } else {
        this.finishLoadingWait(session);
      }
    }
  }

  private finishLoadingWait(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.WAIT_AFTER_LOADING_FINISH;
    this.notifyStatus('Service active', this.state);

    this.safeSetTimeout(() => {
      if (!this.isCurrentSession(session)) return;
      this.returnToMainScanAfterLoading(session);
    }, this.config.loadingSettleDelayMs);
  }

  private returnToMainScanAfterLoading(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.FIND_LIKE_OR_SKIP;
    this.notifyStatus('Service active', this.state);
    this.performMainScan(session);
  }

  private onSkipClicked(session: number) {
    if (!this.isCurrentSession(session)) return;

    this.state = AutomationState.WAIT_AFTER_SKIP;
    this.notifyStatus('Service active', this.state);

    this.safeSetTimeout(() => {
      if (!this.isCurrentSession(session)) return;
      this.state = AutomationState.FIND_LIKE_OR_SKIP;
      this.notifyStatus('Service active', this.state);
      this.performMainScan(session);
    }, this.config.waitAfterSkipMs);
  }
}

export const globalEngine = new AutomationEngine();
