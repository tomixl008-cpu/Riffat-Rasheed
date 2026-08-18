import React, { useState, useEffect } from 'react';
import { globalEngine } from './services/automationEngine';
import { AutomationState } from './types';
import { AccessibilityModal } from './components/AccessibilityModal';
import { SubscriptionModal, SubscriptionInfo } from './components/SubscriptionModal';
import { Crown, CheckCircle2, WifiOff, RefreshCw, Wifi } from 'lucide-react';

export const App: React.FC = () => {
  const [state, setState] = useState<AutomationState>(globalEngine.getState());
  const [status, setStatus] = useState<string>('Service enabled and ready. Press Start when ready.');
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean>(globalEngine.getServiceEnabled());
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState<boolean>(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState<boolean>(false);

  // Real-time Online / Offline connectivity check
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);

  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    isActive: false,
    plan: 'FanTik Coins VIP Pass',
    price: '$2.33 / month',
    startedAt: null,
    expiresAt: null,
    email: null,
    paymentMethod: null,
    subscriptionId: null,
  });

  const checkConnectivity = async () => {
    setIsCheckingConnection(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => checkConnectivity();
    const handleOffline = () => {
      setIsOnline(false);
      if (globalEngine.getState() !== AutomationState.IDLE) {
        globalEngine.stopAutomation();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnectivity();

    const unsubStatus = globalEngine.addStatusListener((newStatus, newState) => {
      setStatus(newStatus);
      setState(newState);
    });

    // Fetch initial subscription status
    fetch('/api/subscription/status')
      .then((res) => res.json())
      .then((data) => {
        if (data) setSubscription(data);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubStatus();
    };
  }, []);

  const handleStart = () => {
    if (!isOnline) {
      setStatus('No internet connection. Please connect to the internet.');
      return;
    }

    if (!isServiceEnabled) {
      setStatus('Accessibility service is disabled. Enable it, then press Start.');
      setIsAccessibilityOpen(true);
      return;
    }

    const started = globalEngine.startAutomation();
    if (!started) {
      setStatus('Service is not connected yet. Turn it off/on in Accessibility Settings, then try again.');
    }
  };

  const handleStop = () => {
    globalEngine.stopAutomation();
  };

  const handleToggleService = (enabled: boolean) => {
    setIsServiceEnabled(enabled);
    globalEngine.setServiceEnabled(enabled);
  };

  const isRunning = state !== AutomationState.IDLE;

  // Offline Fullscreen View
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-7 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <WifiOff className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-100">No Internet Connection</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              FanTik Coins requires an active internet connection to synchronize rewards and run automation.
            </p>
          </div>

          <button
            onClick={checkConnectivity}
            disabled={isCheckingConnection}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm border border-emerald-500/50 shadow-md transition cursor-pointer flex items-center justify-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
            <span>{isCheckingConnection ? 'Checking Connection...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      {/* Original Android Activity Layout Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Title Header with Online Indicator & Subscription Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 id="titleText" className="text-2xl font-bold text-slate-100 tracking-tight">
              FanTik Coins
            </h1>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <Wifi className="w-2.5 h-2.5" />
              <span>Online</span>
            </span>
          </div>

          {/* Subscription Button / Badge ($2.33) */}
          <button
            onClick={() => setIsSubscriptionOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
              subscription.isActive
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}
          >
            {subscription.isActive ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>VIP Active</span>
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5" />
                <span>VIP $2.33/mo</span>
              </>
            )}
          </button>
        </div>

        {/* Live Status Text matching @id/statusText */}
        <div className="min-h-[50px] flex items-center bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3">
          <p
            id="statusText"
            className={`text-base transition-colors ${
              isRunning
                ? 'text-emerald-400 font-medium'
                : !isServiceEnabled
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {status}
          </p>
        </div>

        {/* Clean assistant notice */}
        <p className="text-sm text-slate-400 leading-relaxed">
          Automated coins and rewards collector assistant.
        </p>

        {/* Action Buttons matching activity_main.xml layout */}
        <div className="space-y-3 pt-2">
          {/* Open Accessibility Settings Button */}
          <button
            id="openAccessibilityButton"
            type="button"
            onClick={() => setIsAccessibilityOpen(true)}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-medium rounded-xl border border-slate-700/60 transition cursor-pointer text-sm shadow-sm"
          >
            Open Accessibility Settings
          </button>

          {/* Start Button */}
          <button
            id="startButton"
            type="button"
            onClick={handleStart}
            disabled={isRunning}
            className={`w-full py-3.5 px-4 font-semibold rounded-xl text-sm transition shadow-md cursor-pointer ${
              isRunning
                ? 'bg-slate-800 text-slate-500 border border-slate-700/30 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50'
            }`}
          >
            Start (5-second delay)
          </button>

          {/* Stop Button */}
          <button
            id="stopButton"
            type="button"
            onClick={handleStop}
            className="w-full py-3 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-medium rounded-xl text-sm transition cursor-pointer shadow-sm"
          >
            Stop
          </button>
        </div>

        {/* Disclosure text */}
        <p className="text-xs text-slate-500 italic leading-relaxed text-center pt-2">
          Accessibility permission is required for user-controlled automation. Use only on screens and apps you are authorized to automate.
        </p>
      </div>

      {/* Accessibility Settings Modal */}
      <AccessibilityModal
        isOpen={isAccessibilityOpen}
        onClose={() => setIsAccessibilityOpen(false)}
        isServiceEnabled={isServiceEnabled}
        onToggleService={handleToggleService}
      />

      {/* $2.33 VIP Global Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        subscription={subscription}
        onSubscribeSuccess={(sub) => setSubscription(sub)}
        onCancelSuccess={() =>
          setSubscription({
            isActive: false,
            plan: 'FanTik Coins VIP Pass',
            price: '$2.33 / month',
            startedAt: null,
            expiresAt: null,
            email: null,
            paymentMethod: null,
            subscriptionId: null,
          })
        }
      />
    </div>
  );
};

export default App;
