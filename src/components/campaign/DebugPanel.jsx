import React from 'react';

export default function DebugPanel({ 
  showDebug, 
  story, 
  user, 
  party, 
  partyMembers, 
  isReady, 
  allPlayersReady, 
  combatLoading, 
  hasNavigatedToCombat,
  onManualCombatTrigger,
  onResetCombatState 
}) {
  if (!showDebug) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-600 rounded-lg p-6 mb-6">
      <h3 className="font-bold text-slate-200 mb-4">🐛 Debug Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="text-slate-300 font-semibold mb-2">Story State</h4>
          <div className="space-y-1 text-slate-400">
            <div>Story ID: {story?.id || 'None'}</div>
            <div>Status: {story?.status || 'None'}</div>
            <div>Phase: {story?.storyMetadata?.phaseStatus || 'None'}</div>
            <div>Ready Players: {story?.readyPlayers?.length || 0}/{partyMembers.length}</div>
            <div>Current Speaker: {story?.currentSpeaker?.name || 'None'}</div>
          </div>
        </div>
        <div>
          <h4 className="text-slate-300 font-semibold mb-2">User State</h4>
          <div className="space-y-1 text-slate-400">
            <div>User ID: {user?.uid || 'None'}</div>
            <div>Is DM: {user?.uid === party?.dmId ? 'Yes' : 'No'}</div>
            <div>Is Ready: {isReady ? 'Yes' : 'No'}</div>
            <div>All Ready: {allPlayersReady ? 'Yes' : 'No'}</div>
            <div>Combat Loading: {combatLoading ? 'Yes' : 'No'}</div>
            <div>Has Navigated: {hasNavigatedToCombat ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>
      
      {/* Manual Combat Trigger for DM */}
      {user?.uid === party?.dmId && (
        <div className="mt-4 pt-4 border-t border-slate-600">
          <h4 className="text-slate-300 font-semibold mb-2">⚔️ Manual Combat Controls</h4>
          <div className="flex space-x-2">
            <button
              onClick={onManualCombatTrigger}
              disabled={combatLoading || hasNavigatedToCombat}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combatLoading ? 'Loading...' : 'Trigger Combat'}
            </button>
            <button
              onClick={onResetCombatState}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Reset State
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 