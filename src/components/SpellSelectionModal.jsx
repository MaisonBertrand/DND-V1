import React, { useState, useEffect } from 'react';
import { dmCatalogsService } from '../services/dmCatalogs';
import { updateCharacter } from '../firebase/database';

export default function SpellSelectionModal({ 
  character, 
  isOpen, 
  onClose, 
  onUpdate,
  availableSpellSlots = {} // e.g., { 1: 2, 2: 1 } for 2 level 1 spells and 1 level 2 spell
}) {
  const [spells, setSpells] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpellLevel, setSelectedSpellLevel] = useState('all');
  const [selectedSpells, setSelectedSpells] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const catalogSpells = dmCatalogsService.initializeSpells();
      setSpells(catalogSpells);
      setSelectedSpells({});
      setSearchQuery('');
      setSelectedSpellLevel('all');
    }
  }, [isOpen]);

  // Filter spells based on character class and level
  const getClassSpells = () => {
    // Add null check for character
    if (!character || !character.class) {
      return [];
    }
    
    const spellcastingClasses = ['Wizard', 'Sorcerer', 'Warlock', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger'];
    const isSpellcaster = spellcastingClasses.includes(character.class);
    
    if (!isSpellcaster) return [];

    // Filter spells by class (simplified - in a real implementation you'd have class spell lists)
    return spells.filter(spell => {
      // Basic class spell filtering
      if (character.class === 'Wizard') {
        return ['Evocation', 'Conjuration', 'Transmutation', 'Illusion', 'Abjuration', 'Divination', 'Enchantment', 'Necromancy'].includes(spell.school);
      }
      if (character.class === 'Cleric') {
        return ['Evocation', 'Abjuration', 'Divination', 'Enchantment'].includes(spell.school);
      }
      if (character.class === 'Druid') {
        return ['Conjuration', 'Transmutation', 'Evocation', 'Abjuration', 'Divination'].includes(spell.school);
      }
      if (character.class === 'Bard') {
        return ['Enchantment', 'Illusion', 'Divination', 'Transmutation'].includes(spell.school);
      }
      if (character.class === 'Sorcerer') {
        return ['Evocation', 'Conjuration', 'Transmutation', 'Illusion', 'Abjuration', 'Divination', 'Enchantment', 'Necromancy'].includes(spell.school);
      }
      if (character.class === 'Warlock') {
        return ['Conjuration', 'Evocation', 'Enchantment', 'Illusion', 'Abjuration', 'Divination', 'Transmutation', 'Necromancy'].includes(spell.school);
      }
      if (character.class === 'Paladin') {
        return ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'].includes(spell.school);
      }
      if (character.class === 'Ranger') {
        return ['Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Transmutation'].includes(spell.school);
      }
      
      return true; // Default to showing all spells
    });
  };

  const classSpells = getClassSpells();

  const filteredSpells = classSpells.filter(spell =>
    (selectedSpellLevel === 'all' || spell.level.toString() === selectedSpellLevel) &&
    (spell.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     spell.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
     spell.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSpellSelect = (spell) => {
    setSelectedSpells(prev => {
      const newSelected = { ...prev };
      const spellLevel = spell.level;
      
      if (newSelected[spellLevel] && newSelected[spellLevel].find(s => s.id === spell.id)) {
        // Remove spell
        newSelected[spellLevel] = newSelected[spellLevel].filter(s => s.id !== spell.id);
        if (newSelected[spellLevel].length === 0) {
          delete newSelected[spellLevel];
        }
      } else {
        // Add spell
        if (!newSelected[spellLevel]) {
          newSelected[spellLevel] = [];
        }
        newSelected[spellLevel].push(spell);
      }
      
      return newSelected;
    });
  };

  const handleConfirmSelection = async () => {
    // Add null check for character
    if (!character || !character.id) {
      alert('Character data is missing. Please try again.');
      return;
    }
    
    setIsLoading(true);
    try {
      const currentSpells = character.spells || [];
      const newSpells = [...currentSpells];
      
      // Add all selected spells
      Object.values(selectedSpells).forEach(spellList => {
        spellList.forEach(spell => {
          if (!newSpells.includes(spell.name)) {
            newSpells.push(spell.name);
          }
        });
      });

      // Update character in database
      await updateCharacter(character.id, { spells: newSpells });
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
      
      // Show success message
      const totalSpells = Object.values(selectedSpells).flat().length;
      alert(`Successfully learned ${totalSpells} new spell(s)!`);
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error learning spells:', error);
      alert('Failed to learn spells. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedCountForLevel = (level) => {
    return selectedSpells[level] ? selectedSpells[level].length : 0;
  };

  const getAvailableCountForLevel = (level) => {
    return availableSpellSlots[level] || 0;
  };

  const canSelectMoreForLevel = (level) => {
    return getSelectedCountForLevel(level) < getAvailableCountForLevel(level);
  };

  const getTotalSelectedCount = () => {
    return Object.values(selectedSpells).flat().length;
  };

  const getTotalAvailableCount = () => {
    return Object.values(availableSpellSlots).reduce((sum, count) => sum + count, 0);
  };

  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-slate-100">
              ✨ Learn New Spells
            </h3>
            <p className="text-slate-400 text-sm">
              {character?.name || 'Unknown'} • {character?.class || 'Unknown'} • Level {character?.level || 1}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Spell Slots Summary */}
        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg flex-shrink-0">
          <h4 className="text-lg font-semibold text-slate-200 mb-3">Available Spell Slots</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(availableSpellSlots).map(([level, count]) => (
              <div key={level} className="flex items-center gap-2">
                <span className="text-purple-400 font-medium">
                  {level === '0' ? 'Cantrips' : `Level ${level}`}:
                </span>
                <span className={`text-sm px-2 py-1 rounded ${
                  getSelectedCountForLevel(parseInt(level)) >= count
                    ? 'bg-green-600/30 text-green-300'
                    : 'bg-slate-600/30 text-slate-300'
                }`}>
                  {getSelectedCountForLevel(parseInt(level))}/{count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-slate-400">
            Total: {getTotalSelectedCount()}/{getTotalAvailableCount()} spells selected
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-2 flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spells by name, school, or description..."
            className="w-full bg-slate-700 border border-slate-600 text-slate-100 px-3 py-2 rounded focus:border-slate-500 focus:outline-none"
          />
          
          {/* Level Filter */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedSpellLevel('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedSpellLevel === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              All Levels
            </button>
            {Object.keys(availableSpellSlots).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedSpellLevel(level)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedSpellLevel === level
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                {level === '0' ? 'Cantrips' : `Level ${level}`}
              </button>
            ))}
          </div>
        </div>

        {/* Spell List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSpells.map((spell) => {
              const isSelected = selectedSpells[spell.level] && 
                selectedSpells[spell.level].find(s => s.id === spell.id);
              const canSelect = canSelectMoreForLevel(spell.level);
              
              return (
                <div
                  key={spell.id}
                  onClick={() => canSelect && handleSpellSelect(spell)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/30 border-purple-500/50'
                      : canSelect
                        ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50'
                        : 'bg-slate-800/30 border-slate-700/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <div>
                        <div className="text-slate-200 font-medium">{spell.name}</div>
                        <div className="text-slate-400 text-sm">
                          Level {spell.level} • {spell.school}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-400 text-sm">
                      {isSelected ? '✓' : canSelect ? '○' : '✗'}
                    </div>
                  </div>
                  
                  {spell.description && (
                    <p className="text-slate-300 text-sm mb-2">{spell.description}</p>
                  )}
                  
                  {(spell.damage || spell.healing || spell.save) && (
                    <div className="flex flex-wrap gap-2 text-xs mb-2">
                      {spell.damage && (
                        <span className="text-red-400 bg-red-900/30 px-2 py-1 rounded">
                          Damage: {spell.damage}
                        </span>
                      )}
                      {spell.healing && (
                        <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded">
                          Healing: {spell.healing}
                        </span>
                      )}
                      {spell.save && (
                        <span className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                          Save: {spell.save}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {spell.castingTime && (
                      <span>Casting: {spell.castingTime}</span>
                    )}
                    {spell.range && (
                      <span>Range: {spell.range}</span>
                    )}
                    {spell.duration && (
                      <span>Duration: {spell.duration}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredSpells.length === 0 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-slate-400">No spells found matching your criteria</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-600 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={isLoading || getTotalSelectedCount() === 0}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Learning...' : `Learn ${getTotalSelectedCount()} Spell(s)`}
          </button>
        </div>
      </div>
    </div>
  );
} 