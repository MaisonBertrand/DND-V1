import React from 'react';

export default function ActionValidationDisplay({ validation, onClose, onProceed, onRevise }) {
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
    if (degree === 'critical success') return 'text-green-800 bg-green-200';
    if (degree === 'great success') return 'text-green-700 bg-green-100';
    if (degree === 'success') return 'text-green-600 bg-green-50';
    if (degree === 'failure') return 'text-red-600 bg-red-50';
    if (degree === 'great failure') return 'text-red-700 bg-red-100';
    if (degree === 'critical failure') return 'text-red-800 bg-red-200';
    return isSuccess ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-800">Action Validation</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Validation Status */}
          <div className={`p-3 rounded-lg ${getValidationColor(validation.type)}`}>
            <div className="flex items-center space-x-2">
              <span className="text-xl">{getValidationIcon(validation.type)}</span>
              <span className="font-semibold capitalize">
                {validation.type === 'valid' ? 'Action Validated' : 
                 validation.type === 'redirect' ? 'Action Needs Redirection' :
                 validation.type === 'expand' ? 'Action Needs Clarification' :
                 'Action Not Possible'}
              </span>
            </div>
          </div>

          {/* Response */}
          <div className="p-4 bg-stone-50 rounded-lg">
            <h4 className="font-semibold text-stone-700 mb-2">DM Response</h4>
            <div className="text-stone-600 italic leading-relaxed">
              {typeof validation.response === 'string' 
                ? validation.response 
                : validation.response.story
              }
            </div>
          </div>

          {/* Suggestion */}
          {validation.suggestion && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">Suggestion</h4>
              <p className="text-blue-600">{validation.suggestion}</p>
            </div>
          )}

          {/* Dice Results */}
          {validation.diceResult && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <h4 className="font-semibold text-amber-700 mb-2">Action Analysis</h4>
              
              {/* Summary */}
              {validation.diceResult.summary && (
                <div className="mb-3 p-2 bg-amber-100 rounded text-sm font-medium">
                  {validation.diceResult.summary}
                </div>
              )}

              {/* Context Information */}
              {validation.diceResult.contextInfo && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-semibold text-blue-700 mb-2 text-sm">Story Context</h5>
                  <p className="text-blue-600 text-sm mb-2">{validation.diceResult.contextInfo.description}</p>
                  
                  {validation.diceResult.contextInfo.environmentalFeatures.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-blue-700">Environment:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {validation.diceResult.contextInfo.environmentalFeatures.map((feature, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validation.diceResult.contextInfo.npcs.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-blue-700">NPCs:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {validation.diceResult.contextInfo.npcs.map((npc, index) => (
                          <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {npc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validation.diceResult.contextInfo.circumstances.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-blue-700">Circumstances:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {validation.diceResult.contextInfo.circumstances.map((circumstance, index) => (
                          <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {circumstance}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {validation.diceResult.actions ? (
                <div className="space-y-3">
                  {validation.diceResult.actions.map((action, index) => (
                    <div key={index} className="border border-amber-200 rounded-lg p-3 bg-white">
                      {/* Action Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold capitalize text-stone-800">
                              {action.action}
                            </span>
                            {action.quantity > 1 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                ×{action.quantity}
                              </span>
                            )}
                            {action.isSequence && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                Sequence
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-stone-600">{action.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${getActionResultColor(action.check.isSuccess, action.check.degree)}`}>
                          {action.check.degree ? action.check.degree.replace('_', ' ').toUpperCase() : (action.check.isSuccess ? 'SUCCESS' : 'FAILURE')}
                        </span>
                      </div>
                      
                      {/* Action Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-stone-600">
                        <div>
                          <span className="font-medium">Roll:</span> {action.check.roll}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span> {action.check.totalRoll}
                        </div>
                        <div>
                          <span className="font-medium">DC:</span> {action.check.dc}
                        </div>
                        <div>
                          <span className="font-medium">Difficulty:</span> {action.difficulty}
                        </div>
                      </div>
                      
                      {/* Fatigue Penalty */}
                      {action.fatiguePenalty > 0 && (
                        <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                          ⚠️ Fatigue penalty: +{action.fatiguePenalty} DC (Action {action.position} of {action.totalInSequence})
                        </div>
                      )}

                      {/* Context Modifiers */}
                      {action.contextModifiers && (
                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Context modifiers:</span>
                          <ul className="mt-1 space-y-1">
                            {action.contextModifiers.map((modifier, idx) => (
                              <li key={idx}>• {modifier}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Circumstances */}
                      {action.check.circumstances && action.check.circumstances.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          <span className="font-medium">Circumstances:</span> {action.check.circumstances.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Overall Results */}
                  <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span>Overall Success:</span>
                      <span className={`px-2 py-1 rounded ${validation.diceResult.overallSuccess ? 'text-green-700 bg-green-200' : 'text-red-700 bg-red-200'}`}>
                        {validation.diceResult.overallSuccess ? 'SUCCESS' : 'FAILURE'}
                      </span>
                    </div>
                    {validation.diceResult.criticalFailures && validation.diceResult.criticalFailures.length > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        ⚠️ {validation.diceResult.criticalFailures.length} critical failure(s) detected
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Roll:</span>
                    <span className="font-mono">{validation.diceResult.roll}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-mono">{validation.diceResult.totalRoll}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DC:</span>
                    <span className="font-mono">{validation.diceResult.dc}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alternative Suggestions */}
          {validation.type !== 'valid' && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-700 mb-2">Alternative Approaches</h4>
              <ul className="text-purple-600 text-sm space-y-1">
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
              className="fantasy-button bg-green-600 hover:bg-green-700"
            >
              Proceed with Action
            </button>
          ) : (
            <button
              onClick={onRevise}
              className="fantasy-button bg-blue-600 hover:bg-blue-700"
            >
              Revise Action
            </button>
          )}
          <button
            onClick={onClose}
            className="fantasy-button bg-stone-600 hover:bg-stone-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 