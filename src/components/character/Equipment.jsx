import React from 'react';
import { weaponOptions, spellOptions, spellLimits, baseEquipment } from '../../data/characterData';

export default function Equipment({ 
  character, 
  weaponChoices, 
  setWeaponChoices, 
  spellChoices, 
  setSpellChoices 
}) {
  const getStartingEquipment = (characterClass) => {
    if (!characterClass || !baseEquipment[characterClass]) {
      return ['Adventurer\'s pack', 'Simple weapon', '5 gp'];
    }
    
    const equipment = [...(baseEquipment[characterClass] || ['Adventurer\'s pack', 'Simple weapon', '5 gp'])];
    
    // Add chosen weapons to equipment
    if (weaponChoices) {
      Object.values(weaponChoices).forEach(weapon => {
        if (weapon) {
          equipment.push(weapon);
        }
      });
    }
    
    // Add chosen spells to equipment
    if (spellChoices && spellChoices.length > 0) {
      equipment.push(`Spells: ${spellChoices.join(', ')}`);
    }
    
    return equipment;
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">Starting Equipment</h2>
      
      {/* Weapon Selection */}
      {character.class && weaponOptions[character.class] && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Choose Your Weapons</h3>
          <div className="space-y-4">
            {Object.entries(weaponOptions[character.class]).map(([category, weapons]) => (
              <div key={category}>
                <label htmlFor={`weapon-${category.toLowerCase().replace(/\s+/g, '')}`} className="block text-sm font-medium text-gray-200 mb-2">
                  {category}
                </label>
                <select
                  id={`weapon-${category.toLowerCase().replace(/\s+/g, '')}`}
                  name={`weapon-${category.toLowerCase().replace(/\s+/g, '')}`}
                  value={weaponChoices[category.toLowerCase().replace(/\s+/g, '')] || ''}
                  onChange={(e) => setWeaponChoices(prev => ({
                    ...prev,
                    [category.toLowerCase().replace(/\s+/g, '')]: e.target.value
                  }))}
                  className="fantasy-input"
                >
                  <option value="">Select {category}</option>
                  {weapons.map(weapon => (
                    <option key={weapon} value={weapon}>{weapon}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spell Selection */}
      {character.class && spellOptions[character.class] && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Choose Your Cantrips</h3>
          <p className="text-sm text-gray-300 mb-3">
            Select your starting cantrips (0-level spells). You can choose up to {spellLimits[character.class]?.cantrips || 0} cantrips.
          </p>
          <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border border-gray-600 rounded-lg p-3 sm:p-4">
            {spellOptions[character.class].map(spell => {
              const isSelected = spellChoices.includes(spell.name);
              const isDisabled = !isSelected && spellChoices.length >= (spellLimits[character.class]?.cantrips || 0);
              
              return (
                <div 
                  key={spell.name} 
                  className={`border rounded-lg p-3 ${isSelected ? 'border-amber-500 bg-amber-900/20' : 'border-gray-600'} ${isDisabled ? 'opacity-50' : 'hover:border-gray-500'}`}
                >
                  <label className={`flex items-start space-x-3 cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}>
                    <input
                      id={`spell-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
                      name={`spell-${spell.name.toLowerCase().replace(/\s+/g, '-')}`}
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSpellChoices(prev => [...prev, spell.name]);
                        } else {
                          setSpellChoices(prev => prev.filter(s => s !== spell.name));
                        }
                      }}
                      className="rounded mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-100 text-sm sm:text-base">{spell.name}</div>
                      <div className="text-xs sm:text-sm text-gray-300 mt-1">{spell.description}</div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-3 gap-2">
            <p className="text-sm text-gray-400">
              Selected: {spellChoices.length} / {spellLimits[character.class]?.cantrips || 0} cantrips
            </p>
            {spellChoices.length >= (spellLimits[character.class]?.cantrips || 0) && (
              <p className="text-sm text-green-400 font-medium">
                ✓ Cantrip selection complete
              </p>
            )}
          </div>
        </div>
      )}

      {/* Equipment Display */}
      {character.class ? (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold text-gray-100 mb-3 text-base sm:text-lg">
            {character.class} Starting Equipment
          </h3>
          <ul className="space-y-1">
            {getStartingEquipment(character.class).map((item, index) => (
              <li key={index} className="text-gray-200 flex items-start text-sm sm:text-base">
                <span className="text-gray-400 mr-2 flex-shrink-0">•</span>
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs sm:text-sm text-gray-300 mt-3">
            This equipment will be automatically assigned to your character.
          </p>
        </div>
      ) : (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 sm:p-4">
          <p className="text-gray-300 text-sm sm:text-base">
            Select a class to see your starting equipment.
          </p>
        </div>
      )}
    </div>
  );
} 