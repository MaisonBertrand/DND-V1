import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  createCombatSession
} from '../firebase/database';
import { dungeonMasterService } from '../services/chatgpt';

export default function CampaignStory() {
  const { partyId } = useParams();
  const navigate = useNavigate();
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
  const [isGeneratingPlots, setIsGeneratingPlots] = useState(false);
  const isGeneratingPlotsRef = useRef(false);

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
      loadStoryAndCharacters();
    }
  }, [user, partyId]);

  // Auto-ready up when user has a character but isn't ready
  useEffect(() => {
    if (user && partyCharacters.length > 0 && story) {
      const userCharacter = partyCharacters.find(char => char.userId === user.uid);
      const isUserReady = story.readyPlayers?.includes(user.uid);
      
      // Only auto-ready if user has a character but isn't ready, AND story is in ready_up status
      if (userCharacter && !isUserReady && story.status === 'ready_up') {
        handleReadyUp();
      }
    }
  }, [partyCharacters, story, user]);

  const loadStoryAndCharacters = async () => {
    try {
      setLoading(true);
      console.log('Loading story and characters for partyId:', partyId);
      
      const [storyData, characters, partyData] = await Promise.all([
        getCampaignStory(partyId),
        getPartyCharacters(partyId),
        getPartyById(partyId)
      ]);
      
      console.log('Loaded characters:', characters);
      console.log('Loaded story:', storyData);
      console.log('Loaded party:', partyData);
      
      setPartyCharacters(characters);
      setParty(partyData);
      
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
      
      if (storyData) {
        // Clean up any old voting data to prevent tie messages
        if (storyData.votingSession && storyData.status === 'voting') {
          await updateCampaignStory(storyData.id, {
            votingSession: null
          });
          storyData.votingSession = null;
        }
        
        // Remove any tie-related messages from old voting system
        if (storyData.storyMessages) {
          const filteredMessages = storyData.storyMessages.filter(msg => 
            !msg.content?.includes('tie') && 
            !msg.content?.includes('vote again') &&
            msg.type !== 'tie_break'
          );
          
          if (filteredMessages.length !== storyData.storyMessages.length) {
            await updateCampaignStory(storyData.id, {
              storyMessages: filteredMessages
            });
            storyData.storyMessages = filteredMessages;
          }
        }
        
        setStory(storyData);
        setIsReady(storyData.readyPlayers?.includes(user?.uid) || false);
      } else {
        // Create new story if none exists
        const newStory = await createCampaignStory(partyId);
        setStory(newStory);
      }
    } catch (error) {
      console.error('Error in loadStoryAndCharacters:', error);
      setError('Failed to load campaign story');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (story?.id && user) {
      const unsubscribe = subscribeToCampaignStory(story.id, (updatedStory) => {
        if (updatedStory) {
          setStory(updatedStory);
          setIsReady(updatedStory.readyPlayers?.includes(user.uid) || false);
          
          // If story status changed to voting, stop generating plots
          if (updatedStory.status === 'voting') {
            setIsGeneratingPlots(false);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [story?.id, user?.uid]);

  const handleReadyUp = async () => {
    if (!user) return;
    
    // Check if user has a character in this party
    const userCharacter = partyCharacters.find(char => char.userId === user.uid);
    
    if (!userCharacter) {
      // No character exists, redirect to character creation
      navigate(`/character-creation/${partyId}`);
      return;
    }
    
    // User has a character, proceed with ready up
    try {
      await setPlayerReady(story.id, user.uid);
      setIsReady(true);
    } catch (error) {
      setError('Failed to ready up');
    }
  };

  const handleStartStory = async () => {
    // Prevent duplicate requests
    if (isGeneratingPlotsRef.current || story?.status === 'voting' || story?.status === 'storytelling') {
      console.log('Plot generation already in progress or completed');
      return;
    }
    
    // Check if plots already exist
    const existingPlots = story?.storyMessages?.find(msg => msg.type === 'plot_selection');
    if (existingPlots) {
      console.log('Plots already exist, skipping generation');
      return;
    }
    
    // Additional check to prevent multiple clicks
    if (loading) {
      console.log('Already loading, skipping request');
      return;
    }
    
    try {
      isGeneratingPlotsRef.current = true;
      setIsGeneratingPlots(true);
      setLoading(true);
      
      // Double-check that we're still in ready_up status
      if (story?.status !== 'ready_up') {
        console.log('Story is no longer in ready_up status');
        return;
      }
      
      // Generate character context for AI
      const characterContext = partyCharacters.map(char => 
        `${char.name} - Level ${char.level} ${char.race} ${char.class}. ${char.personality || ''}. ${char.backstory || ''}`
      ).join('\n');
      
      // Generate plot options
      const plotPrompt = `Generate 3 distinct campaign plot options for this party. For each plot, provide a compelling title and a brief summary (2-3 sentences). Format as:

Plot 1: [Title]
[Summary]

Plot 2: [Title]  
[Summary]

Plot 3: [Title]
[Summary]

Party: ${characterContext}`;

      const plotResponse = await dungeonMasterService.generatePlotOptions(partyCharacters);
      
      // Add AI message with plots
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: plotResponse,
        type: 'plot_selection'
      });
      
      // Update story status to voting (DM will select plot)
      await updateCampaignStory(story.id, {
        status: 'voting',
        votingSession: null // Ensure no old voting data
      });
      
    } catch (error) {
      setError('Failed to start story generation');
      console.error(error);
    } finally {
      isGeneratingPlotsRef.current = false;
      setIsGeneratingPlots(false);
      setLoading(false);
    }
  };

  const handlePlotSelection = async (plotNumber) => {
    if (!user || !party) return;
    
    // Only the campaign creator (dmId) can select the plot
    if (party.dmId !== user.uid) {
      setError('Only the campaign creator can select the plot');
      return;
    }
    
    // Check if plot has already been selected
    if (story?.status === 'storytelling') {
      console.log('Plot already selected, story in progress');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the plot details from the story messages
      const plotMessage = story.storyMessages.find(msg => msg.type === 'plot_selection');
      
      // Update story status to storytelling
      await updateCampaignStory(story.id, {
        status: 'storytelling',
        currentPlot: plotNumber,
        votingSession: null
      });
      
      // Add a message indicating the plot was chosen
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: `The Dungeon Master has chosen Plot ${plotNumber}! Let the story begin...`,
        type: 'plot_selected'
      });
      
      // Generate initial story introduction
      const storyIntroduction = await dungeonMasterService.generateStoryIntroduction(
        partyCharacters,
        plotMessage?.content || '',
        plotNumber
      );
      
      // Add the story introduction
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: storyIntroduction,
        type: 'story_introduction'
      });
      
      // Set the DM as the initial controller
      await setCurrentController(story.id, party.dmId);
      
      // Don't automatically set the first speaker - let DM choose
      
    } catch (error) {
      setError('Failed to select plot');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async (responseType = null) => {
    if (!playerResponse.trim() || !story?.currentSpeaker) return;
    
    try {
      await addStoryMessage(story.id, {
        role: 'user',
        content: playerResponse,
        playerId: story.currentSpeaker.userId,
        playerName: story.currentSpeaker.name
      });
      
      setPlayerResponse('');
      // Clear current speaker after sending, but keep control
      await setCurrentSpeaker(story.id, null);
      
      // Add context based on response type for DM controls
      let enhancedPrompt = playerResponse;
      let aiResponseType = 'individual';
      
      if (responseType && party?.dmId === user?.uid) {
        switch (responseType) {
          case 'combat':
            enhancedPrompt = `${playerResponse}\n\n[DM NOTE: This response should naturally lead to or initiate combat. Include enemies, threats, or dangerous situations that require immediate action.]`;
            aiResponseType = 'combat_initiation';
            break;
          case 'climax':
            enhancedPrompt = `${playerResponse}\n\n[DM NOTE: Build dramatic tension and suspense. Create a sense of urgency, danger, or high stakes that raises the emotional intensity.]`;
            aiResponseType = 'tension_building';
            break;
          case 'resolution':
            enhancedPrompt = `${playerResponse}\n\n[DM NOTE: Provide resolution to current conflicts or challenges. Offer closure, rewards, or peaceful outcomes that satisfy the current story arc.]`;
            aiResponseType = 'conflict_resolution';
            break;
          case 'twist':
            enhancedPrompt = `${playerResponse}\n\n[DM NOTE: Introduce an unexpected plot twist or revelation. Add new information, betrayals, hidden motives, or surprising developments that change the story direction.]`;
            aiResponseType = 'plot_twist';
            break;
          default:
            enhancedPrompt = playerResponse;
            aiResponseType = 'individual';
        }
      }
      
      // Generate AI response
      const aiResponse = await dungeonMasterService.generateStoryContinuation(
        partyCharacters, 
        story.storyMessages, 
        enhancedPrompt, 
        aiResponseType
      );
      
      // Check if AI response indicates combat
      const combatKeywords = ['combat', 'battle', 'fight', 'attack', 'enemy', 'enemies', 'monster', 'monsters', 'initiative'];
      const isCombatResponse = combatKeywords.some(keyword => 
        aiResponse.toLowerCase().includes(keyword)
      );
      
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: aiResponse,
        type: isCombatResponse ? 'combat_initiation' : 'story_continuation'
      });
      
      // If combat is initiated, transition to combat screen
      if (isCombatResponse) {
        // Create combat session in database
        const combatData = {
          storyContext: aiResponse,
          partyMembers: partyCharacters.map(char => ({
            id: char.id,
            name: char.name,
            class: char.class,
            level: char.level,
            hp: char.hp || 10 + (char.constitution - 10) * 2,
            maxHp: char.hp || 10 + (char.constitution - 10) * 2,
            ac: char.ac || 10,
            initiative: Math.floor(Math.random() * 20) + 1 + Math.floor((char.dexterity - 10) / 2),
            userId: char.userId
          })),
          enemies: [], // Will be generated in combat screen
          initiative: [] // Will be set when combat starts
        };
        
        await createCombatSession(partyId, combatData);
        
        // Pause the story
        await updateCampaignStory(story.id, {
          status: 'paused',
          currentCombat: {
            initiated: true,
            storyContext: aiResponse,
            timestamp: new Date()
          }
        });
        
        // Navigate to combat screen
        navigate(`/combat/${partyId}`);
      }
      
    } catch (error) {
      setError('Failed to send response');
      console.error(error);
    }
  };

  const getReadyCount = () => story?.readyPlayers?.length || 0;
  const getTotalPlayers = () => {
    // Always use party data if available (most reliable)
    if (party && party.members && Array.isArray(party.members)) {
      return party.members.length;
    }
    // Fallback to character count if no party data
    if (partyCharacters.length > 0) {
      return partyCharacters.length;
    }
    // Fallback to party members if loaded
    if (partyMembers.length > 0) {
      return partyMembers.length;
    }
    // Final fallback
    return 1;
  };
  const allPlayersReady = getReadyCount() === getTotalPlayers();

  // Parse plot names from AI response
  const getPlotNames = () => {
    const plotMessage = story?.storyMessages?.find(msg => msg.type === 'plot_selection');
    if (!plotMessage?.content) return ['Plot 1', 'Plot 2', 'Plot 3'];
    
    const content = plotMessage.content;
    const plotNames = [];
    
    // Extract plot names using regex
    const plotMatches = content.match(/Plot \d+:\s*([^\n]+)/g);
    if (plotMatches) {
      plotMatches.forEach(match => {
        const name = match.replace(/Plot \d+:\s*/, '').trim();
        plotNames.push(name);
      });
    }
    
    // Fallback to generic names if parsing fails
    return plotNames.length === 3 ? plotNames : ['Plot 1', 'Plot 2', 'Plot 3'];
  };

  if (!user) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-stone-600">Loading campaign story...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">Campaign Story</h1>
          <button onClick={() => navigate('/dashboard')} className="fantasy-button bg-stone-600 hover:bg-stone-700">
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Ready Up Phase */}
        {story?.status === 'ready_up' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-stone-800 mb-4">Ready Up</h2>
              <p className="text-stone-600 mb-4">
                All players must ready up before the story begins
              </p>
              {partyCharacters.length === 0 && (
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800">
                    <strong>No characters created yet!</strong> Players should create their characters first. 
                    You can still ready up and start the story, but characters will need to be created before the adventure begins.
                  </p>
                </div>
              )}
              <div className="text-lg font-semibold text-amber-700">
                {getReadyCount()}/{getTotalPlayers()} Players Ready
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partyCharacters.length > 0 ? (
                // Show characters if they exist
                partyCharacters.map(character => (
                  <div key={character.id} className="fantasy-card bg-amber-50">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-stone-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xs text-stone-600">IMG</span>
                      </div>
                      <h3 className="font-bold text-stone-800">{character.name}</h3>
                      <p className="text-sm text-stone-600">
                        Level {character.level} {character.race} {character.class}
                      </p>
                      <div className="mt-2">
                        {story.readyPlayers?.includes(character.userId) ? (
                          <span className="text-green-600 font-semibold">✓ Ready</span>
                        ) : (
                          <span className="text-stone-500">Waiting...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Show party members if no characters exist
                partyMembers.map((memberId, index) => {
                  const profile = memberProfiles[memberId];
                  const displayName = profile?.username || `Player ${index + 1}`;
                  
                  return (
                    <div key={memberId} className="fantasy-card bg-amber-50">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-stone-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-xs text-stone-600">IMG</span>
                        </div>
                        <h3 className="font-bold text-stone-800">{displayName}</h3>
                        <p className="text-sm text-stone-600">
                          No character created yet
                        </p>
                        <div className="mt-2">
                          {story.readyPlayers?.includes(memberId) ? (
                            <span className="text-green-600 font-semibold">✓ Ready</span>
                          ) : (
                            <span className="text-stone-500">Waiting...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-center">
              {!isReady ? (
                <button
                  onClick={handleReadyUp}
                  className="fantasy-button"
                >
                  {partyCharacters.find(char => char.userId === user?.uid) 
                    ? 'Ready Up' 
                    : 'Create Character & Ready Up'
                  }
                </button>
              ) : (
                <div className="text-green-600 font-semibold">You are ready!</div>
              )}
              
              {allPlayersReady && (
                <button
                  onClick={handleStartStory}
                  disabled={loading || isGeneratingPlots || story?.status === 'voting'}
                  className="fantasy-button bg-amber-700 hover:bg-amber-800 ml-4"
                >
                  {loading || isGeneratingPlots ? 'Generating Story...' : 'Start Story Generation'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Voting Phase */}
        {story?.status === 'voting' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800">Choose Your Adventure</h2>
            
            {/* Display plot options */}
            <div className="space-y-4">
              {story.storyMessages
                .filter(msg => msg.type === 'plot_selection')
                .map(msg => (
                  <div key={msg.id} className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-stone-800">{msg.content}</pre>
                  </div>
                ))}
            </div>

            {/* Plot Selection Interface for DM */}
            {party && party.dmId === user?.uid ? (
              <div className="space-y-4">
                <div className="bg-amber-100 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-bold text-amber-800 mb-2">🎲 Dungeon Master's Choice</h3>
                  <p className="text-amber-700">
                    As the campaign creator, you get to choose which plot the party will pursue. 
                    Select one of the three plot options below to begin the adventure.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getPlotNames().map((plotName, index) => (
                    <div key={index} className="fantasy-card bg-amber-50">
                      <h3 className="font-bold text-stone-800 mb-2">{plotName}</h3>
                      <button
                        onClick={() => handlePlotSelection(index + 1)}
                        disabled={loading}
                        className="fantasy-button w-full"
                      >
                        {loading ? 'Selecting...' : 'Choose Plot'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 mb-2">⏳ Waiting for Dungeon Master</h3>
                <p className="text-blue-700">
                  The campaign creator is choosing which plot to pursue. Please wait while they make their decision.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Storytelling Phase */}
        {story?.status === 'storytelling' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800">Your Adventure</h2>
            
            {/* Turn-taking guidance */}
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">🎭 Storytelling Guidelines</h3>
              <p className="text-blue-700 text-sm">
                <strong>Turn-taking:</strong> Respond to the story or let someone else speak. Only one person can respond at a time.
              </p>
            </div>
            
            {/* Story Messages */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {story.storyMessages.map(message => (
                <div key={message.id} className="mb-4">
                  {message.role === 'assistant' ? (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-800 mb-1">Game Master</div>
                      <div className="text-blue-900 whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="font-semibold text-green-800 mb-1">
                        {message.playerName}
                      </div>
                      <div className="text-green-900">{message.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Response Interface */}
            {story?.currentSpeaker ? (
              <div className="space-y-4">
                {/* Current Speaker Response - Only show to the user whose character is selected */}
                {story.currentSpeaker.userId === user?.uid ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-bold text-amber-800 mb-3">How will you respond?</h3>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                        <span className="text-amber-800 font-bold">
                          {story.currentSpeaker.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-amber-800">{story.currentSpeaker.name}</div>
                        <div className="text-sm text-amber-700">
                          {story.currentSpeaker.race} {story.currentSpeaker.class}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        placeholder={`What does ${story.currentSpeaker.name} do?`}
                        className="fantasy-input flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendResponse()}
                      />
                      <button
                        onClick={handleSendResponse}
                        disabled={!playerResponse.trim()}
                        className="fantasy-button"
                      >
                        Send
                      </button>
                    </div>
                    
                    {/* DM-only control options - hidden from other party members */}
                    {party?.dmId === user?.uid && (
                      <div className="mt-4 pt-4 border-t border-amber-300">
                        <h4 className="font-bold text-amber-800 mb-3 text-sm">🎲 DM Controls (Hidden from party)</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSendResponse('combat')}
                            disabled={!playerResponse.trim()}
                            className="fantasy-button bg-red-600 hover:bg-red-700 text-sm py-2"
                          >
                            ⚔️ Advance to Combat
                          </button>
                          <button
                            onClick={() => handleSendResponse('climax')}
                            disabled={!playerResponse.trim()}
                            className="fantasy-button bg-purple-600 hover:bg-purple-700 text-sm py-2"
                          >
                            🌟 Build Tension
                          </button>
                          <button
                            onClick={() => handleSendResponse('resolution')}
                            disabled={!playerResponse.trim()}
                            className="fantasy-button bg-green-600 hover:bg-green-700 text-sm py-2"
                          >
                            ✨ Resolve Conflict
                          </button>
                          <button
                            onClick={() => handleSendResponse('twist')}
                            disabled={!playerResponse.trim()}
                            className="fantasy-button bg-orange-600 hover:bg-orange-700 text-sm py-2"
                          >
                            🔄 Add Plot Twist
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-800 mb-3">Waiting for {story.currentSpeaker.name} to respond</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 font-bold">
                          {story.currentSpeaker.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-blue-800">{story.currentSpeaker.name}</div>
                        <div className="text-sm text-blue-700">
                          {story.currentSpeaker.race} {story.currentSpeaker.class}
                        </div>
                      </div>
                    </div>
                    <p className="text-blue-700 mt-2">
                      {story.currentSpeaker.name} is currently speaking. Please wait for their response.
                    </p>
                  </div>
                )}

                {/* Let someone else speak - Show to current speaker */}
                {story?.currentSpeaker?.userId === user?.uid && (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <h4 className="font-bold text-stone-800 mb-3">Let someone else speak</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {partyCharacters.map(character => (
                        <button
                          key={character.id}
                          onClick={async () => {
                            await setCurrentSpeaker(story.id, character);
                            await setCurrentController(story.id, character.userId);
                          }}
                          disabled={character.id === story?.currentSpeaker?.id}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            character.id === story?.currentSpeaker?.id
                              ? 'border-stone-300 bg-stone-100 text-stone-500 cursor-not-allowed'
                              : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                          }`}
                        >
                          <div className="font-medium">{character.name}</div>
                          <div className="text-sm opacity-75">
                            {character.race} {character.class}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Show character selection when no one is speaking
              party?.dmId === user?.uid ? (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <h3 className="font-bold text-stone-800 mb-3">
                    {story.storyMessages.length > 0 ? 'Choose who speaks next' : 'Choose who speaks first'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {partyCharacters.map(character => (
                      <button
                        key={character.id}
                        onClick={async () => {
                          await setCurrentSpeaker(story.id, character);
                          await setCurrentController(story.id, character.userId);
                        }}
                        className="p-3 rounded-lg border-2 border-stone-200 bg-white hover:border-stone-300 text-stone-700 transition-colors"
                      >
                        <div className="font-medium">{character.name}</div>
                        <div className="text-sm opacity-75">
                          {character.race} {character.class}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-800 mb-3">
                    {story.storyMessages.length > 0 ? 'Waiting for next speaker' : 'Waiting for the story to begin'}
                  </h3>
                  <p className="text-blue-700">
                    {story.storyMessages.length > 0 
                      ? 'The Dungeon Master is choosing who will speak next. Please wait.'
                      : 'The Dungeon Master is choosing who will speak first. Please wait.'
                    }
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
} 