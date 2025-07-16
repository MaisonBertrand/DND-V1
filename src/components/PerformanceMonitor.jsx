import React, { useState, useEffect, useRef } from 'react';

const PerformanceMonitor = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  });
  
  const renderTimes = useRef([]);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    if (!enabled) return;

    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    
    renderTimes.current.push(renderTime);
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
    
    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      averageRenderTime,
      lastRenderTime: renderTime,
      totalRenderTime: prev.totalRenderTime + renderTime
    }));

    lastRenderTime.current = now;
  });

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Performance Monitor</div>
      <div className="space-y-1">
        <div>Renders: {metrics.renderCount}</div>
        <div>Last: {metrics.lastRenderTime.toFixed(2)}ms</div>
        <div>Avg: {metrics.averageRenderTime.toFixed(2)}ms</div>
        <div>Total: {metrics.totalRenderTime.toFixed(2)}ms</div>
      </div>
      {metrics.averageRenderTime > 16 && (
        <div className="text-red-400 mt-2">
          ⚠️ Slow renders detected
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor; 