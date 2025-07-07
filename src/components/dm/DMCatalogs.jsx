import React, { useState } from 'react';
import { dmCatalogsService } from '../../services/dmCatalogs';

export default function DMCatalogs() {
  const [activeTab, setActiveTab] = useState('monsters');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const tabs = [
    { id: 'monsters', name: '🐉 Monsters', icon: '🐉' },
    { id: 'items', name: '⚔️ Items', icon: '⚔️' },
    { id: 'spells', name: '✨ Spells', icon: '✨' },
    { id: 'npcs', name: '👤 NPCs', icon: '👤' }
  ];

  const getSearchResults = () => {
    if (!searchQuery.trim()) {
      switch (activeTab) {
        case 'monsters':
          return dmCatalogsService.monsters;
        case 'items':
          return dmCatalogsService.items;
        case 'spells':
          return dmCatalogsService.spells;
        case 'npcs':
          return dmCatalogsService.npcs;
        default:
          return [];
      }
    }

    switch (activeTab) {
      case 'monsters':
        return dmCatalogsService.searchMonsters(searchQuery);
      case 'items':
        return dmCatalogsService.searchItems(searchQuery);
      case 'spells':
        return dmCatalogsService.searchSpells(searchQuery);
      case 'npcs':
        return dmCatalogsService.searchNPCs(searchQuery);
      default:
        return [];
    }
  };

  const renderMonsterCard = (monster) => (
    <div key={monster.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-100">{monster.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">{monster.cr}</span>
          <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">{monster.type}</span>
        </div>
      </div>
      <p className="text-slate-300 text-sm mb-3">{monster.description}</p>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400">HP: </span>
          <span className="text-slate-200">{monster.hp}</span>
        </div>
        <div>
          <span className="text-slate-400">AC: </span>
          <span className="text-slate-200">{monster.ac}</span>
        </div>
        <div>
          <span className="text-slate-400">Speed: </span>
          <span className="text-slate-200">{monster.speed}</span>
        </div>
      </div>
      {monster.actions && monster.actions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-slate-300 mb-1">Actions:</h4>
          <div className="space-y-1">
            {monster.actions.slice(0, 2).map((action, index) => (
              <div key={index} className="text-xs text-slate-400">
                <span className="font-medium">{action.name}:</span> {action.damage}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderItemCard = (item) => (
    <div key={item.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-100">{item.name}</h3>
        <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">{item.rarity}</span>
      </div>
      <p className="text-slate-300 text-sm mb-3">{item.description}</p>
      <div className="text-xs text-slate-400">
        <div><span className="font-medium">Type:</span> {item.type}</div>
        {item.damage && <div><span className="font-medium">Damage:</span> {item.damage}</div>}
        {item.ac && <div><span className="font-medium">AC Bonus:</span> {item.ac}</div>}
        {item.effect && <div><span className="font-medium">Effect:</span> {item.effect}</div>}
        {item.properties && item.properties.length > 0 && (
          <div><span className="font-medium">Properties:</span> {item.properties.join(', ')}</div>
        )}
      </div>
    </div>
  );

  const renderSpellCard = (spell) => (
    <div key={spell.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-100">{spell.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Level {spell.level}</span>
          <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">{spell.school}</span>
        </div>
      </div>
      <p className="text-slate-300 text-sm mb-3">{spell.description}</p>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400">Casting Time: </span>
          <span className="text-slate-200">{spell.castingTime}</span>
        </div>
        <div>
          <span className="text-slate-400">Range: </span>
          <span className="text-slate-200">{spell.range}</span>
        </div>
        <div>
          <span className="text-slate-400">Duration: </span>
          <span className="text-slate-200">{spell.duration}</span>
        </div>
        <div>
          <span className="text-slate-400">Components: </span>
          <span className="text-slate-200">{spell.components.join(', ')}</span>
        </div>
      </div>
      {(spell.damage || spell.healing) && (
        <div className="mt-2 text-xs">
          {spell.damage && <div><span className="text-slate-400">Damage: </span><span className="text-slate-200">{spell.damage}</span></div>}
          {spell.healing && <div><span className="text-slate-400">Healing: </span><span className="text-slate-200">{spell.healing}</span></div>}
          {spell.save && <div><span className="text-slate-400">Save: </span><span className="text-slate-200">{spell.save}</span></div>}
        </div>
      )}
    </div>
  );

  const renderNPCCard = (npc) => (
    <div key={npc.id} className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-slate-100">{npc.name}</h3>
        <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">{npc.type}</span>
      </div>
      <p className="text-slate-300 text-sm mb-3">{npc.description}</p>
      <div className="text-xs text-slate-400 space-y-1">
        <div><span className="font-medium">Occupation:</span> {npc.occupation}</div>
        <div><span className="font-medium">Personality:</span> {npc.personality}</div>
        {npc.inventory && (
          <div><span className="font-medium">Inventory:</span> {npc.inventory.join(', ')}</div>
        )}
        {npc.equipment && (
          <div><span className="font-medium">Equipment:</span> {npc.equipment.join(', ')}</div>
        )}
        {npc.knowledge && (
          <div><span className="font-medium">Knowledge:</span> {npc.knowledge.join(', ')}</div>
        )}
      </div>
    </div>
  );

  const renderCard = (item) => {
    switch (activeTab) {
      case 'monsters':
        return renderMonsterCard(item);
      case 'items':
        return renderItemCard(item);
      case 'spells':
        return renderSpellCard(item);
      case 'npcs':
        return renderNPCCard(item);
      default:
        return null;
    }
  };

  const searchResults = getSearchResults();

  return (
    <div className="fantasy-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-100">📚 DM Catalogs</h3>
        <button
          onClick={() => {
            const randomItem = searchResults[Math.floor(Math.random() * searchResults.length)];
            if (randomItem) {
              setSelectedItem(randomItem);
            }
          }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
        >
          🎲 Random
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="w-full bg-slate-800 border border-slate-600 text-slate-100 px-3 py-2 rounded-lg focus:border-slate-500 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {tab.icon} {tab.name.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {searchResults.map(renderCard)}
      </div>

      {/* No Results */}
      {searchResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">No {activeTab} found matching your search.</p>
        </div>
      )}

      {/* Selected Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Selected {activeTab.slice(0, -1)}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            {renderCard(selectedItem)}
          </div>
        </div>
      )}
    </div>
  );
} 