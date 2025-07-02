import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCampaignStory, 
  createCampaignStory, 
  setPlayerReady, 
  addStoryMessage,
  subscribeToCampaignStory,
  getPartyCharacters,
  updateCampaignStory,
  getUserParties,
  getUserProfile,
  getPartyById,
  setCurrentSpeaker,
  setCurrentController,
  createCombatSession,
  subscribeToCombatSession,
  saveStoryState,
  getStoryState,
  updateStoryState,
  getStoryConsistencyData
} from '../firebase/database';
import { db } from '../firebase/config';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { 
  generateHiddenObjectives, 
  checkObjectiveDiscovery, 
  updateObjectiveState, 
  getDiscoveredObjectives,
  areMainObjectivesComplete,
  generateObjectiveHints,
  OBJECTIVE_STATES
} from '../services/objectives';
import { 
  createCampaignMetadata,
  generateCampaignContext,
  updateCampaignProgress,
  checkPhaseTransition,
  generateCampaignSummary,
  saveCampaignSession,
  CAMPAIGN_PHASES
} from '../services/campaign';
import { storyStateService } from '../services/storyState';
import { combatService } from '../services/combat';
import ActionValidationService from '../services/actionValidation';
const actionValidationService = new ActionValidationService();
import DiceRollingService from '../services/diceRolling';
const diceRollingService = new DiceRollingService();

export default function TestCampaignStory() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [user, setUser] = useState(null);
  const [story, setStory] = useState(null);
  const [party, setParty] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [partyMembers, setPartyMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerResponse, setPlayerResponse] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isCombatStarting, setIsCombatStarting] = useState(false);
  const [currentSpeaker, setCurrentSpeakerState] = useState(null);
  const [currentController, setCurrentControllerState] = useState(null);
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [actionValidationResult, setActionValidationResult] = useState(null);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [diceRollResult, setDiceRollResult] = useState(null);
  const [showMultipleAttempts, setShowMultipleAttempts] = useState(false);
  const [multipleAttemptsResult, setMultipleAttemptsResult] = useState(null);
  
  // Objective system state
  const [objectives, setObjectives] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('Investigation');
  const [objectiveHints, setObjectiveHints] = useState([]);
  const [showObjectiveHints, setShowObjectiveHints] = useState(false);
  const [storyState, setStoryState] = useState(null);

  // Test campaign data
  const testCampaignData = {
    title: "Test Campaign - Combat and Action Triggers",
    description: "A test campaign to verify combat detection and action validation triggers work correctly without AI.",
    plot: "The party finds themselves in a mysterious tavern where tensions are high. The bartender seems nervous, and there are suspicious characters lurking in the shadows. The party must investigate the situation and be prepared for potential combat.",
    currentLocation: "The Rusty Tankard Tavern",
    npcs: [
      { name: "Grimtooth", role: "Bartender", disposition: "nervous" },
      { name: "Shadow", role: "Suspicious Patron", disposition: "hostile" },
      { name: "Mara", role: "Innkeeper", disposition: "friendly" }
    ],
    environmentalFeatures: [
      "dim lighting",
      "wooden tables and chairs",
      "bar counter",
      "fireplace",
      "staircase to upstairs rooms"
    ],
    potentialCombatTriggers: [
      "attack the suspicious patron",
      "threaten the bartender",
      "start a bar fight",
      "draw weapons",
      "cast aggressive spells"
    ]
  };

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user && partyId) {
      loadTestStoryAndCharacters();
    }
  }, [user, partyId]);

  // Subscribe to combat sessions to automatically redirect when combat begins
  useEffect(() => {
    if (partyId) {
      try {
        const unsubscribe = subscribeToCombatSession(partyId, (combatSession) => {
          if (combatSession && combatSession.status === 'active') {
            // Check if we're already on the combat page
            if (!currentPath.includes('/combat/')) {
              // Combat has been initiated, redirect all players to combat screen
              navigate(`/combat/${combatSession.id}`);
            }
          }
        });
        return () => unsubscribe();
      } catch (error) {
        console.error('Error subscribing to combat session:', error);
      }
    }
  }, [partyId, navigate, currentPath]);

  // Subscribe to character updates to refresh character list in real-time
  useEffect(() => {
    if (partyId) {
      try {
        const unsubscribe = onSnapshot(
          query(collection(db, 'characters'), where('partyId', '==', partyId)),
          (querySnapshot) => {
            const characters = querySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log('Characters updated in real-time:', characters);
            setPartyCharacters(characters);
          },
          (error) => {
            console.error('Error subscribing to character updates:', error);
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up character subscription:', error);
      }
    }
  }, [partyId]);

  const loadTestStoryAndCharacters = async () => {
    try {
      setLoading(true);
      console.log('Loading test story and characters for partyId:', partyId);
      
      const [characters, partyData] = await Promise.all([
        getPartyCharacters(partyId),
        getPartyById(partyId)
      ]);
      
      console.log('Loaded characters:', characters);
      console.log('Loaded party:', partyData);
      
      setPartyCharacters(characters);
      setParty(partyData);
      
      // Create test story data
      const testStory = {
        id: `test_${partyId}`,
        partyId: partyId,
        title: testCampaignData.title,
        description: testCampaignData.description,
        plot: testCampaignData.plot,
        status: 'ready_up',
        readyPlayers: [],
        currentSpeaker: null,
        currentController: null,
        messages: [
          {
            id: 'test_intro',
            type: 'narrative',
            content: `Welcome to ${testCampaignData.currentLocation}! ${testCampaignData.plot}`,
            timestamp: new Date().toISOString(),
            speaker: 'DM'
          }
        ],
        storyState: storyStateService.initializeStoryState(characters, testCampaignData.plot, partyData),
        objectives: [],
        currentPhase: 'Investigation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setStory(testStory);
      setStoryState(testStory.storyState);
      
      // If no characters exist, try to get party members and their profiles
      if (characters.length === 0 && user) {
        try {
          const userParties = await getUserParties(user.uid);
          const currentParty = userParties.find(party => party.id === partyId);
          if (currentParty) {
            setPartyMembers(currentParty.members || []);
            console.log('Loaded party members:', currentParty.members);
            
            // Fetch profiles for all members
            const profiles = {};
            for (const memberId of currentParty.members) {
              try {
                const profile = await getUserProfile(memberId);
                profiles[memberId] = profile;
              } catch (error) {
                console.error('Error loading profile for member:', memberId, error);
                profiles[memberId] = null;
              }
            }
            setMemberProfiles(profiles);
          }
        } catch (error) {
          console.error('Error loading party members:', error);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading test story and characters:', error);
      setError('Failed to load test story and characters');
      setLoading(false);
    }
  };

  const handleReadyUp = async () => {
    if (!user || !story) return;
    
    try {
      await setPlayerReady(partyId, user.uid);
      setIsReady(true);
    } catch (error) {
      console.error('Error setting player ready:', error);
      setError('Failed to set ready status');
    }
  };

  const handleStartStory = async () => {
    if (!user || !story) return;
    
    try {
      // Update story status to active
      const updatedStory = {
        ...story,
        status: 'active',
        currentSpeaker: user.uid,
        currentController: user.uid,
        updatedAt: new Date().toISOString()
      };
      
      await updateCampaignStory(partyId, updatedStory);
      setStory(updatedStory);
      setCurrentSpeakerState(user.uid);
      setCurrentControllerState(user.uid);
      
      // Add initial story message
      const initialMessage = {
        id: `msg_${Date.now()}`,
        type: 'narrative',
        content: `The party enters ${testCampaignData.currentLocation}. The air is thick with tension. ${testCampaignData.npcs[0].name} the bartender wipes down the counter nervously, while ${testCampaignData.npcs[1].name} lurks in the shadows, watching the party with suspicion.`,
        timestamp: new Date().toISOString(),
        speaker: 'DM'
      };
      
      await addStoryMessage(partyId, initialMessage);
      
    } catch (error) {
      console.error('Error starting test story:', error);
      setError('Failed to start test story');
    }
  };

  const detectCombatOpportunity = (playerResponse, storyState, character) => {
    const response = playerResponse.toLowerCase();
    
    // Check for combat triggers
    const combatTriggers = [
      'attack', 'fight', 'battle', 'combat', 'draw weapon', 'cast fireball',
      'stab', 'slash', 'punch', 'kick', 'throw weapon', 'charge',
      'threaten', 'intimidate', 'challenge', 'duel'
    ];
    
    const hasCombatTrigger = combatTriggers.some(trigger => response.includes(trigger));
    
    // Check for aggressive actions against NPCs
    const npcNames = testCampaignData.npcs.map(npc => npc.name.toLowerCase());
    const targetsNPC = npcNames.some(name => response.includes(name));
    
    // Check for environmental combat triggers
    const environmentalTriggers = [
      'bar fight', 'start a fight', 'cause trouble', 'make a scene'
    ];
    
    const hasEnvironmentalTrigger = environmentalTriggers.some(trigger => response.includes(trigger));
    
    return hasCombatTrigger && (targetsNPC || hasEnvironmentalTrigger);
  };

  const handlePlayerResponse = async (playerResponse) => {
    if (!playerResponse.trim()) return;

    const userCharacter = partyCharacters.find(char => char.userId === user.uid);
    if (!userCharacter) {
      console.error('No user character found');
      return;
    }

    // Add player response to chat
    const newMessage = {
      id: Date.now(),
      sender: userCharacter.name,
      content: playerResponse,
      timestamp: new Date().toISOString(),
      type: 'player'
    };

    setChatHistory(prev => [...prev, newMessage]);

    // Check for combat opportunity
    if (detectCombatOpportunity(playerResponse, storyState, userCharacter)) {
      setIsCombatStarting(true);
      // For now, just show a message that combat would be triggered
      const combatMessage = {
        id: Date.now() + 1,
        sender: 'System',
        content: 'Combat would be triggered here in a real campaign!',
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      setChatHistory(prev => [...prev, combatMessage]);
      setIsCombatStarting(false);
    } else {
      // Process normal story progression
      await processStoryProgression(playerResponse, userCharacter);
    }
  };

  const handleSendResponse = async () => {
    if (!playerResponse.trim() || !user || !story) return;
    
    try {
      const userCharacter = partyCharacters.find(char => char.userId === user.uid);
      if (!userCharacter) {
        setError('You need a character to participate in the story');
        return;
      }

      // Test action validation
      const validationResult = actionValidationService.validatePlayerAction(
        playerResponse, 
        userCharacter, 
        { 
          storyState: storyState,
          currentLocation: testCampaignData.currentLocation,
          npcs: testCampaignData.npcs,
          environmentalFeatures: testCampaignData.environmentalFeatures
        }
      );

      setActionValidationResult(validationResult);
      setShowActionValidation(true);

      // If action is valid, test dice rolling
      if (validationResult.valid && validationResult.diceResult) {
        setDiceRollResult(validationResult.diceResult);
        setShowDiceRoll(true);
      }

      // Add player message to story
      const playerMessage = {
        id: `msg_${Date.now()}`,
        type: 'player',
        content: playerResponse,
        timestamp: new Date().toISOString(),
        speaker: user.uid,
        characterId: userCharacter.id,
        characterName: userCharacter.name
      };

      await addStoryMessage(partyId, playerMessage);

      // Generate DM response based on test data
      const dmResponse = generateTestDMResponse(playerResponse, userCharacter, validationResult);
      
      const dmMessage = {
        id: `msg_${Date.now() + 1}`,
        type: 'narrative',
        content: dmResponse,
        timestamp: new Date().toISOString(),
        speaker: 'DM'
      };

      await addStoryMessage(partyId, dmMessage);

      // Update story state
      const updatedStoryState = storyStateService.updateStoryState(
        storyState, 
        dmResponse, 
        playerResponse, 
        userCharacter.id
      );
      
      setStoryState(updatedStoryState);
      
      // Clear input
      setPlayerResponse('');
      
    } catch (error) {
      console.error('Error sending response:', error);
      setError('Failed to send response');
    }
  };

  const generateTestDMResponse = (playerResponse, character, validationResult) => {
    const response = playerResponse.toLowerCase();
    
    // Check what the player is trying to do
    if (response.includes('search') || response.includes('investigate') || response.includes('look')) {
      return `${character.name} searches the area. The dim lighting makes it difficult to see clearly, but you notice ${testCampaignData.npcs[1].name} watching you more intently now. The bartender ${testCampaignData.npcs[0].name} seems to be trying to avoid eye contact.`;
    }
    
    if (response.includes('talk') || response.includes('speak') || response.includes('ask')) {
      if (response.includes(testCampaignData.npcs[0].name.toLowerCase())) {
        return `${testCampaignData.npcs[0].name} the bartender wipes his hands nervously on his apron. "I... I don't know anything about that," he stammers, glancing toward the shadows where ${testCampaignData.npcs[1].name} lurks.`;
      }
      if (response.includes(testCampaignData.npcs[1].name.toLowerCase())) {
        return `${testCampaignData.npcs[1].name} steps forward from the shadows, hand resting on the hilt of a dagger. "You ask too many questions, stranger. Maybe you should mind your own business."`;
      }
      return `${character.name} attempts to engage in conversation, but the tension in the room is palpable. The other patrons seem to be watching the interaction closely.`;
    }
    
    if (response.includes('move') || response.includes('walk') || response.includes('go')) {
      return `${character.name} moves through the tavern. The wooden floorboards creak underfoot, and you can feel the eyes of the other patrons following your movement.`;
    }
    
    // Default response
    return `${character.name}'s actions draw attention in the tense atmosphere of the tavern. The other patrons watch warily, and you can sense that any misstep could escalate the situation.`;
  };

  const processStoryProgression = async (playerResponse, userCharacter) => {
    // Add player message to story
    const playerMessage = {
      id: `msg_${Date.now()}`,
      type: 'player',
      content: playerResponse,
      timestamp: new Date().toISOString(),
      speaker: user.uid,
      characterId: userCharacter.id,
      characterName: userCharacter.name
    };

    await addStoryMessage(partyId, playerMessage);

    // Generate DM response based on test data
    const dmResponse = generateTestDMResponse(playerResponse, userCharacter, null);
    
    const dmMessage = {
      id: `msg_${Date.now() + 1}`,
      type: 'narrative',
      content: dmResponse,
      timestamp: new Date().toISOString(),
      speaker: 'DM'
    };

    await addStoryMessage(partyId, dmMessage);

    // Update story state
    const updatedStoryState = storyStateService.updateStoryState(
      storyState, 
      dmResponse, 
      playerResponse, 
      userCharacter.id
    );
    
    setStoryState(updatedStoryState);
  };

  const getReadyCount = () => story?.readyPlayers?.length || 0;
  const getTotalPlayers = () => {
    if (partyCharacters.length > 0) {
      return partyCharacters.length;
    }
    return partyMembers.length;
  };

  const getSortedCharacters = () => {
    return partyCharacters.sort((a, b) => {
      // Sort by ready status first
      const aReady = story?.readyPlayers?.includes(a.userId) || false;
      const bReady = story?.readyPlayers?.includes(b.userId) || false;
      if (aReady !== bReady) return bReady ? 1 : -1;
      
      // Then by name
      return a.name.localeCompare(b.name);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading test campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-400">{testCampaignData.title}</h1>
              <p className="text-gray-300">{testCampaignData.currentLocation}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Test Mode</p>
              <p className="text-sm text-gray-400">No AI - Combat & Action Triggers Only</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Story Area */}
          <div className="lg:col-span-2">
            {/* Story Status */}
            {story?.status === 'ready_up' && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Ready Up for Test Campaign</h2>
                <p className="text-gray-300 mb-4">
                  This is a test campaign to verify combat detection and action validation triggers work correctly.
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Ready: {getReadyCount()}/{getTotalPlayers()}
                  </div>
                  {!isReady && (
                    <button
                      onClick={handleReadyUp}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                    >
                      Ready Up
                    </button>
                  )}
                  {isReady && (
                    <span className="text-green-400">✓ Ready</span>
                  )}
                </div>
                
                {getReadyCount() >= getTotalPlayers() && (
                  <button
                    onClick={handleStartStory}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
                  >
                    Start Test Campaign
                  </button>
                )}
              </div>
            )}

            {/* Story Messages */}
            {story?.status === 'active' && (
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Test Campaign Story</h2>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {story.messages?.map((message) => (
                    <div key={message.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-blue-400">
                          {message.speaker === 'DM' ? 'Dungeon Master' : 
                           partyCharacters.find(c => c.userId === message.speaker)?.name || 'Unknown'}
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{message.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player Input */}
            {story?.status === 'active' && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Your Action</h3>
                <div className="space-y-4">
                  <textarea
                    value={playerResponse}
                    onChange={(e) => setPlayerResponse(e.target.value)}
                    placeholder="Describe your action... (e.g., 'I search the tavern', 'I attack the suspicious patron', 'I talk to the bartender')"
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      Current Speaker: {currentSpeaker ? 
                        partyCharacters.find(c => c.userId === currentSpeaker)?.name || 'Unknown' : 'None'}
                    </div>
                    <button
                      onClick={() => handlePlayerResponse(playerResponse)}
                      disabled={!playerResponse.trim() || isCombatStarting}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded"
                    >
                      {isCombatStarting ? 'Starting Combat...' : 'Send Action'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Characters */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Party Characters</h3>
              <div className="space-y-3">
                {getSortedCharacters().map((character) => (
                  <div key={character.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div>
                      <div className="font-medium">{character.name}</div>
                      <div className="text-sm text-gray-400">{character.class}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">HP: {character.hp}/{character.maxHp}</div>
                      <div className="text-sm text-gray-400">AC: {character.ac}</div>
                      {story?.readyPlayers?.includes(character.userId) && (
                        <span className="text-green-400 text-sm">✓ Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Test Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Location:</strong> {testCampaignData.currentLocation}
                </div>
                <div>
                  <strong>NPCs:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    {testCampaignData.npcs.map((npc, index) => (
                      <li key={index}>
                        {npc.name} ({npc.role}) - {npc.disposition}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Combat Triggers:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    {testCampaignData.potentialCombatTriggers.map((trigger, index) => (
                      <li key={index} className="text-gray-400">• {trigger}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Validation Modal */}
      {showActionValidation && actionValidationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Action Validation Result</h3>
            <div className="space-y-3">
              <div>
                <strong>Valid:</strong> {actionValidationResult.valid ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Type:</strong> {actionValidationResult.type}
              </div>
              <div>
                <strong>Response:</strong> {typeof actionValidationResult.response === 'string' 
                  ? actionValidationResult.response 
                  : actionValidationResult.response.story
                }
              </div>
              {actionValidationResult.suggestion && (
                <div>
                  <strong>Suggestion:</strong> {actionValidationResult.suggestion}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowActionValidation(false)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Dice Roll Modal */}
      {showDiceRoll && diceRollResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Dice Roll Result</h3>
            <div className="space-y-3">
              <div>
                <strong>Overall Success:</strong> {diceRollResult.overallSuccess ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Actions:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  {diceRollResult.actions.map((action, index) => (
                    <li key={index}>
                      {action.action}: {action.check.roll} vs DC {action.check.dc} 
                      ({action.check.isSuccess ? 'Success' : 'Failure'})
                    </li>
                  ))}
                </ul>
              </div>
              {diceRollResult.suggestion && (
                <div>
                  <strong>Suggestion:</strong> {diceRollResult.suggestion}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDiceRoll(false)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 