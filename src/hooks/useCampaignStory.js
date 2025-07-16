import { useState, useEffect, useCallback } from 'react';
import { 
  getCampaignStory, 
  updateCampaignStory, 
  addStoryMessage, 
  setPlayerReady, 
  subscribeToCampaignStory,
  setCurrentSpeaker,
  getPartyById,
  getPartyCharacters,
  subscribeToParty,
  createAICampaignStory
} from '../firebase/database';
import { manualCampaignService } from '../services/manualCampaign';
import { 
  generateHiddenObjectives, 
  getDiscoveredObjectives
} from '../services/objectives';
import { dungeonMasterService } from '../services/chatgpt';
import { actionValidationService } from '../services/actionValidation';
import { combatService } from '../services/combat';

export default function useCampaignStory(partyId, user, navigate) {
  // State management
  const [story, setStory] = useState(null);
  const [party, setParty] = useState(null);
  const [partyMembers, setPartyMembers] = useState([]);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playerResponse, setPlayerResponse] = useState('');
  const [currentPhase, setCurrentPhase] = useState('storytelling');
  const [objectives, setObjectives] = useState([]);
  const [inlineValidation, setInlineValidation] = useState(null);
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [actionValidation, setActionValidation] = useState(null);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [allPlayersReady, setAllPlayersReady] = useState(false);
  const [isGeneratingPlots, setIsGeneratingPlots] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [deadPlayers, setDeadPlayers] = useState([]);
  const [showDeathRecap, setShowDeathRecap] = useState(false);
  
  // Combat state - only what's needed for story-to-combat transition
  const [combatLoading, setCombatLoading] = useState(false);
  const [hasNavigatedToCombat, setHasNavigatedToCombat] = useState(false);

  // Helper functions
  const getReadyCount = () => story?.readyPlayers?.length || 0;
  const getTotalPlayers = () => partyMembers.length;
  
  const getSortedCharacters = () => {
    return partyCharacters.sort((a, b) => a.name.localeCompare(b.name));
  };

  const highlightKeywords = (text) => {
    if (!text) return '';
    return text
      // Bold text with yellow color
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-400 font-bold">$1</strong>')
      // Italic text with blue color
      .replace(/\*(.*?)\*/g, '<em class="text-blue-400 italic">$1</em>')
      // Code blocks with dark background
      .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-2 py-1 rounded text-slate-200 font-mono text-sm">$1</code>')
      // Character names in green
      .replace(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):/g, '<span class="text-green-400 font-semibold">$1:</span>')
      // Important words in orange
      .replace(/\b(weapon|sword|shield|armor|magic|spell|dragon|monster|treasure|gold|silver|quest|adventure|hero|villain)\b/gi, '<span class="text-orange-400 font-medium">$1</span>')
      // Location names in purple
      .replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, (match) => {
        // Don't color if it's already colored or if it's a common word
        if (match.includes('<') || ['The', 'A', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For', 'Of', 'With', 'By'].includes(match)) {
          return match;
        }
        return `<span class="text-purple-400 font-medium">${match}</span>`;
      })
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  // Load data when user and partyId are available
  useEffect(() => {
    if (partyId && user) {
      loadStoryAndCharacters();
    }
  }, [partyId, user]);

  // Subscribe to real-time story updates
  useEffect(() => {
    if (story?.id) {
      const unsubscribe = subscribeToCampaignStory(story.id, async (updatedStory) => {
        if (updatedStory) {
          setStory(updatedStory);
          
          // Check for dead players from combat
          if (updatedStory.deadPlayers && updatedStory.deadPlayers.length > 0) {
            setDeadPlayers(updatedStory.deadPlayers);
            setShowDeathRecap(true);
          }
          
          // Robust phase check for conflict
          const storyContent = updatedStory.currentContent || '';
          const storyMetadata = updatedStory.storyMetadata || {};
          
          // Check multiple sources for conflict phase
          const phaseStatus = storyMetadata.phaseStatus || 
                             (storyContent.toLowerCase().includes('phase_status:') ? 
                              storyContent.toLowerCase().split('phase_status:')[1]?.split('\n')[0]?.trim() : null) ||
                             (storyContent.toLowerCase().includes('conflict') ? 'conflict' : null);
          
          // Additional combat detection based on story content keywords
          const combatKeywords = ['attack', 'battle', 'combat', 'fight', 'enemy', 'enemies', 'monster', 'creature', 'ghoul', 'bandit', 'goblin', 'troll'];
          const hasCombatKeywords = combatKeywords.some(keyword => storyContent.toLowerCase().includes(keyword));
          
          if (updatedStory.storyMetadata && String(updatedStory.storyMetadata.phaseStatus).toLowerCase() === 'conflict' && !hasNavigatedToCombat && !combatLoading) {
            // Conflict phase detected, prepare combat session
            setCombatLoading(true);
            
            // Wait for all players to be ready before creating combat session
            const members = party?.members || [];
            
            // For combat, we need to ensure all players are ready
            // Check if all players are ready (either from initial ready-up or combat ready-up)
            const allPlayersReadyForCombat = updatedStory.readyPlayers?.length === members.length && members.length > 0;
            
            if (allPlayersReadyForCombat) {
              // Ensure we have character data for all party members
              const allCharactersLoaded = partyCharacters.length === members.length;
              
              if (!allCharactersLoaded) {
                // Wait for character data to load
                return;
              }

              // Use centralized combat service to create or find existing session
              try {
                // Convert enemy details to combat-ready enemies
                const storyEnemies = convertEnemyDetailsToCombatEnemies(updatedStory.storyMetadata?.enemyDetails || []);
                
                const combatSession = await combatService.createCombatSession(
                  partyId,
                  partyCharacters.length > 0 ? partyCharacters : partyMembers,
                  storyEnemies,
                  updatedStory.currentContent || 'Combat encounter'
                );
                
                setCombatLoading(false);
                setHasNavigatedToCombat(true);
                navigate(`/combat/${combatSession.id}`);
              } catch (error) {
                console.error('❌ Failed to create combat session:', error);
                setCombatLoading(false);
                setHasNavigatedToCombat(false);
              }
              
              // Add a timeout to prevent infinite loading
              setTimeout(() => {
                if (combatLoading) {
                  setCombatLoading(false);
                  setHasNavigatedToCombat(false);
                }
              }, 5000);
            }
          } else if (updatedStory.storyMetadata && String(updatedStory.storyMetadata.phaseStatus).toLowerCase() !== 'conflict') {
            // Reset navigation flag when not in conflict phase
            setHasNavigatedToCombat(false);
            setCombatLoading(false);
          }
          
          // Update ready status
          if (updatedStory.readyPlayers?.includes(user?.uid)) {
            setIsReady(true);
          }
          
          // Check if all players are ready
          const members = party?.members || [];
          if (updatedStory.readyPlayers?.length === members.length && members.length > 0) {
            setAllPlayersReady(true);
          } else {
            setAllPlayersReady(false);
          }
        }
      });
      
      setUnsubscribe(() => unsubscribe);
      return () => unsubscribe();
    }
  }, [story?.id, user?.uid, party?.members, partyCharacters, navigate, hasNavigatedToCombat]);

  // Subscribe to real-time character updates
  useEffect(() => {
    if (partyId) {
      const unsubscribe = subscribeToParty(partyId, async (updatedParty) => {
        if (updatedParty) {
          setParty(updatedParty);
          setPartyMembers(updatedParty.members || []);
          
          // Reload characters when party updates
          try {
            const characters = await getPartyCharacters(partyId);
            setPartyCharacters(characters);
          } catch (error) {
            console.error('❌ Error reloading characters:', error);
          }
        }
      });
      
      return () => unsubscribe();
    }
  }, [partyId]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  const loadStoryAndCharacters = useCallback(async () => {
    if (!partyId) return;
    
    try {
      setLoading(true);
      
      // Load party data first
      const partyData = await getPartyById(partyId);
      setParty(partyData);
      const members = partyData?.members || [];
      setPartyMembers(members);
      
      // Load story data - use appropriate service based on campaign type
      let storyData;
      console.log('useCampaignStory: Loading story data for campaign type:', partyData?.campaignType);
      if (partyData?.campaignType === 'manual') {
        // Use manual campaign service for manual campaigns
        console.log('useCampaignStory: Using manual campaign service');
        storyData = await manualCampaignService.loadCampaignData(partyId);
        console.log('useCampaignStory: Manual campaign story data:', storyData);
      } else {
        // Use regular story loading for AI-assisted campaigns
        console.log('useCampaignStory: Using AI campaign service');
        storyData = await getCampaignStory(partyId);
        
        // Create story if it doesn't exist
        if (!storyData) {
          storyData = await createAICampaignStory(partyId);
        }
        console.log('useCampaignStory: AI campaign story data:', storyData);
      }
      
      setStory(storyData);
      
      // Load characters
      const characters = await getPartyCharacters(partyId);
      setPartyCharacters(characters);
      
      // Generate objectives
      const objectivesData = generateHiddenObjectives(partyData?.description || "adventure");
      setObjectives(objectivesData);
    } catch (error) {
      console.error('❌ Error loading story and characters:', error);
      setError('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  }, [partyId]);

  const handleReadyUp = useCallback(async () => {
    if (!user || !story) return;
    
    try {
      setLoading(true);
      await setPlayerReady(story.id, user.uid);
    } catch (error) {
      console.error('❌ Error readying up:', error);
      setError('Failed to ready up');
    } finally {
      setLoading(false);
    }
  }, [user, story]);

  const handleStartStory = useCallback(async () => {
    if (!user || !story) return;
    
    try {
      setLoading(true);
      setIsGeneratingPlots(true);
      
      // Set status to generating
      await updateCampaignStory(story.id, { status: 'generating' });
      
      try {
        // Generate plots using the dungeon master service
        const plotsResponse = await dungeonMasterService.generateStoryPlots(
          partyCharacters,
          party?.description || 'An epic adventure awaits!',
          objectives
        );
        
        // Parse the plots from the response
        const parsedPlots = parsePlotsFromResponse(plotsResponse);
        
        // Move to voting phase with the generated plots
        await updateCampaignStory(story.id, {
          status: 'voting',
          availablePlots: parsedPlots
        });
      } catch (aiError) {
        console.warn('AI service unavailable, using fallback plots:', aiError);
        
        // Fallback: Use predefined plots
        const fallbackPlots = [
          {
            title: "The Lost Artifact",
            description: "A powerful artifact has been stolen and the party must track it down through dangerous territory.",
            summary: "An ancient artifact of great power has been stolen from the local temple. The party must follow the trail of the thieves through dangerous wilderness and hostile territory.",
            campaignLength: "medium"
          },
          {
            title: "The Dark Forest",
            description: "A mysterious forest has appeared overnight, and strange creatures are emerging from its depths.",
            summary: "A dark forest has mysteriously appeared on the outskirts of town. Strange creatures and magical phenomena are emerging, and the party must investigate the source.",
            campaignLength: "short"
          },
          {
            title: "The Dragon's Lair",
            description: "A dragon has been terrorizing the countryside, and the party must find a way to stop it.",
            summary: "A fearsome dragon has been attacking villages and stealing livestock. The party must find the dragon's lair and either defeat it or negotiate a peaceful solution.",
            campaignLength: "long"
          }
        ];
        
        // Move to voting phase with fallback plots
        await updateCampaignStory(story.id, {
          status: 'voting',
          availablePlots: fallbackPlots
        });
        
        setError('AI service temporarily unavailable. Using predefined plot options.');
      }
    } catch (error) {
      console.error('❌ Error starting story:', error);
      setError('Failed to start story generation');
      // Reset status on error
      await updateCampaignStory(story.id, { status: 'ready_up' });
    } finally {
      setLoading(false);
      setIsGeneratingPlots(false);
    }
  }, [user, story, partyCharacters, party?.description, objectives]);

  const handlePlotSelection = useCallback(async (plotIndex) => {
    try {
      setLoading(true);
      
      // Get the filtered plots (without fallback plots)
      const validPlots = story?.availablePlots?.filter(plot => plot.title && !plot.title.startsWith('Plot ')) || [];
      const selectedPlot = validPlots[plotIndex];
      
      if (!selectedPlot) {
        setError('Selected plot not found');
        return;
      }
      
      // Set status to generating story content
      await updateCampaignStory(story.id, { 
        status: 'generating_story',
        selectedPlot: plotIndex,
        selectedPlotData: selectedPlot,
        currentContent: `Generating story content for: ${selectedPlot.title}...`
      });
      
      try {
        // Generate the actual story content using the dungeon master service
        const storyContent = await dungeonMasterService.generateStoryIntroduction(
          partyCharacters,
          selectedPlot.description,
          selectedPlot.title,
          party
        );
        
        // Move to storytelling phase with the generated content
        await updateCampaignStory(story.id, { 
          status: 'storytelling',
          currentContent: storyContent || `The adventure begins with ${selectedPlot.title}!`,
          currentSpeaker: { userId: party.dmId, name: 'Dungeon Master', id: 'dm', race: 'DM', class: 'Dungeon Master' }
        });
      } catch (aiError) {
        console.warn('AI service unavailable, using fallback story:', aiError);
        
        // Fallback: Use a simple story introduction
        const fallbackContent = `The adventure begins with ${selectedPlot.title}!

${selectedPlot.summary}

The party finds themselves at the beginning of this epic journey. The path ahead is uncertain, but the promise of adventure and glory awaits those brave enough to take the first step.

What would you like to do?`;
        
        // Move to storytelling phase with fallback content
        await updateCampaignStory(story.id, { 
          status: 'storytelling',
          currentContent: fallbackContent,
          currentSpeaker: { userId: party.dmId, name: 'Dungeon Master', id: 'dm', race: 'DM', class: 'Dungeon Master' }
        });
        
        setError('AI service temporarily unavailable. Using simplified story introduction.');
      }
    } catch (error) {
      console.error('❌ Error selecting plot:', error);
      setError('Failed to select plot');
      // Reset status on error
      await updateCampaignStory(story.id, { status: 'voting' });
    } finally {
      setLoading(false);
    }
  }, [story, partyCharacters, party]);

  const handleSendResponse = useCallback(async () => {
    if (!playerResponse.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Validate action
      const userCharacter = partyCharacters.find(char => char.userId === user?.uid);
      if (!userCharacter) {
        setError('You need a character to participate in the story');
        return;
      }

      // Validate the action (optional - can be skipped if AI is unavailable)
      try {
        const validation = await actionValidationService.validateAction(
          playerResponse,
          userCharacter,
          story?.currentContent || '',
          partyCharacters
        );
        
        if (validation.isValid === false) {
          setActionValidation(validation);
          setShowActionValidation(true);
          return;
        }
      } catch (validationError) {
        console.warn('Action validation service unavailable, proceeding without validation:', validationError);
      }

      // Add the message to the story
      await addStoryMessage(story.id, {
        content: playerResponse,
        speaker: userCharacter.name,
        timestamp: new Date(),
        userId: user.uid
      });

      // Generate AI response
      try {
        const aiResponse = await dungeonMasterService.generateStoryResponse(
          partyCharacters,
          story?.currentContent || '',
          playerResponse,
          userCharacter,
          party
        );
        
        // Update story with AI response
        await updateCampaignStory(story.id, {
          currentContent: aiResponse,
          currentSpeaker: { userId: party.dmId, name: 'Dungeon Master', id: 'dm', race: 'DM', class: 'Dungeon Master' }
        });
      } catch (aiError) {
        console.warn('AI service unavailable, using fallback response:', aiError);
        
        // Fallback: Simple acknowledgment
        const fallbackResponse = `The Dungeon Master acknowledges your action: "${playerResponse}"

The story continues as the party moves forward with their adventure.`;
        
        await updateCampaignStory(story.id, {
          currentContent: fallbackResponse,
          currentSpeaker: { userId: party.dmId, name: 'Dungeon Master', id: 'dm', race: 'DM', class: 'Dungeon Master' }
        });
        
        setError('AI service temporarily unavailable. Using simplified response.');
      }

      setPlayerResponse('');
    } catch (error) {
      console.error('❌ Error sending response:', error);
      setError('Failed to send response');
    } finally {
      setLoading(false);
    }
  }, [playerResponse, user, story, partyCharacters, party]);

  const handleSetSpeaker = useCallback(async (character) => {
    if (!story) return;
    
    try {
      await setCurrentSpeaker(story.id, {
        userId: character.userId,
        name: character.name,
        id: character.id,
        race: character.race,
        class: character.class
      });
    } catch (error) {
      console.error('❌ Error setting speaker:', error);
      setError('Failed to set speaker');
    }
  }, [story]);

  const handleActionValidationClose = useCallback(() => {
    setShowActionValidation(false);
    setActionValidation(null);
  }, []);

  const handleActionProceed = useCallback(async () => {
    setShowActionValidation(false);
    setActionValidation(null);
    
    // Proceed with the action despite validation warnings
    await handleSendResponse();
  }, [handleSendResponse]);

  const handleActionRevise = useCallback(() => {
    setShowActionValidation(false);
    setActionValidation(null);
    // User can revise their response in the input field
  }, []);

  const handleManualCombatTrigger = useCallback(async () => {
    setHasNavigatedToCombat(true);
    setCombatLoading(true);
    
    try {
      const combatSession = await combatService.createCombatSession(
        partyId,
        partyCharacters.length > 0 ? partyCharacters : partyMembers,
        [], // No enemies for manual combat
        story?.currentContent || 'Manual combat encounter'
      );
      
      setCombatLoading(false);
      setHasNavigatedToCombat(true);
      navigate(`/combat/${combatSession.id}`);
    } catch (error) {
      console.error('❌ Failed to create manual combat session:', error);
      setCombatLoading(false);
      setHasNavigatedToCombat(false);
    }
  }, [partyId, partyCharacters, partyMembers, story, navigate]);

  const handleResetCombatState = useCallback(() => {
    setHasNavigatedToCombat(false);
    setCombatLoading(false);
  }, []);

  // Helper functions for parsing and conversion
  const parsePlotsFromResponse = (response) => {
    try {
      // Try to parse as JSON first
      if (response.trim().startsWith('{') || response.trim().startsWith('[')) {
        return JSON.parse(response);
      }
      
      // Fallback: Parse from text format
      const plots = [];
      const plotBlocks = response.split(/\d+\.\s+/).filter(block => block.trim());
      
      plotBlocks.forEach(block => {
        const lines = block.trim().split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
          const title = lines[0].trim();
          const description = lines[1].trim();
          
          plots.push({
            title,
            description,
            campaignLength: 'medium' // Default length
          });
        }
      });
      
      return plots.length > 0 ? plots : null;
    } catch (error) {
      console.error('Error parsing plots:', error);
      return null;
    }
  };

  const convertEnemyDetailsToCombatEnemies = (enemyDetails) => {
    if (!Array.isArray(enemyDetails)) return [];
    
    return enemyDetails.map((enemy, index) => {
      const stats = parseEnemyStats(enemy.stats || '', enemy.type || 'Unknown');
      
      return {
        id: `enemy_${index}`,
        name: enemy.name || `${enemy.type || 'Enemy'} ${index + 1}`,
        type: enemy.type || 'Unknown',
        hp: stats.hp || 10,
        maxHp: stats.hp || 10,
        ac: stats.ac || 10,
        attackBonus: stats.attackBonus || 3,
        damage: stats.damage || '1d6',
        description: enemy.description || 'A mysterious enemy'
      };
    });
  };

  const parseEnemyStats = (statsText, enemyType) => {
    const stats = {
      hp: 10,
      ac: 10,
      attackBonus: 3,
      damage: '1d6'
    };
    
    // Basic parsing of common stat formats
    const hpMatch = statsText.match(/HP[:\s]*(\d+)/i);
    if (hpMatch) stats.hp = parseInt(hpMatch[1]);
    
    const acMatch = statsText.match(/AC[:\s]*(\d+)/i);
    if (acMatch) stats.ac = parseInt(acMatch[1]);
    
    const attackMatch = statsText.match(/Attack[:\s]*\+?(\d+)/i);
    if (attackMatch) stats.attackBonus = parseInt(attackMatch[1]);
    
    const damageMatch = statsText.match(/Damage[:\s]*(\d+d\d+)/i);
    if (damageMatch) stats.damage = damageMatch[1];
    
    return stats;
  };

  return {
    // State
    story,
    party,
    partyMembers,
    partyCharacters,
    loading,
    error,
    playerResponse,
    currentPhase,
    objectives,
    inlineValidation,
    showActionValidation,
    actionValidation,
    showDiceRoll,
    diceResult,
    isReady,
    allPlayersReady,
    isGeneratingPlots,
    showDebug,
    deadPlayers,
    showDeathRecap,
    combatLoading,
    hasNavigatedToCombat,
    
    // Setters
    setStory,
    setParty,
    setPartyMembers,
    setPartyCharacters,
    setLoading,
    setError,
    setPlayerResponse,
    setCurrentPhase,
    setObjectives,
    setInlineValidation,
    setShowActionValidation,
    setActionValidation,
    setShowDiceRoll,
    setDiceResult,
    setIsReady,
    setAllPlayersReady,
    setIsGeneratingPlots,
    setShowDebug,
    setDeadPlayers,
    setShowDeathRecap,
    setCombatLoading,
    setHasNavigatedToCombat,
    
    // Functions
    getReadyCount,
    getTotalPlayers,
    getSortedCharacters,
    highlightKeywords,
    loadStoryAndCharacters,
    handleReadyUp,
    handleStartStory,
    handlePlotSelection,
    handleSendResponse,
    handleSetSpeaker,
    handleActionValidationClose,
    handleActionProceed,
    handleActionRevise,
    handleManualCombatTrigger,
    handleResetCombatState
  };
} 