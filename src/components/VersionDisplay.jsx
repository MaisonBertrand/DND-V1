import React, { useState } from 'react';
import { combatService } from '../services/combat';

const version = import.meta.env.VITE_APP_VERSION || '3.2.3';

export default function VersionDisplay() {
  const [showCacheHelp, setShowCacheHelp] = useState(false);

  const clearCache = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Force page reload
    window.location.reload();
  };

  const handleRefreshUI = () => {
    // Clear all possible caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any service worker caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    // Force reload with cache bypass
    window.location.reload(true);
  };

  return (
    <div className="text-xs text-gray-400 text-center mt-2">
      <div className="flex items-center justify-center gap-2">
        <span>Version {version}</span>
        <button
          onClick={() => setShowCacheHelp(!showCacheHelp)}
          className="text-blue-400 hover:text-blue-300 underline"
          title="Having issues? Click for help"
        >
          Help
        </button>
      </div>
      
      {showCacheHelp && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-left max-w-md mx-auto">
          <p className="mb-2 text-yellow-300 font-semibold">Need Help?</p>
          
          {/* Refresh UI Button */}
          <div className="mb-3">
            <button
              onClick={handleRefreshUI}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded transition-colors mb-2"
              title="Clear cache and refresh the website"
            >
              🔄 Refresh UI
            </button>
            <p className="text-xs text-gray-300 mb-2">
              Clears all cached data and refreshes the website
            </p>
          </div>
          
          {/* Combat Session Help */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold text-amber-300">Combat Session Issues:</p>
            <div className="space-y-2 text-xs">
              <button
                onClick={async () => {
                  // This will be handled by the parent component
                  window.dispatchEvent(new CustomEvent('refreshCombatSession'));
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors"
                title="Refresh combat session if players are in separate sessions"
              >
                🔄 Refresh Combat
              </button>
              <button
                onClick={async () => {
                  // This will be handled by the parent component
                  window.dispatchEvent(new CustomEvent('cleanupCombatSessions'));
                }}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors ml-2"
                title="Force cleanup all combat sessions (use if players are stuck in separate sessions)"
              >
                🧹 Cleanup Sessions
              </button>
            </div>
          </div>
          
          {/* Cache Help */}
          <div className="mb-3">
            <p className="mb-2 text-xs font-semibold text-blue-300">Cache Issues:</p>
            <p className="mb-2 text-xs">
              If players are ending up in separate combat sessions, try clearing your cache:
            </p>
            <div className="space-y-1 text-xs">
              <p>• <strong>Browser:</strong> Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</p>
              <p>• <strong>Or click:</strong> 
                <button
                  onClick={clearCache}
                  className="ml-1 text-red-400 hover:text-red-300 underline"
                >
                  Clear All Data & Reload
                </button>
              </p>
              <p>• <strong>Mobile:</strong> Close and reopen the app</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCacheHelp(false)}
            className="mt-2 text-gray-500 hover:text-gray-400 text-xs"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
} 