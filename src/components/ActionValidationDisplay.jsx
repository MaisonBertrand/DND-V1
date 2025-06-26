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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
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
            <h4 className="font-semibold text-stone-700 mb-2">Response</h4>
            <p className="text-stone-600">{validation.response}</p>
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
              <h4 className="font-semibold text-amber-700 mb-2">Dice Analysis</h4>
              {validation.diceResult.actions ? (
                <div className="space-y-2">
                  {validation.diceResult.actions.map((action, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{action.action}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        action.check.isSuccess ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {action.check.isSuccess ? 'Success' : 'Failure'}
                      </span>
                    </div>
                  ))}
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