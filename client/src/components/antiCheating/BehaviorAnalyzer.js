import React, { useEffect, useRef, useState } from 'react';
import { useAntiCheating } from '../../contexts/AntiCheatingContext';

const BehaviorAnalyzer = ({ isActive = false }) => {
  const { behaviorData, addViolation } = useAntiCheating();
  const [analysisResults, setAnalysisResults] = useState(null);
  const [suspiciousPatterns, setSuspiciousPatterns] = useState([]);
  const analysisIntervalRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      startBehaviorAnalysis();
    } else {
      stopBehaviorAnalysis();
    }

    return () => {
      stopBehaviorAnalysis();
    };
  }, [isActive]);

  const startBehaviorAnalysis = () => {
    // Analyze behavior every 30 seconds
    analysisIntervalRef.current = setInterval(() => {
      analyzeBehavior();
    }, 30000);
  };

  const stopBehaviorAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  };

  const analyzeBehavior = () => {
    const analysis = {
      mousePatterns: analyzeMousePatterns(),
      keyboardPatterns: analyzeKeyboardPatterns(),
      focusPatterns: analyzeFocusPatterns(),
      overallRisk: 0,
      recommendations: []
    };

    // Calculate overall risk score
    analysis.overallRisk = calculateOverallRisk(analysis);
    
    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis);

    setAnalysisResults(analysis);

    // Check for suspicious patterns
    checkSuspiciousPatterns(analysis);
  };

  const analyzeMousePatterns = () => {
    const movements = behaviorData.mouseMovements || [];
    if (movements.length < 10) return { risk: 0, patterns: [] };

    const patterns = {
      risk: 0,
      patterns: []
    };

    // 1. Analyze movement speed
    const speeds = calculateMouseSpeeds(movements);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const speedVariance = calculateVariance(speeds);

    if (avgSpeed > 1000) { // Very fast movements
      patterns.patterns.push({
        type: 'unusually-fast-movements',
        severity: 'medium',
        description: 'Mouse movements are unusually fast',
        confidence: 0.8
      });
      patterns.risk += 20;
    }

    if (speedVariance < 50) { // Very consistent speed (possible automation)
      patterns.patterns.push({
        type: 'automated-movements',
        severity: 'high',
        description: 'Mouse movements appear automated',
        confidence: 0.9
      });
      patterns.risk += 40;
    }

    // 2. Analyze movement patterns
    const repetitivePatterns = detectRepetitivePatterns(movements);
    if (repetitivePatterns.length > 0) {
      patterns.patterns.push({
        type: 'repetitive-movements',
        severity: 'medium',
        description: 'Detected repetitive mouse movement patterns',
        confidence: 0.7
      });
      patterns.risk += 15;
    }

    // 3. Analyze click patterns
    const clickPatterns = analyzeClickPatterns(movements);
    if (clickPatterns.suspicious) {
      patterns.patterns.push({
        type: 'suspicious-clicks',
        severity: 'high',
        description: clickPatterns.description,
        confidence: clickPatterns.confidence
      });
      patterns.risk += 30;
    }

    return patterns;
  };

  const analyzeKeyboardPatterns = () => {
    const keyboardData = behaviorData.keyboardActivity || [];
    if (keyboardData.length < 10) return { risk: 0, patterns: [] };

    const patterns = {
      risk: 0,
      patterns: []
    };

    // 1. Analyze typing speed
    const typingEvents = keyboardData.filter(e => e.action === 'keydown');
    const intervals = calculateTypingIntervals(typingEvents);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const intervalVariance = calculateVariance(intervals);

    if (avgInterval < 50) { // Very fast typing
      patterns.patterns.push({
        type: 'unusually-fast-typing',
        severity: 'medium',
        description: 'Typing speed is unusually fast',
        confidence: 0.8
      });
      patterns.risk += 20;
    }

    if (intervalVariance < 10) { // Very consistent intervals (possible automation)
      patterns.patterns.push({
        type: 'automated-typing',
        severity: 'high',
        description: 'Typing patterns appear automated',
        confidence: 0.9
      });
      patterns.risk += 40;
    }

    // 2. Analyze copy-paste patterns
    const copyPastePatterns = detectCopyPastePatterns(keyboardData);
    if (copyPastePatterns.length > 0) {
      patterns.patterns.push({
        type: 'copy-paste-detected',
        severity: 'high',
        description: 'Detected copy-paste keyboard patterns',
        confidence: 0.9
      });
      patterns.risk += 35;
    }

    // 3. Analyze key sequences
    const suspiciousSequences = detectSuspiciousKeySequences(keyboardData);
    if (suspiciousSequences.length > 0) {
      patterns.patterns.push({
        type: 'suspicious-key-sequences',
        severity: 'medium',
        description: 'Detected suspicious key sequences',
        confidence: 0.7
      });
      patterns.risk += 15;
    }

    return patterns;
  };

  const analyzeFocusPatterns = () => {
    const focusEvents = behaviorData.focusEvents || [];
    if (focusEvents.length < 2) return { risk: 0, patterns: [] };

    const patterns = {
      risk: 0,
      patterns: []
    };

    // 1. Analyze focus loss frequency
    const blurEvents = focusEvents.filter(e => e.type === 'blur');
    const totalTime = focusEvents.length > 0 ? 
      focusEvents[focusEvents.length - 1].timestamp - focusEvents[0].timestamp : 0;
    
    if (blurEvents.length > 5 && totalTime > 0) {
      const blurFrequency = blurEvents.length / (totalTime / 60000); // per minute
      if (blurFrequency > 2) {
        patterns.patterns.push({
          type: 'excessive-focus-loss',
          severity: 'high',
          description: 'Excessive focus loss detected',
          confidence: 0.8
        });
        patterns.risk += 30;
      }
    }

    // 2. Analyze focus loss duration
    const totalBlurTime = blurEvents.reduce((sum, event) => sum + (event.duration || 0), 0);
    const blurPercentage = totalBlurTime / totalTime;
    
    if (blurPercentage > 0.3) { // More than 30% time out of focus
      patterns.patterns.push({
        type: 'excessive-time-out-of-focus',
        severity: 'high',
        description: 'Spent too much time out of focus',
        confidence: 0.9
      });
      patterns.risk += 40;
    }

    return patterns;
  };

  const calculateMouseSpeeds = (movements) => {
    const speeds = [];
    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      const distance = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
      );
      const timeDiff = curr.timestamp - prev.timestamp;
      if (timeDiff > 0) {
        speeds.push(distance / timeDiff);
      }
    }
    return speeds;
  };

  const calculateTypingIntervals = (typingEvents) => {
    const intervals = [];
    for (let i = 1; i < typingEvents.length; i++) {
      const interval = typingEvents[i].timestamp - typingEvents[i - 1].timestamp;
      intervals.push(interval);
    }
    return intervals;
  };

  const calculateVariance = (values) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return variance;
  };

  const detectRepetitivePatterns = (movements) => {
    const patterns = [];
    const windowSize = 10;
    
    for (let i = 0; i < movements.length - windowSize; i++) {
      const window = movements.slice(i, i + windowSize);
      const variance = calculateVariance(window.map(m => m.x)) + calculateVariance(window.map(m => m.y));
      
      if (variance < 10) { // Low variance indicates repetitive movement
        patterns.push({
          startIndex: i,
          endIndex: i + windowSize,
          variance
        });
      }
    }
    
    return patterns;
  };

  const analyzeClickPatterns = (movements) => {
    // This is a simplified analysis - in production, you'd track actual clicks
    return {
      suspicious: false,
      description: '',
      confidence: 0
    };
  };

  const detectCopyPastePatterns = (keyboardData) => {
    const patterns = [];
    const copyPasteKeys = ['Control', 'c', 'Control', 'v'];
    
    for (let i = 0; i < keyboardData.length - copyPasteKeys.length; i++) {
      const sequence = keyboardData.slice(i, i + copyPasteKeys.length);
      const keys = sequence.map(event => event.key);
      
      if (JSON.stringify(keys) === JSON.stringify(copyPasteKeys)) {
        patterns.push({
          startIndex: i,
          endIndex: i + copyPasteKeys.length
        });
      }
    }
    
    return patterns;
  };

  const detectSuspiciousKeySequences = (keyboardData) => {
    const suspiciousSequences = [
      ['Control', 'a'], // Select all
      ['Control', 's'], // Save
      ['Control', 'z'], // Undo
      ['Control', 'y'], // Redo
      ['F12'], // Dev tools
      ['Control', 'Shift', 'I'], // Dev tools
    ];

    const patterns = [];
    
    for (const sequence of suspiciousSequences) {
      for (let i = 0; i < keyboardData.length - sequence.length; i++) {
        const window = keyboardData.slice(i, i + sequence.length);
        const keys = window.map(event => event.key);
        
        if (JSON.stringify(keys) === JSON.stringify(sequence)) {
          patterns.push({
            sequence,
            startIndex: i,
            endIndex: i + sequence.length
          });
        }
      }
    }
    
    return patterns;
  };

  const calculateOverallRisk = (analysis) => {
    let totalRisk = 0;
    let weightSum = 0;

    const weights = {
      mousePatterns: 0.3,
      keyboardPatterns: 0.4,
      focusPatterns: 0.3
    };

    totalRisk += analysis.mousePatterns.risk * weights.mousePatterns;
    totalRisk += analysis.keyboardPatterns.risk * weights.keyboardPatterns;
    totalRisk += analysis.focusPatterns.risk * weights.focusPatterns;

    return Math.min(100, Math.max(0, totalRisk));
  };

  const generateRecommendations = (analysis) => {
    const recommendations = [];

    if (analysis.overallRisk > 70) {
      recommendations.push('Flag for manual review - high risk of cheating');
    } else if (analysis.overallRisk > 40) {
      recommendations.push('Monitor closely for additional violations');
    } else if (analysis.overallRisk > 20) {
      recommendations.push('Continue normal monitoring');
    } else {
      recommendations.push('Behavior appears normal');
    }

    return recommendations;
  };

  const checkSuspiciousPatterns = (analysis) => {
    const allPatterns = [
      ...analysis.mousePatterns.patterns,
      ...analysis.keyboardPatterns.patterns,
      ...analysis.focusPatterns.patterns
    ];

    const highRiskPatterns = allPatterns.filter(p => p.severity === 'high');
    
    if (highRiskPatterns.length > 0) {
      setSuspiciousPatterns(highRiskPatterns);
      
      // Add violations for high-risk patterns
      highRiskPatterns.forEach(pattern => {
        addViolation({
          type: pattern.type,
          timestamp: Date.now(),
          details: pattern.description,
          severity: pattern.severity,
          confidence: pattern.confidence
        });
      });
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="behavior-analyzer">
      {analysisResults && (
        <div className="analysis-panel">
          <h4>Behavior Analysis</h4>
          <div className="risk-score">
            <span className="label">Risk Score:</span>
            <span className={`score ${analysisResults.overallRisk > 70 ? 'high' : analysisResults.overallRisk > 40 ? 'medium' : 'low'}`}>
              {analysisResults.overallRisk.toFixed(1)}%
            </span>
          </div>
          
          {suspiciousPatterns.length > 0 && (
            <div className="suspicious-patterns">
              <h5>Suspicious Patterns Detected:</h5>
              <ul>
                {suspiciousPatterns.map((pattern, index) => (
                  <li key={index} className={`pattern ${pattern.severity}`}>
                    {pattern.description} (Confidence: {(pattern.confidence * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="recommendations">
            <h5>Recommendations:</h5>
            <ul>
              {analysisResults.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style jsx>{`
        .behavior-analyzer {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 15px;
          border-radius: 8px;
          max-width: 300px;
          font-size: 12px;
          z-index: 1000;
        }

        .analysis-panel h4, .analysis-panel h5 {
          margin: 0 0 10px 0;
          color: #60a5fa;
        }

        .risk-score {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .score {
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .score.low {
          background: #10b981;
        }

        .score.medium {
          background: #f59e0b;
        }

        .score.high {
          background: #ef4444;
        }

        .suspicious-patterns ul, .recommendations ul {
          margin: 5px 0;
          padding-left: 15px;
        }

        .pattern {
          margin: 3px 0;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .pattern.high {
          background: rgba(239, 68, 68, 0.2);
          border-left: 3px solid #ef4444;
        }

        .pattern.medium {
          background: rgba(245, 158, 11, 0.2);
          border-left: 3px solid #f59e0b;
        }
      `}</style>
    </div>
  );
};

export default BehaviorAnalyzer;
