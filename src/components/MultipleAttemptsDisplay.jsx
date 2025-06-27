import React, { useState } from 'react';

export default function MultipleAttemptsDisplay({ multipleResults, onClose }) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  if (!multipleResults) return null;

  const { actionType, numberOfAttempts, results, statistics } = multipleResults;

  const getAttemptColor = (attempt) => {
    if (attempt.adjustedSuccess && attempt.adjustedMargin >= 10) return 'bg-green-500';
    if (attempt.adjustedSuccess) return 'bg-green-400';
    if (!attempt.adjustedSuccess && attempt.adjustedMargin <= -10) return 'bg-red-500';
    return 'bg-red-400';
  };

  const getAttemptIcon = (attempt) => {
    if (attempt.adjustedSuccess && attempt.adjustedMargin >= 10) return '🎯';
    if (attempt.adjustedSuccess) return '✅';
    if (!attempt.adjustedSuccess && attempt.adjustedMargin <= -10) return '💥';
    return '❌';
  };

  const getAttemptTooltip = (attempt) => {
    const baseInfo = `Attempt ${attempt.attemptNumber}: ${attempt.roll} + ${attempt.primaryMod} + ${attempt.proficiencyMod}`;
    const fatigueInfo = attempt.fatiguePenalty > 0 ? ` - ${attempt.fatiguePenalty} (fatigue)` : '';
    const totalInfo = ` = ${attempt.adjustedTotalRoll} vs DC ${attempt.dc}`;
    const resultInfo = attempt.adjustedSuccess ? ' (Success)' : ' (Failure)';
    
    return baseInfo + fatigueInfo + totalInfo + resultInfo;
  };

  // Group attempts for better display
  const groupAttempts = (attempts, groupSize = 50) => {
    const groups = [];
    for (let i = 0; i < attempts.length; i += groupSize) {
      groups.push(attempts.slice(i, i + groupSize));
    }
    return groups;
  };

  const attemptGroups = groupAttempts(results);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-stone-800">
            Multiple Attempts: {actionType} ({numberOfAttempts} attempts)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Statistics Summary */}
        <div className="mb-6 p-4 bg-stone-50 rounded-lg">
          <h4 className="font-semibold text-stone-700 mb-3">Overall Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.successfulAttempts}</div>
              <div className="text-sm text-stone-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-stone-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{statistics.criticalSuccesses}</div>
              <div className="text-sm text-stone-600">Critical Successes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.criticalFailures}</div>
              <div className="text-sm text-stone-600">Critical Failures</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold">Average Roll:</span> {statistics.averageRoll.toFixed(1)}
            </div>
            <div>
              <span className="font-semibold">Best Roll:</span> {statistics.bestRoll}
            </div>
            <div>
              <span className="font-semibold">Worst Roll:</span> {statistics.worstRoll}
            </div>
            <div>
              <span className="font-semibold">Average Total:</span> {statistics.averageTotalRoll.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Attempt Indicators */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-stone-700">Individual Attempts</h4>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          <div className="space-y-2">
            {attemptGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="flex flex-wrap gap-1">
                {group.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    className={`w-6 h-6 rounded text-xs flex items-center justify-center cursor-pointer transition-colors ${getAttemptColor(attempt)} text-white font-bold`}
                    title={getAttemptTooltip(attempt)}
                    onClick={() => setSelectedAttempt(attempt)}
                  >
                    {getAttemptIcon(attempt)}
                  </div>
                ))}
                {groupIndex < attemptGroups.length - 1 && (
                  <div className="w-full h-px bg-stone-300 my-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-stone-50 rounded-lg">
          <h5 className="font-semibold text-stone-700 mb-2">Legend</h5>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded text-white text-xs flex items-center justify-center">🎯</div>
              <span>Critical Success</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-400 rounded text-white text-xs flex items-center justify-center">✅</div>
              <span>Success</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-400 rounded text-white text-xs flex items-center justify-center">❌</div>
              <span>Failure</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded text-white text-xs flex items-center justify-center">💥</div>
              <span>Critical Failure</span>
            </div>
          </div>
        </div>

        {/* Detailed Attempt View */}
        {selectedAttempt && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-semibold text-blue-700 mb-2">
              Attempt {selectedAttempt.attemptNumber} Details
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">Roll:</span> {selectedAttempt.roll}
              </div>
              <div>
                <span className="font-semibold">Primary Mod:</span> {selectedAttempt.primaryMod >= 0 ? '+' : ''}{selectedAttempt.primaryMod}
              </div>
              <div>
                <span className="font-semibold">Proficiency:</span> {selectedAttempt.proficiencyMod >= 0 ? '+' : ''}{selectedAttempt.proficiencyMod}
              </div>
              <div>
                <span className="font-semibold">Fatigue Penalty:</span> -{selectedAttempt.fatiguePenalty}
              </div>
              <div>
                <span className="font-semibold">Total:</span> {selectedAttempt.adjustedTotalRoll}
              </div>
              <div>
                <span className="font-semibold">DC:</span> {selectedAttempt.dc}
              </div>
              <div>
                <span className="font-semibold">Margin:</span> {selectedAttempt.adjustedMargin >= 0 ? '+' : ''}{selectedAttempt.adjustedMargin}
              </div>
              <div>
                <span className="font-semibold">Result:</span> 
                <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                  selectedAttempt.adjustedSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedAttempt.adjustedSuccess ? 'Success' : 'Failure'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedAttempt(null)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Close Details
            </button>
          </div>
        )}

        {/* Detailed Results Table (if showDetails is true) */}
        {showDetails && (
          <div className="mb-4">
            <h5 className="font-semibold text-stone-700 mb-2">Detailed Results</h5>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Roll</th>
                    <th className="px-2 py-1 text-left">Total</th>
                    <th className="px-2 py-1 text-left">DC</th>
                    <th className="px-2 py-1 text-left">Fatigue</th>
                    <th className="px-2 py-1 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((attempt) => (
                    <tr key={attempt.attemptNumber} className="border-b border-stone-200">
                      <td className="px-2 py-1">{attempt.attemptNumber}</td>
                      <td className="px-2 py-1">{attempt.roll}</td>
                      <td className="px-2 py-1">{attempt.adjustedTotalRoll}</td>
                      <td className="px-2 py-1">{attempt.dc}</td>
                      <td className="px-2 py-1">-{attempt.fatiguePenalty}</td>
                      <td className="px-2 py-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          attempt.adjustedSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {attempt.adjustedSuccess ? 'Success' : 'Failure'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end">
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