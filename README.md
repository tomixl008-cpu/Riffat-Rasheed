# Auto Text Tapper (React Edition)

A user-controlled automation assistant and state-machine runner, rewritten from Android Kotlin into modern React and TypeScript.

## Authorized-use notice

This application is for automating **apps, screens, and accounts that the user is authorized to automate.** The app performs no action until the user explicitly presses **Start**, and everything stops immediately when **Stop** is pressed.

The application deliberately does **not** implement: screenshot capture, OCR, overlays, hidden background behavior, CAPTCHA handling, ad-click automation, banking/payment/OTP/password/login automation, protected-screen bypasses, or anti-detection methods. It only scans configured accessibility text / node labels and triggers user-controlled tap and app-switch routines.

## Behavior Flow

```
Start -> wait 5s -> Main Scan (Like video priority over Skip)
                       |
          -------------------------------
          |                             |
     "Like video" found            "Skip" found (only if
          |                         "Like video" absent)
          v                             v
      Like route                    Skip route
```

### Like video route

1. Click **Like video**.
2. Wait 5 seconds (`WAIT_AFTER_LIKE_MS`).
3. Double-tap the exact centre of the screen (`TAP_DURATION_MS`, `DOUBLE_TAP_GAP_MS`).
4. Double-tap the Recents/Overview action (`RECENTS_DOUBLE_TAP_GAP_MS`) to switch directly to the previously opened app.
5. Wait for the "Loading" indicator to appear and then disappear (checked every second; 30-second timeout if "Loading" never appears at all).
6. Once loading is gone, wait 1 second extra (`LOADING_SETTLE_DELAY_MS`), then return to Main Scan.

**Priority rule:** if "Like video" and "Skip" are both visible, only "Like video" is clicked. Skip is only ever considered when "Like video" is completely absent from the screen.

### Skip route

1. Click **Skip**.
2. Wait exactly 4 seconds (`WAIT_AFTER_SKIP_MS`).
3. Return directly to Main Scan. No double-tap, no app switch, no Loading wait.

### Stop rule

Pressing **Stop** immediately cancels every pending delay, scan, retry, tap, and swipe in flight, sets the internal state to `IDLE`, and shows "Stopped". No further action happens until Start is pressed again.

## Features

- **Android Controller UI**: Exact reproduction of the Android activity controls (Live Status text, Priority Notice, Accessibility Settings toggle, Start with 5s delay, and Stop).
- **Live Target Screen Simulator**: Interactive mobile frame simulating the target app with real-time video feed cards, accessible nodes ("Like video", "Skip", "Loading"), double-tap ripples, and recent apps switcher.
- **Finite State Machine Visualizer**: Real-time interactive state graph tracking every transition.
- **Tunable Configuration**: Complete timing & text customization (`LIKE_VIDEO_TEXT`, `SKIP_TEXT`, `LOADING_TEXT`, delays, gaps).
- **Execution Event Log**: Timestamped terminal log recording all state transitions, gesture dispatches, and scan evaluations.

## Development

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```
