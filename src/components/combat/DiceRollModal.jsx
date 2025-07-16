import React, { useState, useEffect } from 'react';
import { manualDiceRoller } from '../../services/manualCombat';

export default function DiceRollModal({ 
  isOpen, 
  onClose, 
  onRollComplete, 
  diceNotation = '1d20',
  rollType = 'Attack Roll',
  modifier = 0 
}) {
  const [rollMethod, setRollMethod] = useState(null); // 'manual' or 'animated'
  const [manualRoll, setManualRoll] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [diceResults, setDiceResults] = useState([]);
  const [currentDiceIndex, setCurrentDiceIndex] = useState(0);
  const [finalResult, setFinalResult] = useState(null);

  // Parse dice notation (e.g., "2d6+3" -> { count: 2, sides: 6, modifier: 3 })
  const parseDiceNotation = (notation) => {
    const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (match) {
      return {
        count: parseInt(match[1]),
        sides: parseInt(match[2]),
        modifier: match[3] ? parseInt(match[3]) : 0
      };
    }
    return { count: 1, sides: 20, modifier: 0 };
  };

  const diceInfo = parseDiceNotation(diceNotation);

  const handleManualRoll = () => {
    const rollValue = parseInt(manualRoll);
    if (isNaN(rollValue) || rollValue < 1 || rollValue > diceInfo.sides) {
      alert(`Please enter a valid number between 1 and ${diceInfo.sides}`);
      return;
    }

    const total = rollValue + diceInfo.modifier + modifier;
    setFinalResult({
      roll: rollValue,
      modifier: diceInfo.modifier + modifier,
      total: total,
      method: 'manual'
    });
  };

  const startAnimatedRoll = () => {
    setIsRolling(true);
    setDiceResults([]);
    setCurrentDiceIndex(0);
    setFinalResult(null);
  };

  const rollNextDie = () => {
    if (currentDiceIndex < diceInfo.count) {
      const result = Math.floor(Math.random() * diceInfo.sides) + 1;
      setDiceResults(prev => [...prev, result]);
      setCurrentDiceIndex(prev => prev + 1);
    } else {
      // All dice rolled, calculate final result
      const totalRoll = diceResults.reduce((sum, roll) => sum + roll, 0);
      const total = totalRoll + diceInfo.modifier + modifier;
      setFinalResult({
        rolls: diceResults,
        modifier: diceInfo.modifier + modifier,
        total: total,
        method: 'animated'
      });
      setIsRolling(false);
    }
  };

  const handleComplete = () => {
    if (finalResult) {
      onRollComplete(finalResult);
      onClose();
    }
  };

  const resetModal = () => {
    setRollMethod(null);
    setManualRoll('');
    setIsRolling(false);
    setDiceResults([]);
    setCurrentDiceIndex(0);
    setFinalResult(null);
  };

  useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">🎲 {rollType}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl"
          >
            ×
          </button>
        </div>

        {!rollMethod && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Roll {diceNotation} {modifier !== 0 && `+ ${modifier}`}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRollMethod('manual')}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-2">✏️</div>
                <div className="text-sm font-medium">Manual Input</div>
                <div className="text-xs text-blue-200">Roll physical dice and enter result</div>
              </button>
              
              <button
                onClick={() => setRollMethod('animated')}
                className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-2">🎲</div>
                <div className="text-sm font-medium">Animated Roll</div>
                <div className="text-xs text-green-200">Computer rolls dice for you</div>
              </button>
            </div>
          </div>
        )}

        {rollMethod === 'manual' && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Roll your physical dice and enter the result below:
            </p>
            
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={diceInfo.sides}
                value={manualRoll}
                onChange={(e) => setManualRoll(e.target.value)}
                placeholder={`1-${diceInfo.sides}`}
                className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleManualRoll}
                disabled={!manualRoll}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
              >
                Submit
              </button>
            </div>

            {finalResult && (
              <div className="p-3 bg-slate-700 rounded border border-slate-600">
                <div className="text-sm text-slate-300">
                  <div>Roll: <span className="text-amber-400 font-bold">{finalResult.roll}</span></div>
                  <div>Modifier: <span className="text-slate-400">+{finalResult.modifier}</span></div>
                  <div className="text-lg font-bold text-green-400">
                    Total: {finalResult.total}
                  </div>
                </div>
                <button
                  onClick={handleComplete}
                  className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors"
                >
                  Use This Result
                </button>
              </div>
            )}
          </div>
        )}

        {rollMethod === 'animated' && !isRolling && !finalResult && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Click the dice to roll them one by one:
            </p>
            
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: diceInfo.count }, (_, i) => (
                <button
                  key={i}
                  onClick={startAnimatedRoll}
                  className="w-12 h-12 bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-center text-white font-bold text-lg transition-colors"
                >
                  🎲
                </button>
              ))}
            </div>
          </div>
        )}

        {rollMethod === 'animated' && isRolling && (
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Rolling dice {currentDiceIndex + 1} of {diceInfo.count}...
            </p>
            
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: diceInfo.count }, (_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg transition-all duration-500 ${
                    i < currentDiceIndex
                      ? 'bg-green-600 text-white'
                      : i === currentDiceIndex
                      ? 'bg-amber-600 text-white animate-pulse'
                      : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {i < currentDiceIndex ? diceResults[i] : i === currentDiceIndex ? '?' : '🎲'}
                </div>
              ))}
            </div>
            
            <button
              onClick={rollNextDie}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded transition-colors"
            >
              Roll Next Die
            </button>
          </div>
        )}

        {rollMethod === 'animated' && finalResult && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-700 rounded border border-slate-600">
              <div className="text-sm text-slate-300">
                <div>Rolls: <span className="text-amber-400 font-bold">{finalResult.rolls.join(', ')}</span></div>
                <div>Modifier: <span className="text-slate-400">+{finalResult.modifier}</span></div>
                <div className="text-lg font-bold text-green-400">
                  Total: {finalResult.total}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleComplete}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors"
            >
              Use This Result
            </button>
          </div>
        )}

        {rollMethod && !finalResult && (
          <button
            onClick={() => setRollMethod(null)}
            className="w-full mt-4 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded transition-colors"
          >
            Back to Method Selection
          </button>
        )}
      </div>
    </div>
  );
} 