import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { getCharacterByUserAndParty, getPartyCharacters } from '../firebase/database';
import DungeonMaster from '../components/DungeonMaster';

export default function CampaignManagement() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userCharacter, setUserCharacter] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('story');
  const [story, setStory] = useState({
    title: '',
    description: '',
    chapters: []
  });
  const [map, setMap] = useState({
    image: '/placeholder-map.png',
    description: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      if (partyId) {
        loadPartyData(user.uid, partyId);
      }
    });
    return () => unsubscribe();
  }, [navigate, partyId]);

  const loadPartyData = async (userId, partyId) => {
    try {
      setLoading(true);
      const [character, characters] = await Promise.all([
        getCharacterByUserAndParty(userId, partyId),
        getPartyCharacters(partyId)
      ]);
      setUserCharacter(character);
      setPartyCharacters(characters);
    } catch (error) {
      // Handle error silently or show user-friendly message
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'story', label: 'Story Planning' },
    { id: 'ai-dm', label: '🤖 AI Dungeon Master' },
    { id: 'map', label: 'Campaign Map' },
    { id: 'characters', label: 'Party Characters' },
    { id: 'enemies', label: 'Enemies & NPCs' }
  ];

  const addChapter = () => {
    const newChapter = {
      id: Date.now(),
      title: '',
      description: '',
      objectives: [],
      completed: false
    };
    setStory(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }));
  };

  const updateChapter = (chapterId, field, value) => {
    setStory(prev => ({
      ...prev,
      chapters: prev.chapters.map(chapter =>
        chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
      )
    }));
  };

  const addObjective = (chapterId) => {
    const newObjective = {
      id: Date.now(),
      description: '',
      completed: false
    };
    updateChapter(chapterId, 'objectives', [
      ...story.chapters.find(c => c.id === chapterId).objectives,
      newObjective
    ]);
  };

  if (!user || loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <p className="text-stone-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show character creation if user doesn't have a character
  if (!userCharacter) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <h1 className="fantasy-title text-center">Create Your Character</h1>
          <div className="text-center py-8">
            <p className="text-stone-600 mb-6">
              You need to create a character before you can access the campaign.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => navigate(`/character-creation/${partyId}`)}
                className="fantasy-button text-lg px-8 py-3"
              >
                Create Character
              </button>
              <button
                onClick={() => navigate('/party-management')}
                className="fantasy-button text-lg px-8 py-3 bg-stone-600 hover:bg-stone-700"
              >
                Back to Parties
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Campaign Management</h1>
          <div className="text-sm text-stone-600">
            Playing as: <span className="font-medium">{userCharacter.name}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-stone-100 p-1 rounded-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Story Planning Tab */}
        {activeTab === 'story' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Campaign Title
              </label>
              <input
                type="text"
                value={story.title}
                onChange={(e) => setStory(prev => ({ ...prev, title: e.target.value }))}
                className="fantasy-input"
                placeholder="Enter campaign title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Campaign Description
              </label>
              <textarea
                value={story.description}
                onChange={(e) => setStory(prev => ({ ...prev, description: e.target.value }))}
                className="fantasy-input"
                rows="4"
                placeholder="Describe your campaign's main plot..."
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-stone-800">Chapters</h3>
                <button onClick={addChapter} className="fantasy-button">
                  Add Chapter
                </button>
              </div>

              <div className="space-y-4">
                {story.chapters.map(chapter => (
                  <div key={chapter.id} className="fantasy-card bg-amber-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                        className="fantasy-input"
                        placeholder="Chapter title..."
                      />
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={chapter.completed}
                          onChange={(e) => updateChapter(chapter.id, 'completed', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-stone-700">
                          Completed
                        </label>
                      </div>
                    </div>

                    <textarea
                      value={chapter.description}
                      onChange={(e) => updateChapter(chapter.id, 'description', e.target.value)}
                      className="fantasy-input mb-4"
                      rows="3"
                      placeholder="Chapter description..."
                    />

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-stone-800">Objectives</h4>
                        <button
                          onClick={() => addObjective(chapter.id)}
                          className="fantasy-button text-sm"
                        >
                          Add Objective
                        </button>
                      </div>
                      <div className="space-y-2">
                        {chapter.objectives.map(objective => (
                          <div key={objective.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={objective.completed}
                              onChange={(e) => {
                                const updatedObjectives = chapter.objectives.map(obj =>
                                  obj.id === objective.id ? { ...obj, completed: e.target.checked } : obj
                                );
                                updateChapter(chapter.id, 'objectives', updatedObjectives);
                              }}
                            />
                            <input
                              type="text"
                              value={objective.description}
                              onChange={(e) => {
                                const updatedObjectives = chapter.objectives.map(obj =>
                                  obj.id === objective.id ? { ...obj, description: e.target.value } : obj
                                );
                                updateChapter(chapter.id, 'objectives', updatedObjectives);
                              }}
                              className="fantasy-input flex-1"
                              placeholder="Objective description..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Dungeon Master Tab */}
        {activeTab === 'ai-dm' && (
          <DungeonMaster
            partyCharacters={partyCharacters}
            onStoryGenerated={(content) => {
              // You could save this to your database or use it to populate the story
            }}
            onCharacterDetailsGenerated={(characterId, content) => {
              // You could save this to your database or display it
            }}
          />
        )}

        {/* Campaign Map Tab */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-stone-800 mb-4">Campaign Map</h3>
              <div className="bg-stone-200 rounded-lg p-8 text-center">
                <div className="w-full h-64 bg-stone-300 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-stone-500">Map Placeholder</span>
                </div>
                <button className="fantasy-button">
                  Upload Map Image
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Map Description
              </label>
              <textarea
                value={map.description}
                onChange={(e) => setMap(prev => ({ ...prev, description: e.target.value }))}
                className="fantasy-input"
                rows="4"
                placeholder="Describe the locations and points of interest on your map..."
              />
            </div>
          </div>
        )}

        {/* Party Characters Tab */}
        {activeTab === 'characters' && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">Party Characters</h3>
            {partyCharacters.length === 0 ? (
              <div className="text-center py-8 text-stone-600">
                <p>No characters have been created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partyCharacters.map(character => (
                  <div key={character.id} className="fantasy-card bg-amber-50">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-stone-300 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-stone-600">IMG</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-stone-800">{character.name}</h4>
                        <p className="text-sm text-stone-600">
                          Level {character.level} {character.race} {character.class}
                        </p>
                        <p className="text-sm text-stone-600 mt-1">
                          {character.background} • {character.alignment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Enemies & NPCs Tab */}
        {activeTab === 'enemies' && (
          <div>
            <h3 className="text-xl font-bold text-stone-800 mb-4">Enemies & NPCs</h3>
            <div className="text-center py-8 text-stone-600">
              <p>Enemy and NPC management will be available here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 