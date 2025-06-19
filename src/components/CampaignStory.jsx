import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCampaignStory, 
  createCampaignStory, 
  setPlayerReady, 
  castVote, 
  addStoryMessage,
  subscribeToCampaignStory,
  getPartyCharacters,
  updateCampaignStory,
  getUserParties
} from '../firebase/database';
import { dungeonMasterService } from '../services/chatgpt';

export default function CampaignStory() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [story, setStory] = useState(null);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [partyMembers, setPartyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerResponse, setPlayerResponse] = useState('');
  const [responseType, setResponseType] = useState('individual');
  const [isReady, setIsReady] = useState(false);

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

  const loadStoryAndCharacters = async () => {
    try {
      setLoading(true);
      console.log('Loading story and characters for partyId:', partyId);
      
      const [storyData, characters] = await Promise.all([
        getCampaignStory(partyId),
        getPartyCharacters(partyId)
      ]);
      
      console.log('Loaded characters:', characters);
      console.log('Loaded story:', storyData);
      
      setPartyCharacters(characters);
      
      // If no characters exist, try to get party members
      if (characters.length === 0 && user) {
        try {
          const userParties = await getUserParties(user.uid);
          const currentParty = userParties.find(party => party.id === partyId);
          if (currentParty) {
            setPartyMembers(currentParty.members || []);
            console.log('Loaded party members:', currentParty.members);
          }
        } catch (error) {
          console.error('Error loading party members:', error);
        }
      }
      
      if (storyData) {
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
        }
      });
      return () => unsubscribe();
    }
  }, [story?.id, user?.uid]);

  const handleReadyUp = async () => {
    if (!user) return;
    try {
      await setPlayerReady(story.id, user.uid);
      setIsReady(true);
    } catch (error) {
      setError('Failed to ready up');
    }
  };

  const handleStartStory = async () => {
    try {
      setLoading(true);
      
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
      
      // Update story status
      await updateCampaignStory(story.id, {
        status: 'voting',
        votingSession: {
          type: 'plot_selection',
          options: ['plot1', 'plot2', 'plot3'],
          votes: {},
          round: 1
        }
      });
      
    } catch (error) {
      setError('Failed to start story generation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (vote) => {
    if (!user) return;
    try {
      await castVote(story.id, user.uid, vote);
    } catch (error) {
      setError('Failed to cast vote');
    }
  };

  // Check voting results and handle ties
  useEffect(() => {
    if (story?.status === 'voting' && story.votingSession) {
      const votes = story.votingSession.votes || {};
      const voteCounts = {};
      
      // Count votes
      Object.values(votes).forEach(vote => {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      });
      
      const totalVotes = Object.keys(votes).length;
      const totalPlayers = partyCharacters.length;
      
      // Check if all players have voted
      if (totalVotes === totalPlayers) {
        const maxVotes = Math.max(...Object.values(voteCounts));
        const winners = Object.keys(voteCounts).filter(vote => voteCounts[vote] === maxVotes);
        
        if (winners.length === 1) {
          // Clear winner - start storytelling
          handleVoteResult(winners[0]);
        } else {
          // Tie - start re-vote
          handleTie(winners);
        }
      }
    }
  }, [story?.votingSession, partyCharacters.length]);

  const handleVoteResult = async (winningPlot) => {
    try {
      // Get the plot details from the story messages
      const plotMessage = story.storyMessages.find(msg => msg.type === 'plot_selection');
      
      // Update story status to storytelling
      await updateCampaignStory(story.id, {
        status: 'storytelling',
        currentPlot: winningPlot,
        votingSession: null
      });
      
      // Add a message indicating the plot was chosen
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: `The party has chosen to pursue this adventure! Let the story begin...`,
        type: 'plot_selected'
      });
      
    } catch (error) {
      setError('Failed to process vote result');
      console.error(error);
    }
  };

  const handleTie = async (tiedPlots) => {
    try {
      // Start a re-vote with only the tied options
      await updateCampaignStory(story.id, {
        votingSession: {
          type: 'plot_selection',
          options: tiedPlots,
          votes: {},
          round: (story.votingSession?.round || 1) + 1,
          isTieBreak: true
        }
      });
      
      // Add a message about the tie
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: `It's a tie! Please vote again between the tied options.`,
        type: 'tie_break'
      });
      
    } catch (error) {
      setError('Failed to handle tie');
      console.error(error);
    }
  };

  const handleSendResponse = async () => {
    if (!playerResponse.trim() || !user) return;
    
    try {
      const userCharacter = partyCharacters.find(char => char.userId === user.uid);
      
      await addStoryMessage(story.id, {
        role: 'user',
        content: playerResponse,
        playerId: user.uid,
        playerName: userCharacter?.name || 'Unknown',
        responseType: responseType
      });
      
      setPlayerResponse('');
      
      // Generate AI response
      const aiResponse = await dungeonMasterService.generateStoryContinuation(
        partyCharacters, 
        story.storyMessages, 
        playerResponse, 
        responseType
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
    if (partyCharacters.length > 0) {
      return partyCharacters.length;
    }
    return partyMembers.length;
  };
  const allPlayersReady = getReadyCount() === getTotalPlayers();

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
                partyMembers.map((memberId, index) => (
                  <div key={memberId} className="fantasy-card bg-amber-50">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-stone-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xs text-stone-600">IMG</span>
                      </div>
                      <h3 className="font-bold text-stone-800">Player {index + 1}</h3>
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
                ))
              )}
            </div>

            <div className="text-center">
              {!isReady ? (
                <button
                  onClick={handleReadyUp}
                  className="fantasy-button"
                >
                  Ready Up
                </button>
              ) : (
                <div className="text-green-600 font-semibold">You are ready!</div>
              )}
              
              {allPlayersReady && (
                <button
                  onClick={handleStartStory}
                  disabled={loading}
                  className="fantasy-button bg-amber-700 hover:bg-amber-800 ml-4"
                >
                  {loading ? 'Generating Story...' : 'Start Story Generation'}
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

            {/* Voting interface */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(story.votingSession?.options || ['plot1', 'plot2', 'plot3']).map((plot, index) => {
                const voteCount = Object.values(story.votingSession?.votes || {}).filter(v => v === plot).length;
                const hasVoted = user && story.votingSession?.votes?.[user.uid] === plot;
                const plotNumber = story.votingSession?.isTieBreak ? plot : `Plot ${index + 1}`;
                
                return (
                  <div key={plot} className="fantasy-card bg-amber-50">
                    <h3 className="font-bold text-stone-800 mb-2">{plotNumber}</h3>
                    <div className="text-sm text-stone-600 mb-3">
                      Votes: {voteCount}/{getTotalPlayers()}
                    </div>
                    <button
                      onClick={() => handleVote(plot)}
                      disabled={hasVoted}
                      className={`fantasy-button w-full ${
                        hasVoted ? 'bg-green-600 cursor-not-allowed' : ''
                      }`}
                    >
                      {hasVoted ? 'Voted ✓' : 'Vote'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Storytelling Phase */}
        {story?.status === 'storytelling' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800">Your Adventure</h2>
            
            {/* Story Messages */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {story.storyMessages.map(message => (
                <div key={message.id} className="mb-4">
                  {message.role === 'assistant' ? (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-800 mb-1">🤖 Dungeon Master</div>
                      <div className="text-blue-900">{message.content}</div>
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="font-semibold text-green-800 mb-1">
                        {message.playerName} ({message.responseType})
                      </div>
                      <div className="text-green-900">{message.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Response Input */}
            <div className="space-y-4">
              <div className="flex space-x-2">
                {['individual', 'team', 'investigate', 'combat', 'social'].map(type => (
                  <button
                    key={type}
                    onClick={() => setResponseType(type)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      responseType === type
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={playerResponse}
                  onChange={(e) => setPlayerResponse(e.target.value)}
                  placeholder="Type your response..."
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 