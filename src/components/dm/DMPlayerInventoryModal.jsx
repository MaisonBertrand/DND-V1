import React, { useState, useEffect } from 'react';
import { dmCatalogsService } from '../../services/dmCatalogs';
import { updateCharacter } from '../../firebase/database';
import { levelUpService } from '../../services/levelUpService';
import { 
  getAbilityModifier, 
  getRarityColor,
  formatAbilityModifier 
} from '../../utils/characterUtils';

export default function DMPlayerInventoryModal({ 
  character, 
  isOpen, 
  onClose, 
  onUpdate 
}) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [xpToAdd, setXpToAdd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (isOpen) {
      // Load items from catalog
      const catalogItems = dmCatalogsService.initializeItems();
      setItems(catalogItems);
      setSelectedItems([]);
      setSearchQuery('');
      setXpToAdd('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Categorize items
  const categorizedItems = items.reduce((acc, item) => {
    const category = item.type || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(categorizedItems).sort();

  const filteredItems = items.filter(item =>
    (selectedCategory === 'all' || item.type === selectedCategory) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.rarity.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(selected => selected.id === item.id);
      if (exists) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleAddItems = async () => {
    if (selectedItems.length === 0) return;
    
    setIsLoading(true);
    try {
      const updatedEquipment = [
        ...(character.equipment || []),
        ...selectedItems
      ];
      
      await updateCharacter(character.id, {
        equipment: updatedEquipment
      });
      
      onUpdate();
      setSelectedItems([]);
    } catch (error) {
      console.error('Error adding items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (itemIndex) => {
    setIsLoading(true);
    try {
      const updatedEquipment = character.equipment.filter((_, index) => index !== itemIndex);
      
      await updateCharacter(character.id, {
        equipment: updatedEquipment
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddXP = async () => {
    const xpAmount = parseInt(xpToAdd);
    if (isNaN(xpAmount) || xpAmount <= 0) return;
    
    setIsLoading(true);
    try {
      const currentXP = character.xp || 0;
      const newXP = currentXP + xpAmount;
      
      // Check if this will trigger a level up
      const characterWithNewXP = { ...character, xp: newXP };
      const willLevelUp = levelUpService.shouldLevelUp(characterWithNewXP);
      
      await updateCharacter(character.id, {
        xp: newXP
      });
      
      onUpdate();
      setXpToAdd('');
      
      // Show level up message if applicable
      if (willLevelUp) {
        const levelUpInfo = levelUpService.getLevelUpInfo(characterWithNewXP);
        alert(`${character.name} has leveled up to level ${levelUpInfo.newLevel}! They should complete their level-up choices.`);
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-6 shadow-lg backdrop-blur-sm max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            Manage {character.name}'s Inventory
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-600 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('add-items')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'add-items'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            ➕ Add Items
          </button>
          <button
            onClick={() => setActiveTab('xp')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'xp'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            ⭐ Experience
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Character Stats */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Character Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-xs text-slate-400">Level</div>
                    <div className="text-lg font-bold text-slate-200">{character.level}</div>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-xs text-slate-400">XP</div>
                    <div className="text-lg font-bold text-slate-200">{character.xp || 0}</div>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-xs text-slate-400">HP</div>
                    <div className="text-lg font-bold text-slate-200">{character.hp}/{character.maxHp}</div>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3">
                    <div className="text-xs text-slate-400">AC</div>
                    <div className="text-lg font-bold text-slate-200">{character.ac}</div>
                  </div>
                </div>

                {/* Ability Scores */}
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-200">Ability Scores</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {[
                      { name: 'STR', score: character.strength },
                      { name: 'DEX', score: character.dexterity },
                      { name: 'CON', score: character.constitution },
                      { name: 'INT', score: character.intelligence },
                      { name: 'WIS', score: character.wisdom },
                      { name: 'CHA', score: character.charisma }
                    ].map((ability) => (
                      <div key={ability.name} className="bg-slate-700/30 rounded p-2 text-center">
                        <div className="text-xs text-slate-400">{ability.name}</div>
                        <div className="font-bold text-slate-200">{ability.score}</div>
                        <div className="text-xs text-slate-300">
                          {formatAbilityModifier(getAbilityModifier(ability.score))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Equipment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Current Equipment</h3>
                {character.equipment && character.equipment.length > 0 ? (
                  <div className="space-y-2">
                    {character.equipment.map((item, index) => (
                      <div key={index} className="bg-slate-700/30 rounded p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-slate-200">{item.name}</div>
                          <div className="text-sm text-slate-400">
                            {item.type} • <span className={getRarityColor(item.rarity)}>{item.rarity}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          disabled={isLoading}
                          className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No equipment found.</p>
                )}
              </div>
            </div>
          )}

          {/* Add Items Tab */}
          {activeTab === 'add-items' && (
            <div className="space-y-4">
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-400"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-slate-200"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={`bg-slate-700/30 rounded p-3 cursor-pointer transition-colors ${
                      selectedItems.find(selected => selected.id === item.id)
                        ? 'ring-2 ring-amber-400 bg-amber-900/20'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-sm text-slate-400">
                      {item.type} • <span className={getRarityColor(item.rarity)}>{item.rarity}</span>
                    </div>
                    {item.description && (
                      <div className="text-sm text-slate-300 mt-2 line-clamp-2">{item.description}</div>
                    )}
                  </div>
                ))}
              </div>

              {selectedItems.length > 0 && (
                <div className="flex gap-4">
                  <button
                    onClick={handleAddItems}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? 'Adding...' : `Add ${selectedItems.length} Item${selectedItems.length > 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={() => setSelectedItems([])}
                    className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          )}

          {/* XP Tab */}
          {activeTab === 'xp' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Add Experience Points</h3>
              <div className="bg-slate-700/30 rounded p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Current XP: {character.xp || 0}
                    </label>
                    <input
                      type="number"
                      placeholder="Enter XP to add..."
                      value={xpToAdd}
                      onChange={(e) => setXpToAdd(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-slate-200 placeholder-slate-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddXP}
                      disabled={isLoading || !xpToAdd || parseInt(xpToAdd) <= 0}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                    >
                      {isLoading ? 'Adding...' : 'Add XP'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 