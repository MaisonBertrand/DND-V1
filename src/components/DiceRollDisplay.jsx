import React from 'react';

export default function DiceRollDisplay({ diceResult, onClose }) {
  if (!diceResult) return null;

  const getRollColor = (degree) => {
    switch (degree) {
      case 'critical success': return 'text-green-600 bg-green-100';
      case 'great success': return 'text-green-700 bg-green-50';
      case 'success': return 'text-blue-600 bg-blue-100';
      case 'failure': return 'text-yellow-600 bg-yellow-100';
      case 'great failure': return 'text-orange-600 bg-orange-100';
      case 'critical failure': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRollIcon = (degree) => {
    switch (degree) {
      case 'critical success': return '🎯';
      case 'great success': return '✅';
      case 'success': return '✓';
      case 'failure': return '⚠️';
      case 'great failure': return '❌';
      case 'critical failure': return '💥';
      default: return '🎲';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-800">Dice Roll Results</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {diceResult.actions ? (
          // Multiple actions
          <div className="space-y-4">
            {diceResult.actions.map((action, index) => (
              <div key={index} className="border border-stone-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-stone-700 capitalize">
                    {action.action}
                  </h4>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${getRollColor(action.check.degree)}`}>
                    {getRollIcon(action.check.degree)} {action.check.degree}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-stone-600">Roll:</span>
                    <span className="font-mono ml-1">{action.check.roll}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">Total:</span>
                    <span className="font-mono ml-1">{action.check.totalRoll}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">DC:</span>
                    <span className="font-mono ml-1">{action.check.dc}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">Margin:</span>
                    <span className={`font-mono ml-1 ${action.check.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {action.check.margin >= 0 ? '+' : ''}{action.check.margin}
                    </span>
                  </div>
                </div>

                {action.check.circumstanceBonus !== 0 && (
                  <div className="mt-2 text-xs text-stone-500">
                    Circumstance bonus: {action.check.circumstanceBonus >= 0 ? '+' : ''}{action.check.circumstanceBonus}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-4 p-3 bg-stone-50 rounded-lg">
              <h4 className="font-semibold text-stone-700 mb-2">Overall Result</h4>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  diceResult.overallSuccess ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                }`}>
                  {diceResult.overallSuccess ? '✅ Success' : '❌ Partial Failure'}
                </span>
                {diceResult.hasCriticalFailures && (
                  <span className="text-red-600 text-sm">⚠️ Critical failures occurred</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Single action
          <div className="space-y-4">
            <div className="border border-stone-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-stone-700 capitalize">
                  {diceResult.actionType}
                </h4>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getRollColor(diceResult.degree)}`}>
                  {getRollIcon(diceResult.degree)} {diceResult.degree}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-stone-600">Roll:</span>
                  <span className="font-mono ml-1">{diceResult.roll}</span>
                </div>
                <div>
                  <span className="text-stone-600">Total:</span>
                  <span className="font-mono ml-1">{diceResult.totalRoll}</span>
                </div>
                <div>
                  <span className="text-stone-600">DC:</span>
                  <span className="font-mono ml-1">{diceResult.dc}</span>
                </div>
                <div>
                  <span className="text-stone-600">Margin:</span>
                  <span className={`font-mono ml-1 ${diceResult.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diceResult.margin >= 0 ? '+' : ''}{diceResult.margin}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-xs text-stone-500">
                <div>Primary Mod: {diceResult.primaryMod >= 0 ? '+' : ''}{diceResult.primaryMod}</div>
                <div>Proficiency: {diceResult.proficiencyMod >= 0 ? '+' : ''}{diceResult.proficiencyMod}</div>
                {diceResult.circumstanceBonus !== 0 && (
                  <div>Circumstance: {diceResult.circumstanceBonus >= 0 ? '+' : ''}{diceResult.circumstanceBonus}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="fantasy-button bg-stone-600 hover:bg-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 