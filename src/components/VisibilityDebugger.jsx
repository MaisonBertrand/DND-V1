import React, { useState, useEffect } from 'react';

export default function VisibilityDebugger({ isEnabled = false }) {
  const [hiddenElements, setHiddenElements] = useState([]);
  const [modalElements, setModalElements] = useState([]);

  useEffect(() => {
    if (!isEnabled) return;

    const checkVisibility = () => {
      const allElements = document.querySelectorAll('*');
      const hidden = [];
      const modals = [];

      allElements.forEach((element) => {
        const styles = window.getComputedStyle(element);
        const isHidden = styles.visibility === 'hidden' || 
                        styles.display === 'none' || 
                        styles.opacity === '0' ||
                        element.offsetParent === null;
        
        const isModal = element.classList.contains('modal') || 
                       element.classList.contains('overlay') ||
                       styles.position === 'fixed' && styles.zIndex > 1000;

        if (isHidden && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE') {
          hidden.push({
            tag: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.substring(0, 50) || 'No text'
          });
        }

        if (isModal) {
          modals.push({
            tag: element.tagName,
            className: element.className,
            id: element.id,
            zIndex: styles.zIndex,
            position: styles.position
          });
        }
      });

      setHiddenElements(hidden);
      setModalElements(modals);
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 2000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto z-[10000] text-xs">
      <h3 className="font-bold mb-2">🔍 Visibility Debugger</h3>
      
      <div className="mb-4">
        <h4 className="font-semibold text-red-400 mb-1">Hidden Elements ({hiddenElements.length})</h4>
        {hiddenElements.slice(0, 5).map((el, i) => (
          <div key={i} className="mb-1 p-1 bg-red-900/50 rounded">
            <div className="font-mono">{el.tag}</div>
            <div className="text-gray-300">{el.className}</div>
            <div className="text-gray-400 truncate">{el.text}</div>
          </div>
        ))}
        {hiddenElements.length > 5 && (
          <div className="text-gray-400">... and {hiddenElements.length - 5} more</div>
        )}
      </div>

      <div>
        <h4 className="font-semibold text-blue-400 mb-1">Modal Elements ({modalElements.length})</h4>
        {modalElements.slice(0, 3).map((el, i) => (
          <div key={i} className="mb-1 p-1 bg-blue-900/50 rounded">
            <div className="font-mono">{el.tag}</div>
            <div className="text-gray-300">{el.className}</div>
            <div className="text-gray-400">z-index: {el.zIndex}</div>
          </div>
        ))}
        {modalElements.length > 3 && (
          <div className="text-gray-400">... and {modalElements.length - 3} more</div>
        )}
      </div>

      <button 
        onClick={() => window.location.reload()}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
      >
        Refresh Page
      </button>
    </div>
  );
} 