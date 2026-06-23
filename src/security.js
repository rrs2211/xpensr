/**
 * XpensR Security Hardening Module
 * 
 * Loaded before main app — applies all browser-level protections.
 * This file runs in production only (tree-shaken in dev).
 */

// ── 1. Strip devtools access to app state ─────────────────────────────────────
// Block direct React DevTools from exposing component state
// (Does not block DevTools entirely — just removes the __REACT_DEVTOOLS_GLOBAL_HOOK__)
if (import.meta.env.PROD) {
  try {
    // Neuter React DevTools hook before React loads
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      get: () => ({ isDisabled: true, supportsFiber: false, inject: () => {}, onCommitFiberRoot: () => {}, onCommitFiberUnmount: () => {} }),
      configurable: false,
    });
  } catch {}

  // ── 2. Disable right-click context menu ────────────────────────────────────
  document.addEventListener('contextmenu', e => e.preventDefault());

  // ── 3. Block F12, Ctrl+Shift+I/J/C/U (devtools shortcuts) ─────────────────
  document.addEventListener('keydown', e => {
    // F12
    if (e.key === 'F12') { e.preventDefault(); return; }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && ['i','I','j','J','c','C','k','K'].includes(e.key)) { e.preventDefault(); return; }
    // Ctrl+U (view source)
    if (e.ctrlKey && ['u','U'].includes(e.key)) { e.preventDefault(); return; }
  });

  // ── 4. Detect devtools open via window size heuristic ─────────────────────
  // Wipe localStorage session if devtools detected (security measure)
  let devtoolsCheckInterval = null;
  const SESSION_KEY = 'xpensr_v1_sess';
  
  const checkDevtools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    if (widthThreshold || heightThreshold) {
      // Devtools likely open — wipe session to force re-authentication
      try { localStorage.removeItem(SESSION_KEY); } catch {}
      // Show a discreet warning (don't be aggressive — could be legit user)
      if (!window.__xpensr_devtools_warned) {
        window.__xpensr_devtools_warned = true;
      }
    }
  };
  devtoolsCheckInterval = setInterval(checkDevtools, 2000);

  // ── 5. Disable text selection on sensitive UI areas ────────────────────────
  // Applied via CSS — see GLSTYLE in main app

  // ── 6. Clear clipboard after 30s if it contains financial data ─────────────
  // Not feasible to detect what's in clipboard without reading it (permission required)
  // Instead: override copy behaviour on amount/balance cells to copy masked values

  // ── 7. Console warning for users who open devtools ─────────────────────────
  // Classic trick: styled warning in console
  console.log(
    '%c⛔ STOP!',
    'color: red; font-size: 40px; font-weight: bold;'
  );
  console.log(
    '%cThis browser feature is intended for developers. If someone told you to copy or paste something here, it is a scam and will give them access to your account.',
    'color: #1a1a1a; font-size: 14px;'
  );
}

export {};
