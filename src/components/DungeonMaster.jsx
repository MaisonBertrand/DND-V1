import { useState } from 'react';
import { dungeonMasterService } from '../services/chatgpt';

export default function DungeonMaster({ partyCharacters, onStoryGenerated, onCharacterDetailsGenerated }) {
  const [activeTab, setActiveTab] = useState('plots');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [campaignSetting, setCampaignSetting] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [npcRole, setNpcRole] = useState('');
  const [npcContext, setNpcContext] = useState('');
  const [encounterDetails, setEncounterDetails] = useState({
    partyLevel: 1,
    partySize: partyCharacters.length,
    difficulty: 'medium',
    theme: ''
  });

  const handleGenerateStoryPlots = async () => {
    if (partyCharacters.length === 0) {
      setError('No party characters available. Please create characters first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const plots = await dungeonMasterService.generateStoryPlots(partyCharacters, campaignSetting);
      setGeneratedContent(plots);
      if (onStoryGenerated) {
        onStoryGenerated(plots);
      }
    } catch (err) {
      setError('Failed to generate story plots. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMultipleStoryPlots = async () => {
    if (partyCharacters.length === 0) {
      setError('No party characters available. Please create characters first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const plots = await dungeonMasterService.generateMultipleStoryPlots(partyCharacters, campaignSetting);
      setGeneratedContent(plots);
      if (onStoryGenerated) {
        onStoryGenerated(plots);
      }
    } catch (err) {
      setError('Failed to generate story plots. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCharacterDetails = async () => {
    if (!selectedCharacter) {
      setError('Please select a character first.');
      return;
    }

    const character = partyCharacters.find(c => c.id === selectedCharacter);
    if (!character) {
      setError('Selected character not found.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const details = await dungeonMasterService.generateCharacterDetails(character);
      setGeneratedContent(details);
      if (onCharacterDetailsGenerated) {
        onCharacterDetailsGenerated(character.id, details);
      }
    } catch (err) {
      setError('Failed to generate character details. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNPC = async () => {
    if (!npcRole.trim()) {
      setError('Please enter an NPC role.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const npc = await dungeonMasterService.generateNPC(npcRole, npcContext);
      setGeneratedContent(npc);
    } catch (err) {
      setError('Failed to generate NPC. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateEncounter = async () => {
    setLoading(true);
    setError('');
    try {
      const encounter = await dungeonMasterService.generateCombatEncounter(
        encounterDetails.partyLevel,
        encounterDetails.partySize,
        encounterDetails.difficulty,
        encounterDetails.theme
      );
      setGeneratedContent(encounter);
    } catch (err) {
      setError('Failed to generate encounter. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'plots', label: 'Story Plots', icon: '📖' },
    { id: 'characters', label: 'Character Details', icon: '👤' },
    { id: 'npcs', label: 'NPCs', icon: '🏰' },
    { id: 'encounters', label: 'Combat Encounters', icon: '⚔️' }
  ];

  return (
    <div className="fantasy-card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="fantasy-title mb-0">🤖 AI Dungeon Master</h2>
        <div className="text-sm text-stone-600">
          Powered by ChatGPT
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-stone-100 p-1 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white'
                : 'text-stone-600 hover:text-stone-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Story Plots Tab */}
      {activeTab === 'plots' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Campaign Setting (Optional)
            </label>
            <textarea
              value={campaignSetting}
              onChange={(e) => setCampaignSetting(e.target.value)}
              className="fantasy-input"
              rows="3"
              placeholder="Describe your campaign setting, world, or any specific themes..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleGenerateStoryPlots}
              disabled={loading || partyCharacters.length === 0}
              className="fantasy-button"
            >
              {loading ? 'Generating...' : 'Generate Basic Plots'}
            </button>
            
            <button
              onClick={handleGenerateMultipleStoryPlots}
              disabled={loading || partyCharacters.length === 0}
              className="fantasy-button bg-amber-700 hover:bg-amber-800"
            >
              {loading ? 'Generating...' : 'Generate Detailed Plots'}
            </button>
          </div>

          <div className="text-sm text-stone-600 text-center">
            <p><strong>Basic Plots:</strong> 3 plot options with brief summaries</p>
            <p><strong>Detailed Plots:</strong> 5 plot options with full story summaries and character integration</p>
          </div>

          {partyCharacters.length === 0 && (
            <p className="text-sm text-stone-600 text-center">
              Create party characters first to generate story plots.
            </p>
          )}
        </div>
      )}

      {/* Character Details Tab */}
      {activeTab === 'characters' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Select Character
            </label>
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="fantasy-input"
            >
              <option value="">Choose a character...</option>
              {partyCharacters.map(character => (
                <option key={character.id} value={character.id}>
                  {character.name} - {character.race} {character.class}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleGenerateCharacterDetails}
            disabled={loading || !selectedCharacter}
            className="fantasy-button w-full"
          >
            {loading ? 'Generating Details...' : 'Generate Character Details'}
          </button>
        </div>
      )}

      {/* NPCs Tab */}
      {activeTab === 'npcs' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              NPC Role
            </label>
            <input
              type="text"
              value={npcRole}
              onChange={(e) => setNpcRole(e.target.value)}
              className="fantasy-input"
              placeholder="e.g., Town Mayor, Mysterious Wizard, Bandit Leader..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Context (Optional)
            </label>
            <textarea
              value={npcContext}
              onChange={(e) => setNpcContext(e.target.value)}
              className="fantasy-input"
              rows="3"
              placeholder="Describe the context, location, or situation..."
            />
          </div>
          
          <button
            onClick={handleGenerateNPC}
            disabled={loading || !npcRole.trim()}
            className="fantasy-button w-full"
          >
            {loading ? 'Generating NPC...' : 'Generate NPC'}
          </button>
        </div>
      )}

      {/* Combat Encounters Tab */}
      {activeTab === 'encounters' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Party Level
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={encounterDetails.partyLevel}
                onChange={(e) => setEncounterDetails(prev => ({ ...prev, partyLevel: parseInt(e.target.value) }))}
                className="fantasy-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Party Size
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={encounterDetails.partySize}
                onChange={(e) => setEncounterDetails(prev => ({ ...prev, partySize: parseInt(e.target.value) }))}
                className="fantasy-input"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Difficulty
              </label>
              <select
                value={encounterDetails.difficulty}
                onChange={(e) => setEncounterDetails(prev => ({ ...prev, difficulty: e.target.value }))}
                className="fantasy-input"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="deadly">Deadly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Theme (Optional)
              </label>
              <input
                type="text"
                value={encounterDetails.theme}
                onChange={(e) => setEncounterDetails(prev => ({ ...prev, theme: e.target.value }))}
                className="fantasy-input"
                placeholder="e.g., Forest ambush, Dungeon crawl..."
              />
            </div>
          </div>
          
          <button
            onClick={handleGenerateEncounter}
            disabled={loading}
            className="fantasy-button w-full"
          >
            {loading ? 'Generating Encounter...' : 'Generate Combat Encounter'}
          </button>
        </div>
      )}

      {/* Generated Content Display */}
      {generatedContent && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-stone-800">Generated Content</h3>
            <button
              onClick={() => setGeneratedContent('')}
              className="text-sm text-stone-600 hover:text-stone-800"
            >
              Clear
            </button>
          </div>
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-stone-800 font-sans text-sm leading-relaxed">
                {generatedContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 