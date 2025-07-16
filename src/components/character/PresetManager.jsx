import React from 'react';

export default function PresetManager({
  characterPresets,
  showPresetModal,
  setShowPresetModal,
  showLoadPresetModal,
  setShowLoadPresetModal,
  presetName,
  setPresetName,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onPresetKeyPress
}) {
  if (!showPresetModal && !showLoadPresetModal) return null;

  return (
    <>
      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 w-full max-w-md mx-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4">Save Character Preset</h3>
            <p className="text-gray-300 mb-4 text-sm sm:text-base">
              Save your current character as a preset for future use.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="preset-name" className="block text-sm font-medium text-amber-200 mb-2">
                  Preset Name
                </label>
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyPress={onPresetKeyPress}
                  className="fantasy-input"
                  placeholder="Enter preset name"
                  autoFocus
                />
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={onSavePreset}
                  className="fantasy-button flex-1"
                >
                  Save Preset
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresetModal(false)}
                  className="fantasy-button bg-gray-600 hover:bg-gray-700 flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Preset Modal */}
      {showLoadPresetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Load Character Preset</h3>

            {characterPresets.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-300 mb-4 text-sm sm:text-base">No saved presets found.</p>
                <button
                  type="button"
                  onClick={() => setShowLoadPresetModal(false)}
                  className="fantasy-button"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid gap-3">
                  {characterPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="bg-gray-700 border border-gray-600 rounded-lg p-3 sm:p-4 hover:border-amber-500/40 transition-colors duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-100 mb-2">
                            {preset.name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-amber-300 font-medium">Name:</span>
                              <span className="text-gray-300 ml-1 sm:ml-2">{preset.data.name || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-amber-300 font-medium">Race:</span>
                              <span className="text-gray-300 ml-1 sm:ml-2">{preset.data.race || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-amber-300 font-medium">Class:</span>
                              <span className="text-gray-300 ml-1 sm:ml-2">{preset.data.class || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="text-amber-300 font-medium">Level:</span>
                              <span className="text-gray-300 ml-1 sm:ml-2">1</span>
                            </div>
                          </div>
                          {preset.createdAt && (
                            <p className="text-gray-400 text-xs mt-2">
                              Created: {preset.createdAt.toDate ? preset.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => onLoadPreset(preset)}
                            className="fantasy-button bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm flex-1 sm:flex-none"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeletePreset(preset.id)}
                            className="fantasy-button bg-red-600 hover:bg-red-700 px-3 py-2 text-sm flex-1 sm:flex-none"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4 border-t border-gray-600">
                  <button
                    type="button"
                    onClick={() => setShowLoadPresetModal(false)}
                    className="fantasy-button bg-gray-600 hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 