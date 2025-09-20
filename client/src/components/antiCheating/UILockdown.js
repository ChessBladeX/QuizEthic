import React, { useEffect, useRef, useState } from 'react';
import { useAntiCheating } from '../../contexts/AntiCheatingContext';

const UILockdown = ({ children, isActive = false }) => {
  const { settings, addViolation } = useAntiCheating();
  const [isLocked, setIsLocked] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const activityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isActive || !settings.browserLock) {
      setIsLocked(false);
      return;
    }

    setIsLocked(true);
    setupUILockdown();

    return () => {
      cleanupUILockdown();
    };
  }, [isActive, settings.browserLock]);

  const setupUILockdown = () => {
    // Disable right-click
    if (settings.browserLock && !settings.browserLock.allowRightClick) {
      document.addEventListener('contextmenu', handleRightClick, true);
    }

    // Disable copy/paste
    if (settings.browserLock && (!settings.browserLock.allowCopy || !settings.browserLock.allowPaste)) {
      document.addEventListener('copy', handleCopy, true);
      document.addEventListener('paste', handlePaste, true);
      document.addEventListener('cut', handleCut, true);
    }

    // Disable text selection
    document.addEventListener('selectstart', handleTextSelection, true);
    document.addEventListener('dragstart', handleDragStart, true);

    // Disable keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts, true);

    // Disable F12, Ctrl+Shift+I, etc.
    document.addEventListener('keydown', handleDevToolsShortcuts, true);

    // Disable print
    window.addEventListener('beforeprint', handlePrint, true);

    // Monitor for dev tools
    if (settings.browserLock && !settings.browserLock.allowDevTools) {
      monitorDevTools();
    }

    // Monitor activity
    monitorActivity();
  };

  const cleanupUILockdown = () => {
    document.removeEventListener('contextmenu', handleRightClick, true);
    document.removeEventListener('copy', handleCopy, true);
    document.removeEventListener('paste', handlePaste, true);
    document.removeEventListener('cut', handleCut, true);
    document.removeEventListener('selectstart', handleTextSelection, true);
    document.removeEventListener('dragstart', handleDragStart, true);
    document.removeEventListener('keydown', handleKeyboardShortcuts, true);
    document.removeEventListener('keydown', handleDevToolsShortcuts, true);
    window.removeEventListener('beforeprint', handlePrint, true);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addViolation({
      type: 'right-click',
      timestamp: Date.now(),
      details: 'User attempted to right-click',
      severity: 'low'
    });
    showWarning('Right-click is disabled during the exam');
  };

  const handleCopy = (e) => {
    if (!settings.browserLock?.allowCopy) {
      e.preventDefault();
      e.stopPropagation();
      addViolation({
        type: 'copy-attempt',
        timestamp: Date.now(),
        details: 'User attempted to copy text',
        severity: 'medium'
      });
      showWarning('Copying is disabled during the exam');
    }
  };

  const handlePaste = (e) => {
    if (!settings.browserLock?.allowPaste) {
      e.preventDefault();
      e.stopPropagation();
      addViolation({
        type: 'paste-attempt',
        timestamp: Date.now(),
        details: 'User attempted to paste text',
        severity: 'medium'
      });
      showWarning('Pasting is disabled during the exam');
    }
  };

  const handleCut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addViolation({
      type: 'cut-attempt',
      timestamp: Date.now(),
      details: 'User attempted to cut text',
      severity: 'medium'
    });
    showWarning('Cutting is disabled during the exam');
  };

  const handleTextSelection = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addViolation({
      type: 'text-selection',
      timestamp: Date.now(),
      details: 'User attempted to select text',
      severity: 'low'
    });
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addViolation({
      type: 'drag-attempt',
      timestamp: Date.now(),
      details: 'User attempted to drag content',
      severity: 'low'
    });
  };

  const handleKeyboardShortcuts = (e) => {
    const forbiddenKeys = [
      'F12', // Dev tools
      'F5', // Refresh
      'F11', // Fullscreen
      'Escape' // Escape key
    ];

    const forbiddenCombinations = [
      { ctrl: true, key: 'r' }, // Refresh
      { ctrl: true, key: 'R' }, // Refresh
      { ctrl: true, shift: true, key: 'R' }, // Hard refresh
      { ctrl: true, key: 'h' }, // History
      { ctrl: true, key: 'H' }, // History
      { ctrl: true, key: 'j' }, // Downloads
      { ctrl: true, key: 'J' }, // Downloads
      { ctrl: true, key: 'l' }, // Address bar
      { ctrl: true, key: 'L' }, // Address bar
      { ctrl: true, key: 't' }, // New tab
      { ctrl: true, key: 'T' }, // New tab
      { ctrl: true, key: 'w' }, // Close tab
      { ctrl: true, key: 'W' }, // Close tab
      { ctrl: true, key: 'n' }, // New window
      { ctrl: true, key: 'N' }, // New window
      { ctrl: true, shift: true, key: 'n' }, // Incognito
      { ctrl: true, shift: true, key: 'N' }, // Incognito
      { alt: true, key: 'F4' }, // Close window
      { ctrl: true, key: 'F4' }, // Close tab
    ];

    // Check for forbidden keys
    if (forbiddenKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      addViolation({
        type: 'forbidden-key',
        timestamp: Date.now(),
        details: `User pressed forbidden key: ${e.key}`,
        severity: 'medium'
      });
      showWarning(`The ${e.key} key is disabled during the exam`);
      return;
    }

    // Check for forbidden combinations
    const isForbidden = forbiddenCombinations.some(combo => {
      return (
        (combo.ctrl === undefined || combo.ctrl === e.ctrlKey) &&
        (combo.shift === undefined || combo.shift === e.shiftKey) &&
        (combo.alt === undefined || combo.alt === e.altKey) &&
        combo.key.toLowerCase() === e.key.toLowerCase()
      );
    });

    if (isForbidden) {
      e.preventDefault();
      e.stopPropagation();
      addViolation({
        type: 'forbidden-shortcut',
        timestamp: Date.now(),
        details: `User attempted forbidden shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`,
        severity: 'high'
      });
      showWarning('This keyboard shortcut is disabled during the exam');
    }
  };

  const handleDevToolsShortcuts = (e) => {
    const devToolsShortcuts = [
      { ctrl: true, shift: true, key: 'I' }, // Dev tools
      { ctrl: true, shift: true, key: 'i' }, // Dev tools
      { ctrl: true, shift: true, key: 'C' }, // Console
      { ctrl: true, shift: true, key: 'c' }, // Console
      { ctrl: true, shift: true, key: 'J' }, // Console
      { ctrl: true, shift: true, key: 'j' }, // Console
      { ctrl: true, shift: true, key: 'K' }, // Console
      { ctrl: true, shift: true, key: 'k' }, // Console
    ];

    const isDevToolsShortcut = devToolsShortcuts.some(combo => {
      return (
        combo.ctrl === e.ctrlKey &&
        combo.shift === e.shiftKey &&
        combo.key.toLowerCase() === e.key.toLowerCase()
      );
    });

    if (isDevToolsShortcut) {
      e.preventDefault();
      e.stopPropagation();
      addViolation({
        type: 'dev-tools-shortcut',
        timestamp: Date.now(),
        details: 'User attempted to open developer tools',
        severity: 'high'
      });
      showWarning('Developer tools are disabled during the exam');
    }
  };

  const handlePrint = (e) => {
    e.preventDefault();
    addViolation({
      type: 'print-attempt',
      timestamp: Date.now(),
      details: 'User attempted to print the page',
      severity: 'medium'
    });
    showWarning('Printing is disabled during the exam');
  };

  const monitorDevTools = () => {
    let devtools = { open: false, orientation: null };
    const threshold = 160;

    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          addViolation({
            type: 'dev-tools-detected',
            timestamp: Date.now(),
            details: 'Developer tools detected',
            severity: 'high'
          });
          showWarning('Developer tools detected! This is a violation of exam rules.');
        }
      } else {
        devtools.open = false;
      }
    };

    const interval = setInterval(detectDevTools, 500);
    return () => clearInterval(interval);
  };

  const monitorActivity = () => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      setWarningCount(0);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      activityTimeoutRef.current = setTimeout(() => {
        addViolation({
          type: 'inactivity',
          timestamp: Date.now(),
          details: 'User has been inactive for too long',
          severity: 'low'
        });
      }, 300000); // 5 minutes of inactivity
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  };

  const showWarning = (message) => {
    setWarningCount(prev => prev + 1);
    
    // Show warning message
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 300px;
    `;
    warningDiv.textContent = message;
    document.body.appendChild(warningDiv);

    // Remove warning after 3 seconds
    setTimeout(() => {
      if (warningDiv.parentNode) {
        warningDiv.parentNode.removeChild(warningDiv);
      }
    }, 3000);

    // If too many warnings, show stronger message
    if (warningCount >= 3) {
      const strongWarning = document.createElement('div');
      strongWarning.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff0000;
        color: white;
        padding: 30px;
        border-radius: 10px;
        z-index: 10001;
        font-family: Arial, sans-serif;
        font-size: 18px;
        text-align: center;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        border: 3px solid #ffffff;
      `;
      strongWarning.innerHTML = `
        <h3>⚠️ WARNING ⚠️</h3>
        <p>Multiple violations detected!</p>
        <p>Your exam may be flagged for review.</p>
        <p>Please follow the exam rules.</p>
      `;
      document.body.appendChild(strongWarning);

      setTimeout(() => {
        if (strongWarning.parentNode) {
          strongWarning.parentNode.removeChild(strongWarning);
        }
      }, 5000);
    }
  };

  if (!isLocked) {
    return children;
  }

  return (
    <div 
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onSelectStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

export default UILockdown;
