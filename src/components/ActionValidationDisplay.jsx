import React, { useState, useEffect } from 'react';

export default function ActionValidationDisplay({ validation, onClose, onProceed, onRevise }) {
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  useEffect(() => {
    if (validation?.diceResult) {
      setShowDiceRoll(true);
      setDiceRolling(true);
      
      // Simulate dice rolling animation
      const timer = setTimeout(() => {
        setDiceRolling(false);
        setRollResult(validation.diceResult);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [validation]);

  if (!validation) return null;

  const getValidationIcon = (type) => {
    switch (type) {
      case 'valid': return '✅';
      case 'redirect': return '🔄';
      case 'expand': return '❓';
      case 'impossible': return '🚫';
      default: return '🎲';
    }
  };

  const getValidationColor = (type) => {
    switch (type) {
      case 'valid': return 'text-green-600 bg-green-100';
      case 'redirect': return 'text-yellow-600 bg-yellow-100';
      case 'expand': return 'text-blue-600 bg-blue-100';
      case 'impossible': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionResultColor = (isSuccess, degree) => {
    if (degree === 'critical success') return 'text-green-800 bg-green-200 border-green-400';
    if (degree === 'great success') return 'text-green-700 bg-green-100 border-green-300';
    if (degree === 'success') return 'text-green-600 bg-green-50 border-green-200';
    if (degree === 'failure') return 'text-red-600 bg-red-50 border-red-200';
    if (degree === 'great failure') return 'text-red-700 bg-red-100 border-red-300';
    if (degree === 'critical failure') return 'text-red-800 bg-red-200 border-red-400';
    return isSuccess ? 'text-green-600 bg-green-100 border-green-300' : 'text-red-600 bg-red-100 border-red-300';
  };

  const renderDiceRoll = () => {
    if (!validation.diceResult) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-amber-900 to-amber-800 rounded-2xl p-8 max-w-2xl w-full mx-4 border-4 border-amber-600 shadow-2xl">
          {/* Table Atmosphere */}
          <div className="text-center mb-6">
            <div className="text-amber-200 text-lg font-bold mb-2">🎲 THE DICE HAVE BEEN CAST 🎲</div>
            <div className="text-amber-300 text-sm">The fate of your party hangs in the balance...</div>
          </div>

          {/* Character Action */}
          <div className="bg-amber-950/50 rounded-lg p-4 mb-6 border border-amber-500">
            <div className="text-amber-200 font-bold text-lg mb-2">Your Action</div>
            <div className="text-amber-100 text-sm">
              {validation.diceResult.actions ? 
                validation.diceResult.actions.map((action, index) => (
                  <div key={index} className="mb-2">
                    <span className="font-semibold capitalize">{action.action}</span>
                    <span className="text-amber-300">: {action.description}</span>
                  </div>
                )).join('')
                : 'Rolling the dice...'
              }
            </div>
          </div>

          {/* Dice Rolling Animation */}
          {diceRolling ? (
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">🎲</div>
              <div className="text-amber-200 text-xl font-bold mb-2">Rolling...</div>
              <div className="text-amber-300 text-sm">The dice tumble across the table</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Roll Results */}
              {validation.diceResult.actions ? (
                validation.diceResult.actions.map((action, index) => (
                  <div key={index} className={`rounded-lg p-4 border-2 ${getActionResultColor(action.check.isSuccess, action.check.degree)}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-lg font-bold capitalize">
                        {action.action}
                      </div>
                      <div className="text-2xl font-bold">
                        {action.check.degree ? action.check.degree.replace('_', ' ').toUpperCase() : (action.check.isSuccess ? 'SUCCESS' : 'FAILURE')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center mb-3">
                      <div className="bg-black/30 rounded p-2">
                        <div className="text-xs text-amber-300">ROLL</div>
                        <div className="text-xl font-mono font-bold text-amber-200">{action.check.roll}</div>
                      </div>
                      <div className="bg-black/30 rounded p-2">
                        <div className="text-xs text-amber-300">TOTAL</div>
                        <div className="text-xl font-mono font-bold text-amber-200">{action.check.totalRoll}</div>
                      </div>
                      <div className="bg-black/30 rounded p-2">
                        <div className="text-xs text-amber-300">DC</div>
                        <div className="text-xl font-mono font-bold text-amber-200">{action.check.dc}</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-amber-200">
                      {action.description}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`rounded-lg p-6 border-2 text-center ${getActionResultColor(validation.diceResult.isSuccess)}`}>
                  <div className="text-2xl font-bold mb-4">
                    {validation.diceResult.isSuccess ? 'SUCCESS!' : 'FAILURE!'}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-xs text-amber-300">ROLL</div>
                      <div className="text-xl font-mono font-bold text-amber-200">{validation.diceResult.roll}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-xs text-amber-300">TOTAL</div>
                      <div className="text-xl font-mono font-bold text-amber-200">{validation.diceResult.totalRoll}</div>
                    </div>
                    <div className="bg-black/30 rounded p-2">
                      <div className="text-xs text-amber-300">DC</div>
                      <div className="text-xl font-mono font-bold text-amber-200">{validation.diceResult.dc}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall Result */}
              {validation.diceResult.overallSuccess !== undefined && (
                <div className={`rounded-lg p-4 border-2 text-center ${validation.diceResult.overallSuccess ? 'border-green-400 bg-green-900/50' : 'border-red-400 bg-red-900/50'}`}>
                  <div className="text-xl font-bold mb-2">
                    {validation.diceResult.overallSuccess ? '🎉 MISSION ACCOMPLISHED! 🎉' : '💀 THE DICE HAVE SPOKEN... 💀'}
                  </div>
                  <div className="text-sm">
                    {validation.diceResult.overallSuccess ? 
                      'Your party\'s combined efforts have succeeded!' : 
                      'The challenge has proven too great this time...'
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DM Commentary */}
          {!diceRolling && (
            <div className="bg-amber-950/50 rounded-lg p-4 mt-6 border border-amber-500">
              <div className="text-amber-200 font-bold mb-2">🎭 Dungeon Master's Commentary</div>
              <div className="text-amber-100 text-sm italic">
                {typeof validation.response === 'string' 
                  ? validation.response 
                  : validation.response.story
                }
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!diceRolling && (
            <div className="mt-6 flex justify-center space-x-4">
              {validation.type === 'valid' ? (
                <button
                  onClick={onProceed}
                  className="fantasy-button bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  🚀 PROCEED WITH FATE
                </button>
              ) : (
                <button
                  onClick={onRevise}
                  className="fantasy-button bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  🔄 TRY AGAIN
                </button>
              )}
              <button
                onClick={onClose}
                className="fantasy-button bg-stone-600 hover:bg-stone-700 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg transform hover:scale-105 transition-all"
              >
                ❌ CANCEL
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Show dice roll overlay if dice are involved
  if (showDiceRoll) {
    return renderDiceRoll();
  }

  // Regular validation display for non-dice actions
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-lg p-6 max-w-2xl w-full mx-4 border-2 border-stone-600 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-stone-200">🎭 Action Validation</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* DM Response */}
          <div className="p-4 bg-stone-700 rounded-lg border border-stone-600">
            <h4 className="font-semibold text-stone-200 mb-2">🎭 Dungeon Master's Response</h4>
            <div className="text-stone-300 italic leading-relaxed">
              {typeof validation.response === 'string' 
                ? validation.response 
                : validation.response.story
              }
            </div>
          </div>

          {/* Suggestion */}
          {validation.suggestion && (
            <div className="p-4 bg-blue-900/50 rounded-lg border border-blue-600">
              <h4 className="font-semibold text-blue-200 mb-2">💡 Suggestion</h4>
              <p className="text-blue-100">{validation.suggestion}</p>
            </div>
          )}

          {/* Alternative Approaches */}
          {validation.type !== 'valid' && (
            <div className="p-4 bg-purple-900/50 rounded-lg border border-purple-600">
              <h4 className="font-semibold text-purple-200 mb-2">🔄 Alternative Approaches</h4>
              <ul className="text-purple-100 text-sm space-y-1">
                <li>• Try a more focused, single action</li>
                <li>• Consider your character's abilities and limitations</li>
                <li>• Think about what would be realistic in this situation</li>
                <li>• Ask for clarification about what you're trying to achieve</li>
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          {validation.type === 'valid' ? (
            <button
              onClick={onProceed}
              className="fantasy-button bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold"
            >
              Proceed with Action
            </button>
          ) : (
            <button
              onClick={onRevise}
              className="fantasy-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold"
            >
              Revise Action
            </button>
          )}
          <button
            onClick={onClose}
            className="fantasy-button bg-stone-600 hover:bg-stone-700 text-white px-4 py-2 rounded font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 