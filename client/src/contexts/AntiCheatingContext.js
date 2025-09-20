import React, { createContext, useContext, useReducer, useEffect } from 'react';
import FingerprintJS from 'fingerprintjs2';

const AntiCheatingContext = createContext();

const initialState = {
  isMonitoring: false,
  violations: [],
  deviceFingerprint: null,
  behaviorData: {
    mouseMovements: [],
    keyboardActivity: [],
    focusEvents: [],
  },
  settings: {
    webcamMonitoring: false,
    browserLock: false,
    focusDetection: false,
    behaviorMonitoring: false,
    plagiarismDetection: false,
  },
};

const antiCheatingReducer = (state, action) => {
  switch (action.type) {
    case 'START_MONITORING':
      return {
        ...state,
        isMonitoring: true,
        settings: action.payload.settings,
      };
    case 'STOP_MONITORING':
      return {
        ...state,
        isMonitoring: false,
      };
    case 'ADD_VIOLATION':
      return {
        ...state,
        violations: [...state.violations, action.payload],
      };
    case 'ADD_MOUSE_MOVEMENT':
      return {
        ...state,
        behaviorData: {
          ...state.behaviorData,
          mouseMovements: [...state.behaviorData.mouseMovements, action.payload],
        },
      };
    case 'ADD_KEYBOARD_ACTIVITY':
      return {
        ...state,
        behaviorData: {
          ...state.behaviorData,
          keyboardActivity: [...state.behaviorData.keyboardActivity, action.payload],
        },
      };
    case 'ADD_FOCUS_EVENT':
      return {
        ...state,
        behaviorData: {
          ...state.behaviorData,
          focusEvents: [...state.behaviorData.focusEvents, action.payload],
        },
      };
    case 'SET_DEVICE_FINGERPRINT':
      return {
        ...state,
        deviceFingerprint: action.payload,
      };
    case 'CLEAR_BEHAVIOR_DATA':
      return {
        ...state,
        behaviorData: {
          mouseMovements: [],
          keyboardActivity: [],
          focusEvents: [],
        },
      };
    default:
      return state;
  }
};

export const AntiCheatingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(antiCheatingReducer, initialState);

  // Generate device fingerprint on mount
  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const components = await FingerprintJS.getPromise();
        const fingerprint = components.map(component => component.value).join('');
        dispatch({ type: 'SET_DEVICE_FINGERPRINT', payload: fingerprint });
      } catch (error) {
        console.error('Failed to generate device fingerprint:', error);
      }
    };

    generateFingerprint();
  }, []);

  // Mouse movement tracking
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.behaviorMonitoring) return;

    const handleMouseMove = (event) => {
      dispatch({
        type: 'ADD_MOUSE_MOVEMENT',
        payload: {
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now(),
        },
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [state.isMonitoring, state.settings.behaviorMonitoring]);

  // Keyboard activity tracking
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.behaviorMonitoring) return;

    const handleKeyDown = (event) => {
      dispatch({
        type: 'ADD_KEYBOARD_ACTIVITY',
        payload: {
          key: event.key,
          code: event.code,
          action: 'keydown',
          timestamp: Date.now(),
        },
      });
    };

    const handleKeyUp = (event) => {
      dispatch({
        type: 'ADD_KEYBOARD_ACTIVITY',
        payload: {
          key: event.key,
          code: event.code,
          action: 'keyup',
          timestamp: Date.now(),
        },
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.isMonitoring, state.settings.behaviorMonitoring]);

  // Focus/blur tracking
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.focusDetection) return;

    let blurStartTime = null;

    const handleFocus = () => {
      if (blurStartTime) {
        const blurDuration = Date.now() - blurStartTime;
        dispatch({
          type: 'ADD_FOCUS_EVENT',
          payload: {
            type: 'focus',
            timestamp: Date.now(),
            duration: blurDuration,
          },
        });
        blurStartTime = null;
      }
    };

    const handleBlur = () => {
      blurStartTime = Date.now();
      dispatch({
        type: 'ADD_FOCUS_EVENT',
        payload: {
          type: 'blur',
          timestamp: Date.now(),
        },
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state.isMonitoring, state.settings.focusDetection]);

  // Tab switching detection
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.behaviorMonitoring) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        dispatch({
          type: 'ADD_VIOLATION',
          payload: {
            type: 'tab-switch',
            timestamp: Date.now(),
            details: 'User switched to another tab',
            severity: 'medium',
          },
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isMonitoring, state.settings.behaviorMonitoring]);

  // Right-click prevention
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.browserLock) return;

    const handleContextMenu = (event) => {
      event.preventDefault();
      dispatch({
        type: 'ADD_VIOLATION',
        payload: {
          type: 'right-click',
          timestamp: Date.now(),
          details: 'User attempted to right-click',
          severity: 'low',
        },
      });
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [state.isMonitoring, state.settings.browserLock]);

  // Copy/paste prevention
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.browserLock) return;

    const handleCopy = (event) => {
      event.preventDefault();
      dispatch({
        type: 'ADD_VIOLATION',
        payload: {
          type: 'copy-paste',
          timestamp: Date.now(),
          details: 'User attempted to copy text',
          severity: 'medium',
        },
      });
    };

    const handlePaste = (event) => {
      event.preventDefault();
      dispatch({
        type: 'ADD_VIOLATION',
        payload: {
          type: 'copy-paste',
          timestamp: Date.now(),
          details: 'User attempted to paste text',
          severity: 'medium',
        },
      });
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [state.isMonitoring, state.settings.browserLock]);

  // DevTools detection
  useEffect(() => {
    if (!state.isMonitoring || !state.settings.browserLock) return;

    let devtools = { open: false, orientation: null };
    const threshold = 160;

    const detectDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          dispatch({
            type: 'ADD_VIOLATION',
            payload: {
              type: 'dev-tools',
              timestamp: Date.now(),
              details: 'Developer tools detected',
              severity: 'high',
            },
          });
        }
      } else {
        devtools.open = false;
      }
    };

    const interval = setInterval(detectDevTools, 500);
    return () => clearInterval(interval);
  }, [state.isMonitoring, state.settings.browserLock]);

  const startMonitoring = (settings) => {
    dispatch({ type: 'START_MONITORING', payload: { settings } });
  };

  const stopMonitoring = () => {
    dispatch({ type: 'STOP_MONITORING' });
  };

  const addViolation = (violation) => {
    dispatch({ type: 'ADD_VIOLATION', payload: violation });
  };

  const clearBehaviorData = () => {
    dispatch({ type: 'CLEAR_BEHAVIOR_DATA' });
  };

  const getBehaviorData = () => {
    return state.behaviorData;
  };

  const getViolations = () => {
    return state.violations;
  };

  const value = {
    ...state,
    startMonitoring,
    stopMonitoring,
    addViolation,
    clearBehaviorData,
    getBehaviorData,
    getViolations,
  };

  return (
    <AntiCheatingContext.Provider value={value}>
      {children}
    </AntiCheatingContext.Provider>
  );
};

export const useAntiCheating = () => {
  const context = useContext(AntiCheatingContext);
  if (!context) {
    throw new Error('useAntiCheating must be used within an AntiCheatingProvider');
  }
  return context;
};
