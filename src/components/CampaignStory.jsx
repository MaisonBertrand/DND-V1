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
import { dungeonMasterService } from '../services/chatgpt';
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
import DiceRollingService from '../services/diceRolling';
import ActionValidationDisplay from './ActionValidationDisplay';
import DiceRollDisplay from './DiceRollDisplay';

export default function CampaignStory() {
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
  const [isGeneratingPlots, setIsGeneratingPlots] = useState(false);
  const [isCombatStarting, setIsCombatStarting] = useState(false);
  const isGeneratingPlotsRef = useRef(false);
  const hasStartedStoryRef = useRef(false);
  
  // Objective system state
  const [objectives, setObjectives] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('Investigation');
  const [objectiveHints, setObjectiveHints] = useState([]);
  const [showObjectiveHints, setShowObjectiveHints] = useState(false);
  const [storyState, setStoryState] = useState(null);

  // Enhanced action validation state
  const [showActionValidation, setShowActionValidation] = useState(false);
  const [showDiceRoll, setShowDiceRoll] = useState(false);
  const [currentValidation, setCurrentValidation] = useState(null);
  const [currentDiceResult, setCurrentDiceResult] = useState(null);
  const [actionValidationService] = useState(() => new ActionValidationService());
  const [diceService] = useState(() => new DiceRollingService());

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

  // Subscribe to combat sessions to automatically redirect when combat begins
  useEffect(() => {
    if (partyId) {
      try {
        const unsubscribe = subscribeToCombatSession(partyId, (combatSession) => {
          if (combatSession && combatSession.status === 'active') {
            // Check if we're already on the combat page
            if (!currentPath.includes('/combat/')) {
              // Combat has been initiated, redirect all players to combat screen
              navigate(`/combat/${partyId}`);
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

  // Reset combat starting state when component unmounts
  useEffect(() => {
    return () => {
      setIsCombatStarting(false);
    };
  }, []);

  // Reset story generation ref when story status changes
  useEffect(() => {
    if (story?.status === 'ready_up') {
      hasStartedStoryRef.current = false;
      isGeneratingPlotsRef.current = false;
    }
  }, [story?.status]);

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
        
        // Initialize objectives if story is in storytelling mode
        if (storyData.status === 'storytelling' && partyData) {
          const hiddenObjectives = generateHiddenObjectives(partyData.description || '');
          setObjectives(hiddenObjectives);
          
          // Set initial phase based on story progress
          const messageCount = storyData.storyMessages?.length || 0;
          if (messageCount < 5) {
            setCurrentPhase('Investigation');
          } else if (messageCount < 15) {
            setCurrentPhase('Conflict');
          } else {
            setCurrentPhase('Resolution');
          }
        }
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
            hasStartedStoryRef.current = false;
          }
          
          // Update objectives and phase if story is in storytelling mode
          if (updatedStory.status === 'storytelling' && party) {
            // Initialize objectives if not already set
            if (objectives.length === 0) {
              const hiddenObjectives = generateHiddenObjectives(party.description || '');
              setObjectives(hiddenObjectives);
            }
            
            // Update phase based on story progress
            const messageCount = updatedStory.storyMessages?.length || 0;
            if (messageCount < 5 && currentPhase !== 'Investigation') {
              setCurrentPhase('Investigation');
            } else if (messageCount >= 5 && messageCount < 15 && currentPhase !== 'Conflict') {
              setCurrentPhase('Conflict');
            } else if (messageCount >= 15 && currentPhase !== 'Resolution') {
              setCurrentPhase('Resolution');
            }
            
            // Generate objective hints based on current story context
            const latestMessage = updatedStory.storyMessages?.[updatedStory.storyMessages.length - 1];
            if (latestMessage && latestMessage.role === 'assistant') {
              const hints = generateObjectiveHints(objectives, latestMessage.content);
              setObjectiveHints(hints);
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, [story?.id, user?.uid, party, objectives, currentPhase]);

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
    if (isGeneratingPlotsRef.current || hasStartedStoryRef.current || story?.status === 'voting' || story?.status === 'storytelling') {
      console.log('Plot generation already in progress or completed');
      return;
    }
    
    // Check if plots already exist - check for any plot selection messages
    const existingPlots = story?.storyMessages?.filter(msg => msg.type === 'plot_selection');
    if (existingPlots && existingPlots.length > 0) {
      console.log('Plots already exist, skipping generation');
      // If we're in ready_up but have plots, move to voting
      if (story?.status === 'ready_up') {
        await updateCampaignStory(story.id, {
          status: 'voting',
          votingSession: null
        });
      }
      return;
    }
    
    // Additional check to prevent multiple clicks
    if (loading) {
      console.log('Already loading, skipping request');
      return;
    }
    
    try {
      isGeneratingPlotsRef.current = true;
      hasStartedStoryRef.current = true;
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

      const plotResponse = await dungeonMasterService.generatePlotOptions(partyCharacters, party);
      
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
      
      // Generate campaign goal based on the selected plot
      const campaignGoal = await dungeonMasterService.generateCampaignGoal(
        partyCharacters,
        plotMessage?.content || '',
        party
      );
      
      // Update story status to storytelling with campaign metadata
      await updateCampaignStory(story.id, {
        status: 'storytelling',
        currentPlot: plotNumber,
        votingSession: null,
        campaignMetadata: {
          ...story.campaignMetadata,
          mainGoal: campaignGoal,
          campaignPhase: CAMPAIGN_PHASES.INTRODUCTION,
          plotDetails: plotMessage?.content || ''
        }
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
        plotNumber,
        party
      );
      
      // Add the story introduction
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: storyIntroduction,
        type: 'story_introduction'
      });
      
      // Set the DM as the initial controller
      await setCurrentController(story.id, party.dmId);
      
    } catch (error) {
      setError('Failed to select plot');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!playerResponse.trim() || !user || !story) return;
    
    try {
      setLoading(true);
      
      // Get current story state for consistency
      const currentStoryState = storyState || await getStoryState(story.id);
      
      // Get user character
      const userCharacter = partyCharacters.find(char => char.userId === user.uid);
      if (!userCharacter) {
        setError('You need a character to participate in the story');
        return;
      }

      // Enhanced action validation with atmospheric responses
      const enhancedContext = {
        context: 'campaign_story',
        storyState: currentStoryState,
        customContext: {
          description: currentStoryState?.currentLocation?.description || 'A mysterious location',
          environmentalFeatures: currentStoryState?.currentLocation?.features || [],
          npcs: currentStoryState?.npcs || [],
          circumstances: extractCircumstancesFromStoryState(currentStoryState)
        }
      };

      // Validate action with atmospheric response
      const validationResult = actionValidationService.validatePlayerAction(
        playerResponse,
        userCharacter,
        enhancedContext
      );

      // Show action validation if there are dice results
      if (validationResult.valid && validationResult.diceResult) {
        setCurrentValidation(validationResult);
        setShowActionValidation(true);
        
        if (validationResult.diceResult.actions) {
          setCurrentDiceResult(validationResult.diceResult);
          setShowDiceRoll(true);
        }
        
        // Don't proceed with story until user confirms action
        return;
      }
      
      // If no dice validation needed, proceed with story
      await processStoryResponse(playerResponse, userCharacter, currentStoryState, validationResult);
      
    } catch (error) {
      setError('Failed to send response');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Process story response after action validation
  const processStoryResponse = async (playerResponse, userCharacter, currentStoryState, validationResult) => {
      // Add player message with story state metadata
      const playerMessage = await addStoryMessageWithMetadata(story.id, {
        role: 'user',
        content: playerResponse,
        userId: user.uid,
      characterName: userCharacter.name
      }, currentStoryState);
      
      // Check for objective discovery
      const discoveredObjectives = checkObjectiveDiscovery(playerResponse, objectives);
      if (discoveredObjectives.length > 0) {
        setObjectives(prev => {
          const updated = [...prev];
          discoveredObjectives.forEach(newObj => {
            const index = updated.findIndex(obj => obj.id === newObj.id);
            if (index !== -1) {
              updated[index] = newObj;
            }
          });
          return updated;
        });
      }
      
      // Generate AI response with enhanced context
      let aiResponse;
      if (story.campaignMetadata && story.campaignMetadata.mainGoal) {
        // Use campaign continuation for ongoing campaigns
        aiResponse = await dungeonMasterService.generateCampaignContinuation(
          partyCharacters, 
          story.campaignMetadata,
          story.storyMessages, 
          playerResponse,
          party
        );
      } else {
        // Use enhanced story continuation with story state
        aiResponse = await dungeonMasterService.generateStoryContinuation(
          partyCharacters,
          story.storyMessages,
          playerResponse,
          currentStoryState,
          'individual',
          party
        );
      }
      
    // Extract entities from AI response if validation result has entities
    let extractedEntities = null;
    if (validationResult && validationResult.entities) {
      extractedEntities = validationResult.entities;
    } else {
      // Extract entities from AI response using action validation service
      extractedEntities = actionValidationService.extractEntities(aiResponse, {
        storyState: currentStoryState,
        partyCharacters
      });
    }
    
    // Update story state based on AI response and extracted entities
      const updatedStoryState = storyStateService.updateStoryState(
        currentStoryState,
        aiResponse,
        playerResponse,
      userCharacter.id
    );
    
    // Add extracted entities to story state
    if (extractedEntities) {
      updatedStoryState.extractedEntities = extractedEntities;
      
      // Store entities for future reference
      if (!updatedStoryState.knownEntities) {
        updatedStoryState.knownEntities = {
          enemies: [],
          items: [],
          locations: [],
          statusEffects: [],
          questHooks: [],
          npcs: []
        };
      }
      
      // Merge new entities with known entities
      Object.keys(extractedEntities).forEach(category => {
        if (extractedEntities[category] && extractedEntities[category].length > 0) {
          extractedEntities[category].forEach(newEntity => {
            const existingIndex = updatedStoryState.knownEntities[category].findIndex(
              existing => existing.name.toLowerCase() === newEntity.name.toLowerCase()
            );
            if (existingIndex === -1) {
              updatedStoryState.knownEntities[category].push(newEntity);
            } else {
              // Update existing entity with new information
              updatedStoryState.knownEntities[category][existingIndex] = {
                ...updatedStoryState.knownEntities[category][existingIndex],
                ...newEntity
              };
            }
          });
        }
      });
    }
      
      // Save updated story state
      await updateStoryState(story.id, updatedStoryState);
      setStoryState(updatedStoryState);
      
    // Add AI response with updated story state and entities
      await addStoryMessageWithMetadata(story.id, {
        role: 'assistant',
        content: aiResponse,
      type: 'story_continuation',
      entities: extractedEntities
      }, updatedStoryState);
      
      // Update campaign metadata with new context
      if (story.campaignMetadata) {
        const newContext = generateCampaignContext(story.campaignMetadata, story.storyMessages, partyCharacters);
        const newProgress = updateCampaignProgress(story.campaignMetadata, story.storyMessages, objectives);
        const newPhase = checkPhaseTransition(story.campaignMetadata, story.storyMessages, objectives);
        
        const metadataUpdates = {
          'campaignMetadata.storyContext': {
            ...story.campaignMetadata.storyContext,
            ...newContext
          },
          'campaignMetadata.campaignProgress': newProgress
        };
        
        if (newPhase) {
          metadataUpdates['campaignMetadata.campaignPhase'] = newPhase;
        }
        
        await updateCampaignStory(story.id, metadataUpdates);
      } else {
        console.warn('No campaign metadata found, skipping campaign updates');
      }
      
      setPlayerResponse('');
      
    // Enhanced combat detection with story context and action validation
    const combatDetection = detectCombatOpportunity(aiResponse, updatedStoryState, playerResponse, validationResult);
      
      if (combatDetection.shouldInitiate) {
        setIsCombatStarting(true);
        
        // Create enhanced combat session
        const enhancedCombatData = {
          storyContext: aiResponse,
          partyMembers: partyCharacters,
        enemies: generateEnemiesFromContext(aiResponse, partyCharacters.length, combatDetection.enemyType),
          environmentalFeatures: updatedStoryState.currentLocation?.features || [],
          teamUpOpportunities: combatService.identifyTeamUpOpportunities(partyCharacters),
        narrativeElements: combatService.extractNarrativeElements(aiResponse),
        extractedEntities: extractedEntities // Pass extracted entities to combat
        };
        
        const combatSession = await createEnhancedCombatSession(partyId, enhancedCombatData);
        
        // Pause story for combat
        await updateCampaignStory(story.id, {
          status: 'paused',
          currentCombat: combatSession.id
        });
        
        // Redirect to combat after a short delay
        setTimeout(() => {
          navigate(`/combat/${partyId}`);
        }, 2000);
      }
  };

  // Extract circumstances from story state
  const extractCircumstancesFromStoryState = (storyState) => {
    const circumstances = [];
    
    if (!storyState) return circumstances;
    
    // Add location-based circumstances
    if (storyState.currentLocation) {
      const location = storyState.currentLocation;
      if (location.atmosphere?.includes('dangerous')) circumstances.push('in danger');
      if (location.atmosphere?.includes('hostile')) circumstances.push('in hostile environment');
      if (location.atmosphere?.includes('peaceful')) circumstances.push('in peaceful environment');
      if (location.lighting === 'dark') circumstances.push('in darkness');
      if (location.weather === 'stormy') circumstances.push('in storm');
    }
    
    // Add NPC-based circumstances
    if (storyState.npcs?.length > 0) {
      const hostileNPCs = storyState.npcs.filter(npc => npc.disposition === 'hostile');
      if (hostileNPCs.length > 0) circumstances.push('with hostile NPCs');
    }
    
    return circumstances;
  };

  // Enhanced combat detection with action validation
  const detectCombatOpportunity = (aiResponse, storyState, playerResponse, validationResult) => {
    const combatKeywords = ['combat', 'battle', 'fight', 'attack', 'enemy', 'monster'];
    const tensionKeywords = ['tension', 'threat', 'danger', 'hostile', 'aggressive'];
    
    // Check for explicit combat mentions
    const hasCombatKeywords = combatKeywords.some(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    );
    
    // Check for escalating tension
    const hasTension = tensionKeywords.some(keyword => 
      aiResponse.toLowerCase().includes(keyword)
    );
    
    // Check story context for combat-appropriate situations
    const isCombatAppropriate = storyState?.currentLocation?.atmosphere?.includes('dangerous') || 
                               storyState?.currentLocation?.atmosphere?.includes('hostile') ||
                               storyState?.currentLocation?.atmosphere?.includes('threatening');
    
    // Check if player response indicates combat intent
    const playerWantsCombat = combatKeywords.some(keyword => 
      playerResponse.toLowerCase().includes(keyword)
    );

    // Check if action validation detected combat actions
    const hasCombatActions = validationResult?.diceResult?.actions?.some(action => 
      ['attack', 'spell', 'dodge', 'parry'].includes(action.action)
    );

    // Check for enemies in story context
    const hasEnemies = storyState?.npcs?.some(npc => npc.disposition === 'hostile') ||
                      aiResponse.toLowerCase().includes('enemy') ||
                      aiResponse.toLowerCase().includes('monster') ||
                      aiResponse.toLowerCase().includes('creature');

    // Determine enemy type from context
    let enemyType = 'bandit';
    const contextLower = aiResponse.toLowerCase();
    if (contextLower.includes('goblin')) enemyType = 'goblin';
    else if (contextLower.includes('orc')) enemyType = 'orc';
    else if (contextLower.includes('troll')) enemyType = 'troll';
    else if (contextLower.includes('dragon')) enemyType = 'dragon';
    else if (contextLower.includes('undead') || contextLower.includes('skeleton')) enemyType = 'skeleton';
    else if (contextLower.includes('zombie')) enemyType = 'zombie';
    
    return {
      shouldInitiate: hasCombatKeywords || (hasTension && isCombatAppropriate) || playerWantsCombat || (hasCombatActions && hasEnemies),
      reason: hasCombatKeywords ? 'explicit_combat' : 
              hasTension && isCombatAppropriate ? 'escalating_tension' :
              playerWantsCombat ? 'player_intent' :
              hasCombatActions && hasEnemies ? 'action_triggered_combat' : 'none',
      enemyType: enemyType
    };
  };

  // Action validation handlers
  const handleActionValidationClose = () => {
    setShowActionValidation(false);
    setCurrentValidation(null);
  };

  const handleDiceRollClose = () => {
    setShowDiceRoll(false);
    setCurrentDiceResult(null);
  };

  const handleActionProceed = async () => {
    if (!currentValidation) return;

    const userCharacter = partyCharacters.find(char => char.userId === user.uid);
    if (!userCharacter) return;

    // Process the action with dice rolling
    const diceResult = diceService.validateAction(
      playerResponse,
      userCharacter,
      {
        context: 'campaign_story',
        validation: currentValidation
      }
    );

    setCurrentDiceResult(diceResult);
    setShowDiceRoll(true);
    setShowActionValidation(false);
  };

  const handleActionRevise = () => {
    setShowActionValidation(false);
    setCurrentValidation(null);
  };

  // Enhanced enemy generation with story context
  const generateEnemiesFromContext = (context, partySize, enemyType = 'bandit') => {
    const enemyTypes = {
      'goblin': { name: 'Goblin', hp: 12, ac: 14, level: 1, charisma: 8 },
      'orc': { name: 'Orc', hp: 30, ac: 16, level: 3, charisma: 12 },
      'troll': { name: 'Troll', hp: 84, ac: 15, level: 5, charisma: 7 },
      'dragon': { name: 'Dragon', hp: 200, ac: 19, level: 10, charisma: 19 },
      'bandit': { name: 'Bandit', hp: 16, ac: 12, level: 1, charisma: 10 },
      'skeleton': { name: 'Skeleton', hp: 13, ac: 13, level: 1, charisma: 5 },
      'zombie': { name: 'Zombie', hp: 22, ac: 8, level: 1, charisma: 3 }
    };

    const baseEnemy = enemyTypes[enemyType] || enemyTypes['bandit'];
    const enemyCount = Math.min(partySize + 1, 6); // Balance with party size

    const generatedEnemies = [];
    for (let i = 0; i < enemyCount; i++) {
      generatedEnemies.push({
        id: `enemy_${i}`,
        name: `${baseEnemy.name} ${i + 1}`,
        type: baseEnemy.name,
        hp: baseEnemy.hp + Math.floor(Math.random() * 10),
        maxHp: baseEnemy.hp + Math.floor(Math.random() * 10),
        ac: baseEnemy.ac + Math.floor(Math.random() * 3),
        initiative: Math.floor(Math.random() * 20) + 1,
        charisma: baseEnemy.charisma,
        portrait: '/placeholder-enemy.png'
      });
    }

    return generatedEnemies;
  };

  // Change the local function name to avoid conflict with the imported one
  const handlePhaseTransition = async () => {
    if (!story || !party) return;
    
    const messageCount = story.storyMessages?.length || 0;
    const discoveredObjectives = getDiscoveredObjectives(objectives);
    
    let shouldTransition = false;
    let newPhase = currentPhase;
    
    // Phase transition logic
    if (currentPhase === 'Investigation' && messageCount >= 5 && discoveredObjectives.length >= 1) {
      newPhase = 'Conflict';
      shouldTransition = true;
    } else if (currentPhase === 'Conflict' && messageCount >= 15 && discoveredObjectives.length >= 2) {
      newPhase = 'Resolution';
      shouldTransition = true;
    }
    
    if (shouldTransition && newPhase !== currentPhase) {
      setCurrentPhase(newPhase);
      
      // Generate phase transition message
      const transitionResponse = await dungeonMasterService.generatePhaseTransition(
        partyCharacters,
        currentPhase,
        `Story has progressed through ${messageCount} messages with ${discoveredObjectives.length} objectives discovered`,
        party
      );
      
      await addStoryMessage(story.id, {
        role: 'assistant',
        content: transitionResponse,
        type: 'phase_transition'
      });
    }
  };

  // Highlight keywords in story messages
  const highlightKeywords = (text) => {
    if (!text) return text;
    
    // Enemy keywords to highlight
    const enemyKeywords = [
      'enemy', 'enemies', 'monster', 'monsters', 'bandit', 'bandits', 
      'goblin', 'goblins', 'orc', 'orcs', 'dragon', 'dragons', 
      'troll', 'trolls', 'zombie', 'zombies', 'skeleton', 'skeletons', 
      'assassin', 'assassins', 'guard', 'guards', 'soldier', 'soldiers',
      'thief', 'thieves', 'brigand', 'brigands', 'raider', 'raiders',
      'cultist', 'cultists', 'demon', 'demons', 'devil', 'devils',
      'ghost', 'ghosts', 'specter', 'specters', 'wraith', 'wraiths',
      'hobgoblin', 'hobgoblins', 'bugbear', 'bugbears', 'kobold', 'kobolds',
      'ogre', 'ogres', 'giant', 'giants', 'beholder', 'beholders',
      'lich', 'liches', 'vampire', 'vampires', 'werewolf', 'werewolves',
      'hag', 'hags', 'witch', 'witches', 'necromancer', 'necromancers'
    ];
    
    // Investigation keywords to highlight
    const investigationKeywords = [
      'search', 'investigate', 'examine', 'look around', 'check', 'explore',
      'clue', 'clues', 'evidence', 'footprint', 'footprints', 'track', 'tracks',
      'marking', 'markings', 'sign', 'signs', 'trace', 'traces', 'remains',
      'ruin', 'ruins', 'artifact', 'artifacts', 'scroll', 'scrolls',
      'book', 'books', 'map', 'maps', 'diary', 'journal', 'note', 'notes',
      'door', 'doors', 'passage', 'passages', 'tunnel', 'tunnels',
      'chamber', 'chambers', 'room', 'rooms', 'area', 'areas',
      'mystery', 'mysterious', 'hidden', 'secret', 'secrets', 'concealed',
      'strange', 'unusual', 'curious', 'suspicious', 'odd', 'peculiar',
      'trap', 'traps', 'pressure plate', 'pressure plates', 'lever', 'levers',
      'button', 'buttons', 'switch', 'switches', 'key', 'keys', 'lock', 'locks'
    ];
    
    // Location keywords to highlight
    const locationKeywords = [
      'tavern', 'inn', 'shop', 'market', 'temple', 'castle', 'fortress',
      'tower', 'dungeon', 'cave', 'forest', 'mountain', 'river', 'bridge',
      'gate', 'wall', 'street', 'alley', 'square', 'plaza', 'district',
      'village', 'town', 'city', 'settlement', 'outpost', 'camp',
      'crypt', 'tomb', 'grave', 'cemetery', 'shrine', 'altar',
      'library', 'archive', 'guild', 'hall', 'mansion', 'palace',
      'basement', 'cellar', 'attic', 'rooftop', 'balcony', 'courtyard',
      'garden', 'park', 'field', 'meadow', 'swamp', 'desert', 'island'
    ];
    
    // Action/Combat keywords to highlight
    const actionKeywords = [
      'attack', 'fight', 'battle', 'combat', 'defend', 'strike',
      'sword', 'swords', 'axe', 'axes', 'bow', 'bows', 'arrow', 'arrows',
      'spell', 'spells', 'magic', 'magical', 'cast', 'casting',
      'initiative', 'turn', 'round', 'action', 'movement',
      'charge', 'retreat', 'advance', 'position', 'formation',
      'shield', 'armor', 'helmet', 'dagger', 'daggers', 'mace', 'maces',
      'fireball', 'lightning', 'heal', 'healing', 'cure', 'bless', 'curse'
    ];
    
    let highlightedText = text;
    
    // Combine all keywords and highlight them in bold
    const allKeywords = [...enemyKeywords, ...investigationKeywords, ...locationKeywords, ...actionKeywords];
    
    allKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `<strong>${keyword}</strong>`);
    });
    
    return highlightedText;
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

  // Parse plot names and details from AI response
  const getPlotData = () => {
    const plotMessages = story.storyMessages.filter(msg => msg.type === 'plot_selection');
    if (plotMessages.length > 0) {
      // Use only the most recent plot selection message
      const content = plotMessages[plotMessages.length - 1].content;
      const lines = content.split('\n');
      const plots = [];
      let currentPlot = null;
      const seenTitles = new Set();
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('Plot 1:') || trimmedLine.startsWith('Plot 2:') || trimmedLine.startsWith('Plot 3:')) {
          // Save previous plot if exists
          if (currentPlot && !seenTitles.has(currentPlot.title)) {
            plots.push(currentPlot);
            seenTitles.add(currentPlot.title);
          }
          // Start new plot
          const plotNumber = trimmedLine.match(/Plot (\d+):/)?.[1];
          const title = trimmedLine.replace(/Plot \d+:\s*/, '').trim();
          
          // Only create new plot if we haven't seen this title before
          if (!seenTitles.has(title)) {
            currentPlot = {
              number: parseInt(plotNumber),
              title: title,
              summary: ''
            };
          } else {
            currentPlot = null; // Skip duplicate
          }
        } else if (currentPlot && trimmedLine && !trimmedLine.startsWith('Party:') && !trimmedLine.startsWith('CRITICAL') && !trimmedLine.startsWith('Make each')) {
          // Add to summary
          currentPlot.summary += (currentPlot.summary ? ' ' : '') + trimmedLine;
        }
      });
      
      // Add the last plot if it's not a duplicate
      if (currentPlot && !seenTitles.has(currentPlot.title)) {
        plots.push(currentPlot);
      }
      
      // Ensure we only return the first 3 unique plots
      return plots.slice(0, 3);
    }
    return [
      { number: 1, title: 'Plot 1', summary: 'No plot data available' },
      { number: 2, title: 'Plot 2', summary: 'No plot data available' },
      { number: 3, title: 'Plot 3', summary: 'No plot data available' }
    ];
  };

  const getPlotNames = () => {
    return getPlotData().map(plot => plot.title);
  };

  // Sort characters so current user's character appears first
  const getSortedCharacters = () => {
    if (!partyCharacters.length || !user) return partyCharacters;
    
    return [...partyCharacters].sort((a, b) => {
      // Current user's character goes first
      if (a.userId === user.uid) return -1;
      if (b.userId === user.uid) return 1;
      // Otherwise maintain original order
      return 0;
    });
  };

  // Add campaign summary display
  const renderCampaignSummary = () => {
    if (!story?.campaignMetadata) return null;
    
    const metadata = story.campaignMetadata;
    
    return (
      <div className="bg-purple-100 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-purple-800 mb-2">📖 Campaign Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Session:</span> {metadata.sessionNumber}
          </div>
          <div>
            <span className="font-semibold">Phase:</span> {metadata.campaignPhase.replace('_', ' ')}
          </div>
          <div>
            <span className="font-semibold">Progress:</span> {metadata.campaignProgress}%
          </div>
          <div>
            <span className="font-semibold">Goal:</span> {metadata.mainGoal ? 'Set' : 'Pending'}
          </div>
        </div>
        {metadata.mainGoal && (
          <div className="mt-2 text-purple-700">
            <span className="font-semibold">Main Goal:</span> {metadata.mainGoal}
          </div>
        )}
      </div>
    );
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

        {/* Combat Starting Notification */}
        {isCombatStarting && (
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <span className="font-semibold">⚔️ Combat is being initiated! Redirecting to battle arena...</span>
            </div>
          </div>
        )}

        {/* Story Paused for Combat */}
        {story?.status === 'paused' && story?.currentCombat && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-2">
              <span className="font-semibold">⚔️ Story is paused for combat. Please wait for the battle to conclude.</span>
            </div>
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
              
              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex justify-center items-center space-x-4 mb-2">
                  <div className="text-lg font-semibold text-amber-700">
                    {getReadyCount()}/{getTotalPlayers()} Players Ready
                  </div>
                  <div className="text-sm text-stone-500">
                    ({Math.round((getReadyCount() / getTotalPlayers()) * 100)}%)
                  </div>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 max-w-md mx-auto">
                  <div 
                    className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(getReadyCount() / getTotalPlayers()) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {partyCharacters.length === 0 && (
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800">
                    <strong>No characters created yet!</strong> Players should create their characters first. 
                    You can still ready up and start the story, but characters will need to be created before the adventure begins.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partyCharacters.length > 0 ? (
                // Show characters if they exist
                getSortedCharacters().map(character => {
                  const isReady = story.readyPlayers?.includes(character.userId);
                  const isCurrentUser = character.userId === user?.uid;
                  
                  return (
                    <div key={character.id} className={`fantasy-card transition-all duration-200 ${
                      isReady ? 'bg-green-50 border-green-200' : 'bg-amber-50'
                    }`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-stone-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xs text-stone-600">IMG</span>
                      </div>
                      <h3 className="font-bold text-stone-800">{character.name}</h3>
                      <p className="text-sm text-stone-600">
                        Level {character.level} {character.race} {character.class}
                      </p>
                        {isCurrentUser && (
                          <>
                            <span className="text-blue-600 text-xs font-medium">(You)</span>
                      <div className="mt-2">
                              <button
                                className="fantasy-button bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1 mt-2"
                                onClick={() => navigate(`/character-creation/${partyId}`)}
                              >
                                Edit Character
                              </button>
                            </div>
                          </>
                        )}
                        <div className="mt-2">
                          {isReady ? (
                            <div className="flex items-center justify-center space-x-1 text-green-600 font-semibold">
                              <span>✓</span>
                              <span>Ready</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1 text-stone-500">
                              <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin"></div>
                              <span>Waiting...</span>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                // Show party members if no characters exist
                partyMembers.map((memberId, index) => {
                  const profile = memberProfiles[memberId];
                  const displayName = profile?.username || `Player ${index + 1}`;
                  const isReady = story.readyPlayers?.includes(memberId);
                  const isCurrentUser = memberId === user?.uid;
                  
                  return (
                    <div key={memberId} className={`fantasy-card transition-all duration-200 ${
                      isReady ? 'bg-green-50 border-green-200' : 'bg-amber-50'
                    }`}>
                      <div className="text-center">
                        <div className="w-16 h-16 bg-stone-300 rounded-full mx-auto mb-2 flex items-center justify-center">
                          <span className="text-xs text-stone-600">IMG</span>
                        </div>
                        <h3 className="font-bold text-stone-800">{displayName}</h3>
                        <p className="text-sm text-stone-600">
                          No character created yet
                        </p>
                        {isCurrentUser && (
                          <span className="text-blue-600 text-xs font-medium">(You)</span>
                        )}
                        <div className="mt-2">
                          {isReady ? (
                            <div className="flex items-center justify-center space-x-1 text-green-600 font-semibold">
                              <span>✓</span>
                              <span>Ready</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1 text-stone-500">
                              <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin"></div>
                              <span>Waiting...</span>
                            </div>
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

            {/* Plot Selection Interface for DM */}
            {party && party.dmId === user?.uid ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getPlotData().map((plot) => (
                    <div key={plot.number} className="fantasy-card bg-amber-50">
                      <h3 className="font-bold text-stone-800 mb-2 text-lg">{plot.title}</h3>
                      <p className="text-stone-600 text-sm mb-4">
                        {plot.summary}
                      </p>
                      <button
                        onClick={() => handlePlotSelection(plot.number)}
                        disabled={loading}
                        className="fantasy-button w-full bg-amber-600 hover:bg-amber-700"
                      >
                        {loading ? 'Selecting...' : `Choose Plot ${plot.number}`}
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
                
                {/* Show plot options to non-DM players */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {getPlotData().map((plot) => (
                    <div key={plot.number} className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <h4 className="font-bold text-stone-800 mb-2">{plot.title}</h4>
                      <p className="text-stone-600 text-sm">
                        {plot.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Storytelling Phase */}
        {(story?.status === 'storytelling' || story?.status === 'paused') && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-stone-800">Your Adventure</h2>
            
            {/* Story Phase Indicator - Only show to DM */}
            {party?.dmId === user?.uid && (
              <div className="bg-purple-100 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-800 mb-2">📖 Story Phase: {currentPhase}</h3>
                <p className="text-purple-700 text-sm">
                  {currentPhase === 'Investigation' && 'Explore, discover clues, and gather information about the situation.'}
                  {currentPhase === 'Conflict' && 'Face challenges, threats, and make difficult choices.'}
                  {currentPhase === 'Resolution' && 'Conclude the story arc and see the consequences of your actions.'}
                </p>
              </div>
            )}
            
            {/* Discovered Objectives - Only show to DM */}
            {party?.dmId === user?.uid && objectives.length > 0 && (
              <div className="bg-emerald-100 border border-emerald-200 rounded-lg p-4">
                <h3 className="font-bold text-emerald-800 mb-3">🎯 Discovered Objectives</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getDiscoveredObjectives(objectives).map((objective) => (
                    <div key={objective.id} className="bg-white border border-emerald-300 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-emerald-800 text-sm">{objective.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          objective.state === OBJECTIVE_STATES.COMPLETED 
                            ? 'bg-green-100 text-green-800' 
                            : objective.state === OBJECTIVE_STATES.IN_PROGRESS
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {objective.state === OBJECTIVE_STATES.COMPLETED ? '✓ Complete' :
                           objective.state === OBJECTIVE_STATES.IN_PROGRESS ? '⟳ In Progress' :
                           '🔍 Discovered'}
                        </span>
                      </div>
                      <p className="text-emerald-700 text-xs">{objective.description}</p>
                    </div>
                  ))}
                </div>
                
                {/* Objective Hints */}
                {objectiveHints.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-300">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-emerald-800 text-sm">💡 Subtle Hints</h4>
                      <button
                        onClick={() => setShowObjectiveHints(!showObjectiveHints)}
                        className="text-emerald-600 hover:text-emerald-800 text-xs"
                      >
                        {showObjectiveHints ? 'Hide' : 'Show'} Hints
                      </button>
                    </div>
                    {showObjectiveHints && (
                      <div className="space-y-2">
                        {objectiveHints.map((hint, index) => (
                          <div key={index} className="text-emerald-700 text-xs italic">
                            {hint}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Turn-taking guidance */}
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-800 mb-2">🎭 Storytelling Guidelines</h3>
              <p className="text-blue-700 text-sm">
                <strong>Turn-taking:</strong> Respond to the story or let someone else speak. Only one person can respond at a time.
              </p>
            </div>
            
            {/* Story Messages */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {story.storyMessages
                .filter(message => message.type !== 'plot_selection') // Filter out plot selection messages
                .map(message => (
                <div key={message.id} className="mb-4">
                  {message.role === 'assistant' ? (
                    <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-800 mb-1">Game Master</div>
                      <div 
                        className="text-blue-900 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: highlightKeywords(message.content) }}
                      />
                    </div>
                  ) : (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="font-semibold text-green-800 mb-1">
                        {message.playerName}
                      </div>
                      <div 
                        className="text-green-900"
                        dangerouslySetInnerHTML={{ __html: highlightKeywords(message.content) }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Response Interface - Only show when story is active, not paused */}
            {story?.status === 'storytelling' && story?.currentSpeaker ? (
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

                {/* Let someone else speak - Show to current speaker and controller */}
                {(story?.currentSpeaker?.userId === user?.uid || story?.currentController === user?.uid) && (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                    <h4 className="font-bold text-stone-800 mb-3 text-center">Let someone else speak</h4>
                    <div className="flex justify-center">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
                        {getSortedCharacters().map(character => {
                          const isCurrentUser = character.userId === user?.uid;
                          
                          return (
                        <button
                          key={character.id}
                          onClick={async () => {
                            await setCurrentSpeaker(story.id, character);
                            await setCurrentController(story.id, character.userId);
                          }}
                          disabled={character.id === story?.currentSpeaker?.id}
                              className={`p-4 rounded-lg border-2 transition-colors text-center ${
                            character.id === story?.currentSpeaker?.id
                              ? 'border-stone-300 bg-stone-100 text-stone-500 cursor-not-allowed'
                              : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                          }`}
                        >
                              <div className="font-medium mb-1">
                                <span>{character.name}</span>
                                {isCurrentUser && (
                                  <span className="text-blue-600 text-xs font-medium ml-1">(you)</span>
                                )}
                              </div>
                          <div className="text-sm opacity-75">
                            {character.race} {character.class}
                          </div>
                        </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Show character selection when no one is speaking
              (party?.dmId === user?.uid || story?.currentController === user?.uid) ? (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                  <h3 className="font-bold text-stone-800 mb-3 text-center">
                    Choose who speaks
                  </h3>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
                      {getSortedCharacters().map(character => {
                        const isCurrentUser = character.userId === user?.uid;
                        
                        return (
                      <button
                        key={character.id}
                        onClick={async () => {
                          await setCurrentSpeaker(story.id, character);
                          await setCurrentController(story.id, character.userId);
                        }}
                            className="p-4 rounded-lg border-2 border-stone-200 bg-white hover:border-stone-300 text-stone-700 transition-colors text-center"
                          >
                            <div className="font-medium mb-1">
                              <span>{character.name}</span>
                              {isCurrentUser && (
                                <span className="text-blue-600 text-xs font-medium ml-1">(you)</span>
                              )}
                            </div>
                        <div className="text-sm opacity-75">
                          {character.race} {character.class}
                        </div>
                      </button>
                        );
                      })}
                    </div>
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

            {/* Campaign Summary - Only show during storytelling */}
            {story?.status === 'storytelling' && renderCampaignSummary()}
          </div>
        )}
      </div>

      {/* Action Validation Modal */}
      {showActionValidation && currentValidation && (
        <ActionValidationDisplay
          validation={currentValidation}
          onClose={handleActionValidationClose}
          onProceed={handleActionProceed}
          onRevise={handleActionRevise}
          context="campaign"
        />
      )}

      {/* Dice Roll Modal */}
      {showDiceRoll && currentDiceResult && (
        <DiceRollDisplay
          diceResult={currentDiceResult}
          onClose={handleDiceRollClose}
          onProceed={async () => {
            handleDiceRollClose();
            if (currentValidation) {
              const userCharacter = partyCharacters.find(char => char.userId === user.uid);
              if (userCharacter) {
                await processStoryResponse(playerResponse, userCharacter, storyState, currentValidation);
              }
            }
          }}
          context="campaign"
        />
      )}
    </div>
  );
} 