import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/auth';
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
  createCampaignStory
} from '../firebase/database';
import { 
  generateHiddenObjectives, 
  getDiscoveredObjectives
} from '../services/objectives';
import { dungeonMasterService } from '../services/chatgpt';
import { actionValidationService } from '../services/actionValidation';
import { combatService } from '../services/combat';
import ActionValidationDisplay from './ActionValidationDisplay';
import DiceRollDisplay from './DiceRollDisplay';
import { onSnapshot } from 'firebase/firestore';

export default function CampaignStory() {
  const { user, loading: authLoading } = useAuth();
  const { partyId } = useParams();
  const navigate = useNavigate();
  
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

  // Services are imported as singletons



  // Helper functions - moved to top to avoid hoisting issues
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

  // Check authentication and redirect if needed
  useEffect(() => {
    if (!user && !authLoading) {
        navigate('/login');
      }
  }, [user, authLoading, navigate]);

  // Load data when user and partyId are available
  useEffect(() => {
    if (partyId && user && !authLoading) {
      loadStoryAndCharacters();
    }
  }, [partyId, user, authLoading]);

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
      console.log('👥 Setting up real-time subscription for characters:', partyId);
      const unsubscribe = subscribeToParty(partyId, async (updatedParty) => {
        if (updatedParty) {
          console.log('👥 Party update received:', updatedParty);
          setParty(updatedParty);
          setPartyMembers(updatedParty.members || []);
          
          // Reload characters when party updates
          try {
            const characters = await getPartyCharacters(partyId);
            console.log('🎭 Characters reloaded:', characters);
            console.log('🎭 Character count:', characters.length);
            console.log('🎭 Character details:', characters.map(c => ({ id: c.id, name: c.name, userId: c.userId, partyId: c.partyId })));
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
      
      // Load story data
      let storyData = await getCampaignStory(partyId);
      
      // Create story if it doesn't exist
      if (!storyData) {
        storyData = await createCampaignStory(partyId);
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
        console.log('📖 Generated story content:', storyContent);
        
        // Move to storytelling phase with the generated content
        await updateCampaignStory(story.id, { 
          status: 'storytelling',
          currentContent: storyContent || `The adventure begins with ${selectedPlot.title}!`,
          currentSpeaker: { userId: party.dmId, name: 'Dungeon Master', id: 'dm', race: 'DM', class: 'Dungeon Master' }
        });
        console.log('✅ Plot selected and story generated successfully');
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
        console.log('✅ Plot selected with fallback story content');
        
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
        const validation = await actionValidationService.validatePlayerAction(
          playerResponse,
          userCharacter,
          { 
            storyState: story,
            currentContent: story?.currentContent || '',
            party: party
          }
        );
        setInlineValidation(validation);
        
        // Show validation result but don't block the response
        if (validation.diceResult) {
          setShowActionValidation(true);
          setActionValidation(validation);
        }
      } catch (validationError) {
        console.warn('Action validation unavailable:', validationError);
        // Continue without validation
      }

      try {
        // Try to process story response with AI
        const result = await dungeonMasterService.generateStructuredStoryResponse(
          partyCharacters, 
          story?.storyMessages || [],
          playerResponse,
          currentPhase, 
          getDiscoveredObjectives(objectives), 
          null, 
          party
        );
        
        // Parse the structured response
        const parsedResponse = parseStructuredResponse(result);
        
        // Add the message to story history
        const newMessage = {
          speaker: story?.currentSpeaker?.name || userCharacter.name,
          content: playerResponse,
          timestamp: new Date()
        };
        
        // Update story with parsed content and add message to history
        await updateCampaignStory(story.id, {
          currentContent: parsedResponse.storyContent || `${story?.currentContent || ''}\n\n${userCharacter.name}: "${playerResponse}"`,
          currentSpeaker: null,
          storyMessages: [...(story?.storyMessages || []), newMessage],
          // Store additional structured data for future use
          storyMetadata: {
            currentLocation: parsedResponse.currentLocation,
            activeNPCs: parsedResponse.activeNPCs,
            plotDevelopments: parsedResponse.plotDevelopments,
            characterReactions: parsedResponse.characterReactions,
            nextActions: parsedResponse.nextActions,
            storyTone: parsedResponse.storyTone,
            phaseStatus: parsedResponse.phaseStatus,
            enemyDetails: parsedResponse.enemyDetails || []
          }
        });
      } catch (aiError) {
        console.warn('AI service unavailable, continuing story manually:', aiError);
        
        // Fallback: Continue story manually without AI
        const newMessage = {
          speaker: story?.currentSpeaker?.name || userCharacter.name,
          content: playerResponse,
          timestamp: new Date()
        };
        
        // Update story with just the player's response
        await updateCampaignStory(story.id, {
          currentContent: `${story?.currentContent || ''}\n\n${userCharacter.name}: "${playerResponse}"`,
          currentSpeaker: null,
          storyMessages: [...(story?.storyMessages || []), newMessage]
        });
        
        // Show a warning to the user
        setError('AI service temporarily unavailable. Story continued manually.');
      }
      
      setPlayerResponse('');
      setInlineValidation(null);
      await loadStoryAndCharacters();
      
    } catch (error) {
      console.error('Error sending response:', error);
      setError('Failed to send response');
    } finally {
      setLoading(false);
    }
  }, [playerResponse, partyCharacters, user?.uid, story, party, currentPhase, objectives, loadStoryAndCharacters]);

  const handleActionValidationClose = useCallback(() => {
    setShowActionValidation(false);
    setActionValidation(null);
  }, []);

  const handleDiceRollClose = useCallback(() => {
    setShowDiceRoll(false);
    setDiceResult(null);
  }, []);

  const handleActionProceed = useCallback(async () => {
    // Handle action proceed logic
    setShowActionValidation(false);
  }, []);

  const handleActionRevise = useCallback(() => {
    setShowActionValidation(false);
    setActionValidation(null);
  }, []);

  const handleSetSpeaker = useCallback(async (character) => {
    try {
      setLoading(true);
      
      if (character) {
        await setCurrentSpeaker(story.id, character);
      } else {
        // Clear current speaker
        await updateCampaignStory(story.id, { currentSpeaker: null });
      }
    } catch (error) {
      console.error('❌ Error setting speaker:', error);
      setError('Failed to set speaker');
    } finally {
      setLoading(false);
    }
  }, [story?.id]);

  const handleContinueStory = useCallback(async () => {
    try {
      setLoading(true);
      
      // Generate next story segment using the dungeon master service
      const nextContent = await dungeonMasterService.generateStoryContinuation(
        partyCharacters,
        story?.storyMessages || [],
        "The story continues...",
        currentPhase,
        getDiscoveredObjectives(objectives),
        null,
        party
      );
      
      // Update the story with new content
      await updateCampaignStory(story.id, {
        currentContent: nextContent || "The story continues...",
        currentSpeaker: null
      });
    } catch (error) {
      console.error('❌ Error continuing story:', error);
      setError('Failed to continue story');
    } finally {
      setLoading(false);
    }
  }, [partyCharacters, story, currentPhase, objectives, party]);

  // Helper function to parse the AI response into structured plot objects
  const parsePlotsFromResponse = (response) => {
    try {
      // Split the response by plot sections - this format is now guaranteed
      const plotSections = response.split(/\*\*Plot Option \d+:\*\*/).filter(section => section.trim());
      
      const plots = plotSections.map((section, index) => {
        const lines = section.trim().split('\n').filter(line => line.trim());
        
        let title = `Plot ${index + 1}`;
        let description = '';
        let summary = '';
        let campaignLength = '';
        
        // Parse each line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Extract title
          if (line.startsWith('1. Title:')) {
            const titleMatch = line.match(/1\.\s*Title:\s*"([^"]+)"/);
            if (titleMatch) {
              title = titleMatch[1];
            }
          }
          
          // Extract summary
          if (line.startsWith('2. Summary:')) {
            let summaryText = line.replace('2. Summary:', '').trim();
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('3.')) {
              summaryText += ' ' + lines[j].trim();
              j++;
            }
            summary = summaryText.trim();
            i = j - 1;
          }
          
          // Extract main conflict
          if (line.startsWith('3. Main Conflict:')) {
            let conflictText = line.replace('3. Main Conflict:', '').trim();
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('4.')) {
              conflictText += ' ' + lines[j].trim();
              j++;
            }
            description = conflictText.trim();
            i = j - 1;
          }
          
          // Extract campaign length
          if (line.startsWith('5. Estimated Campaign Length:')) {
            const lengthMatch = line.match(/5\.\s*Estimated Campaign Length:\s*(short|medium|long)/i);
            if (lengthMatch) {
              campaignLength = lengthMatch[1].toLowerCase();
            }
          }
        }
        
        // Use summary as description if no description found
        if (!description && summary) {
          description = summary;
        }
        
        console.log(`📋 Plot ${index + 1} parsed:`, { title, description, summary, campaignLength });
        
        return {
          id: index,
          title: title,
          description: description || summary || `Plot ${index + 1} description`,
          summary: summary,
          campaignLength: campaignLength,
          index: index
        };
      });
      
      console.log('✅ Parsed plots:', plots);
      return plots;
    } catch (error) {
      console.error('❌ Error parsing plots:', error);
      // Return a fallback array if parsing fails
      return [
        { id: 0, title: 'Plot 1', description: 'Adventure awaits!', index: 0 },
        { id: 1, title: 'Plot 2', description: 'Another exciting journey!', index: 1 },
        { id: 2, title: 'Plot 3', description: 'A mysterious quest!', index: 2 }
      ];
    }
  };

  // Helper function to parse structured AI response
  const parseStructuredResponse = (response) => {
    try {
      console.log('🔍 Parsing structured response:', response);
      
      const sections = {
        storyContent: '',
        currentLocation: '',
        activeNPCs: [],
        plotDevelopments: '',
        characterReactions: '',
        nextActions: [],
        storyTone: '',
        phaseStatus: '',
        enemyDetails: []
      };
      
      // Extract STORY_CONTENT
      const storyContentMatch = response.match(/\*\*STORY_CONTENT:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (storyContentMatch) {
        sections.storyContent = storyContentMatch[1].trim();
      }
      
      // Extract CURRENT_LOCATION
      const locationMatch = response.match(/\*\*CURRENT_LOCATION:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (locationMatch) {
        sections.currentLocation = locationMatch[1].trim();
      }
      
      // Extract ACTIVE_NPCS
      const npcsMatch = response.match(/\*\*ACTIVE_NPCS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (npcsMatch) {
        sections.activeNPCs = npcsMatch[1].trim().split(',').map(npc => npc.trim()).filter(npc => npc);
      }
      
      // Extract PLOT_DEVELOPMENTS
      const plotMatch = response.match(/\*\*PLOT_DEVELOPMENTS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (plotMatch) {
        sections.plotDevelopments = plotMatch[1].trim();
      }
      
      // Extract CHARACTER_REACTIONS
      const reactionsMatch = response.match(/\*\*CHARACTER_REACTIONS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (reactionsMatch) {
        sections.characterReactions = reactionsMatch[1].trim();
      }
      
      // Extract NEXT_ACTIONS
      const actionsMatch = response.match(/\*\*NEXT_ACTIONS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (actionsMatch) {
        sections.nextActions = actionsMatch[1].trim().split(',').map(action => action.trim()).filter(action => action);
      }
      
      // Extract STORY_TONE
      const toneMatch = response.match(/\*\*STORY_TONE:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (toneMatch) {
        sections.storyTone = toneMatch[1].trim();
      }
      
      // Extract PHASE_STATUS
      const phaseMatch = response.match(/\*\*PHASE_STATUS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (phaseMatch) {
        sections.phaseStatus = phaseMatch[1].trim();
      }
      
      // Extract ENEMY_DETAILS
      const enemyDetailsMatch = response.match(/\*\*ENEMY_DETAILS:\*\*\s*([\s\S]*?)(?=\*\*|$)/);
      if (enemyDetailsMatch) {
        const enemyDetailsText = enemyDetailsMatch[1].trim();
        
        // Split by "Name:" to get individual enemy blocks
        const enemyBlocks = enemyDetailsText.split(/(?=Name:)/).filter(block => block.trim());
        
        sections.enemyDetails = enemyBlocks.map((block, index) => {
          const enemy = {};
          
          // Extract Name
          const nameMatch = block.match(/Name:\s*([^\n]+)/);
          if (nameMatch) enemy.name = nameMatch[1].trim();
          
          // Extract Type
          const typeMatch = block.match(/Type:\s*([^\n]+)/);
          if (typeMatch) enemy.type = typeMatch[1].trim();
          
          // Extract Level
          const levelMatch = block.match(/Level:\s*([^\n]+)/);
          if (levelMatch) enemy.level = parseInt(levelMatch[1].trim()) || 1;
          
          // Extract HP (handle "12 each" format)
          const hpMatch = block.match(/HP:\s*([^\n]+)/);
          if (hpMatch) {
            const hpText = hpMatch[1].trim();
            const hpNumber = hpText.match(/(\d+)/);
            enemy.hp = hpNumber ? parseInt(hpNumber[1]) : 20;
          }
          
          // Extract AC
          const acMatch = block.match(/AC:\s*([^\n]+)/);
          if (acMatch) enemy.ac = parseInt(acMatch[1].trim()) || 12;
          
          // Extract Basic Attack
          const basicAttackMatch = block.match(/Basic Attack:\s*([^\n]+)/);
          if (basicAttackMatch) enemy.basicAttack = basicAttackMatch[1].trim();
          
          // Extract Special Ability
          const specialAbilityMatch = block.match(/Special Ability:\s*([^\n]+)/);
          if (specialAbilityMatch) enemy.specialAbility = specialAbilityMatch[1].trim();
          
          // Extract Stats
          const statsMatch = block.match(/Stats:\s*([^\n]+)/);
          if (statsMatch) enemy.stats = statsMatch[1].trim();
          
          return enemy;
        });
      }
      
      return sections;
    } catch (error) {
      console.error('❌ Error parsing structured response:', error);
      // Fallback: return the original response as story content
      return {
        storyContent: response,
        currentLocation: '',
        activeNPCs: [],
        plotDevelopments: '',
        characterReactions: '',
        nextActions: [],
        storyTone: '',
        phaseStatus: '',
        enemyDetails: []
      };
    }
  };

  // Helper function to convert enemy details to combat-ready enemies
  const convertEnemyDetailsToCombatEnemies = (enemyDetails) => {
    if (!Array.isArray(enemyDetails) || enemyDetails.length === 0) {
      return [];
    }
    
    return enemyDetails.map((enemy, index) => {
      // Generate a unique ID for the enemy
      const enemyId = `enemy_${index}`;
      
      // Convert the parsed enemy details to combat-ready format
      const combatEnemy = {
        id: enemyId,
        name: enemy.name || `Enemy ${index + 1}`,
        hp: enemy.hp || 20,
        maxHp: enemy.hp || 20, // Use same value for maxHp if not specified
        ac: enemy.ac || 12,
        level: enemy.level || 1,
        class: enemy.type?.toLowerCase() || 'enemy',
        race: enemy.type?.toLowerCase() || 'unknown',
        initiative: Math.floor(Math.random() * 20) + 1,
        // Basic stats with fallbacks
        strength: 12,
        dexterity: 10,
        constitution: 12,
        intelligence: 8,
        wisdom: 8,
        charisma: 6,
        // Combat properties
        statusEffects: [],
        cooldowns: {},
        lastAction: null,
        turnCount: 0,
        // Combat abilities
        basicAttack: enemy.basicAttack || 'Basic attack (1d6 damage)',
        specialAbility: enemy.specialAbility || 'None',
        // Additional properties
        type: enemy.type || 'humanoid',
        stats: enemy.stats || 'Standard enemy stats'
      };
      
      return combatEnemy;
    });
  };





  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => {
                setError('');
                loadStoryAndCharacters();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!story) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300">Story not found</p>
            <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-200 mb-2">{party?.name || 'Campaign Story'}</h1>
              <p className="text-slate-300">{party?.description || 'Adventure awaits!'}</p>
          </div>
            <div className="text-right">
              <div className="text-slate-300 text-sm">Status: <span className="font-semibold text-slate-200">{story?.status || 'unknown'}</span></div>
            </div>
          </div>
            </div>

        {/* Ready Up Phase */}
        {story?.status === 'ready_up' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-200 mb-3">Campaign Lobby</h2>
              <p className="text-slate-300 text-lg">Waiting for all players to ready up</p>
              
              <div className="mt-8 mb-8">
                <div className="flex justify-center items-center space-x-4 mb-4">
                  <div className="text-2xl font-semibold text-slate-300">
                    {getReadyCount()}/{getTotalPlayers()} Players Ready
                  </div>
                  <div className="text-lg text-slate-400">
                    ({Math.round((getReadyCount() / getTotalPlayers()) * 100)}%)
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-4 max-w-lg mx-auto">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${(getReadyCount() / getTotalPlayers()) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

                    <div className="text-center">
              {!isReady ? (
                <div className="space-y-4">
                  {!partyCharacters.find(char => char.userId === user?.uid) ? (
                    <div className="space-y-4">
                      <p className="text-slate-300">You need to create a character first</p>
                              <button
                                onClick={() => navigate(`/character-creation/${partyId}`)}
                        className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                              >
                        Create Character
                              </button>
                            </div>
                  ) : (
                    <button
                      onClick={handleReadyUp}
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      Ready Up
                    </button>
                  )}
                            </div>
                          ) : (
                <div className="text-green-400 font-semibold text-xl bg-green-900/30 px-6 py-3 rounded-xl">You are ready!</div>
              )}
              
              {/* Only show Start Story button to DM when all players are ready */}
              {allPlayersReady && party?.dmId === user?.uid && (
                <div className="mt-6">
                  <button
                    onClick={handleStartStory}
                    disabled={loading || isGeneratingPlots}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || isGeneratingPlots ? 'Generating Story...' : 'Start Story Generation'}
                  </button>
                      </div>
              )}
              
              {/* Show waiting message to non-DM players when all are ready */}
              {allPlayersReady && party?.dmId !== user?.uid && (
                <div className="mt-6">
                  <div className="text-blue-400 font-semibold text-lg bg-blue-900/30 px-6 py-3 rounded-xl">
                    Waiting for Dungeon Master to start the story...
                        </div>
                </div>
              )}
                            </div>
                            </div>
                          )}

        {/* Story Generation Loading */}
        {story?.status === 'generating' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-200 mb-4">Generating Your Adventure</h2>
              <p className="text-slate-300 text-lg mb-8">The Dungeon Master is crafting your story. This may take a moment...</p>
              
              <div className="flex justify-center items-center space-x-4 mb-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400"></div>
                <div className="text-slate-300 font-semibold text-lg">Creating Story Plots...</div>
                        </div>
                      </div>
                    </div>
              )}

        {/* Story Content Generation Loading */}
        {story?.status === 'generating_story' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-200 mb-4">Crafting Your Story</h2>
              <p className="text-slate-300 text-lg mb-8">The Dungeon Master is weaving the tale of your adventure...</p>
              
              <div className="flex justify-center items-center space-x-4 mb-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400"></div>
                <div className="text-slate-300 font-semibold text-lg">Generating Story Content...</div>
              </div>
              
              {story?.selectedPlotData && (
                <div className="bg-slate-900/50 rounded-lg p-4 max-w-2xl mx-auto">
                  <h3 className="text-slate-200 font-semibold mb-2">Selected Plot: {story.selectedPlotData.title}</h3>
                  <p className="text-slate-300 text-sm">{story.selectedPlotData.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voting Phase */}
        {story?.status === 'voting' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 max-w-4xl mx-auto mb-6">
            <h2 className="text-3xl font-bold text-slate-200 mb-6 text-center">Choose Your Adventure</h2>
            
            {/* Debug toggle button */}
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
            
            {/* Debug info */}
            {showDebug && (
              <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300 text-sm">Debug: Available plots count: {story?.availablePlots?.length || 0}</p>
                <p className="text-slate-300 text-sm">Debug: Raw plots: {JSON.stringify(story?.availablePlots?.slice(0, 2))}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.isArray(story?.availablePlots) && story.availablePlots.length > 0 ? (
                story.availablePlots
                  .map((plot, index) => (
                    <div key={index} className="bg-slate-800/70 border-2 border-slate-600 rounded-xl p-6 hover:border-slate-500 transition-all duration-300">
                      <h3 className="font-bold text-slate-200 text-xl mb-3">{plot.title}</h3>
                      <p className="text-slate-300 mb-4">{plot.description || "Adventure description here..."}</p>
                      
                      {/* Campaign Length */}
                      {plot.campaignLength && (
                        <div className="mb-4">
                          <span className="text-slate-400 text-sm">Length: </span>
                          <span className="text-slate-200 font-semibold capitalize">{plot.campaignLength}</span>
                        </div>
                      )}
                      
                      {/* Only show selection button to DM */}
                      {party?.dmId === user?.uid ? (
                      <button
                          onClick={() => handlePlotSelection(index)}
                        disabled={loading}
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {loading ? 'Selecting...' : `Choose This Plot`}
                      </button>
                      ) : (
                        <div className="text-center py-3">
                          <span className="text-slate-400 text-sm">Waiting for DM to choose...</span>
                    </div>
            )}
                </div>
                  ))
              ) : (
                // Fallback if no plots are available
                <div className="col-span-3 text-center">
                  <p className="text-slate-300">No plots available. Please try generating the story again.</p>
            {party?.dmId === user?.uid && (
                      <button
                      onClick={handleStartStory}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                      >
                      Regenerate Plots
                      </button>
                  )}
                    </div>
              )}
                </div>
            
            {/* Show waiting message to non-DM players */}
            {party?.dmId !== user?.uid && (
              <div className="text-center mt-6">
                <p className="text-slate-300 text-lg">Waiting for the Dungeon Master to select a plot...</p>
              </div>
            )}
          </div>
        )}

        {/* Main Story Content */}
        {story?.status === 'storytelling' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar: Party Members, Campaign Progress, Objectives */}
            <div className="lg:col-span-1">
              <div className="flex flex-col gap-y-6 lg:sticky lg:top-6">
                {/* Party Members */}
                <div className="hidden lg:block bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-200">Party Members</h3>
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-slate-200"
                    >
                      {showDebug ? 'Hide Debug' : 'Show Debug'}
                    </button>
                  </div>
                  {showDebug && (
                    <div className="mb-2 p-2 bg-slate-700/50 rounded text-xs">
                      <p className="text-slate-300">Debug: Characters loaded: {partyCharacters.length}</p>
                      <p className="text-slate-300">Debug: Party members: {partyMembers.length}</p>
                      <p className="text-slate-300">Debug: Characters: {JSON.stringify(partyCharacters.map(c => ({ name: c.name, userId: c.userId })))}</p>
                      <p className="text-slate-300">Debug: Current Speaker: {JSON.stringify(story?.currentSpeaker)}</p>
                      <p className="text-slate-300">Debug: User UID: {user?.uid}</p>
                      <p className="text-slate-300">Debug: Party DM ID: {party?.dmId}</p>
                      <p className="text-slate-300">Debug: Is DM speaking: {story?.currentSpeaker?.id === 'dm' ? 'Yes' : 'No'}</p>
                      <p className="text-slate-300">Debug: Is user DM: {user?.uid === party?.dmId ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {getSortedCharacters().map((character) => {
                      const isCurrentSpeaker = story?.currentSpeaker?.userId === character.userId;
                      const isCurrentUser = user?.uid === character.userId;
                      
                      // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
                    const canBeSelected = (
                        (story?.currentSpeaker?.userId === user?.uid) || 
                        (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                        (!story?.currentSpeaker && user?.uid === party?.dmId)
                      );
                      return (
                        <div 
                          key={character.id}
                          className={`p-2 rounded transition-colors ${
                            isCurrentSpeaker
                              ? 'bg-blue-600/30 border border-blue-500' 
                              : canBeSelected
                                ? 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer'
                                : 'bg-slate-700/30 opacity-60 cursor-not-allowed'
                          }`}
                          onClick={canBeSelected ? () => handleSetSpeaker(character) : undefined}
                        >
                          <div className="font-semibold text-slate-200 text-xs">{character.name}</div>
                          <div className="text-slate-400 text-xs">{character.race} {character.class}</div>
                                                  {isCurrentSpeaker && (
                              <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                          )}
                        {!canBeSelected && !isCurrentSpeaker && (
                            <div className="text-slate-500 text-xs mt-1">Waiting for turn...</div>
                          )}
                          {canBeSelected && !isCurrentSpeaker && (
                            <div className="text-green-400 text-xs mt-1">Click to select</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Campaign Progress */}
                {story?.campaignMetadata && (
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <h3 className="font-bold text-slate-200 mb-3">Campaign Progress</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Session:</span>
                        <span className="text-slate-200 font-semibold">{story.campaignMetadata.sessionNumber}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Progress:</span>
                        <span className="text-slate-200 font-semibold">{story.campaignMetadata.campaignProgress}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Objectives */}
                {objectives.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <h3 className="font-bold text-slate-200 mb-3">Objectives</h3>
                      <div className="space-y-2">
                      {objectives.map((objective, index) => (
                        <div key={index} className="text-sm">
                          <div className="text-slate-300">{objective.title}</div>
                          <div className="text-slate-400 text-xs">{objective.description}</div>
                          </div>
                        ))}
                      </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Story Content */}
              {story?.currentContent && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-8 mb-8 shadow-lg">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-100 mb-2 border-b border-slate-600 pb-3">
                      📖 Current Story
                    </h2>
                  </div>
                  <div 
                    className="text-slate-200 leading-8 text-lg max-w-none prose prose-invert prose-lg prose-slate"
                    style={{
                      lineHeight: '1.8',
                      fontSize: '1.125rem',
                      letterSpacing: '0.025em'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: highlightKeywords(story.currentContent)
                    }}
                  />
                  
                  {/* Story Metadata Display */}
                  {story?.storyMetadata && (
                    <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {story.storyMetadata.currentLocation && (
                          <div>
                            <span className="text-blue-400 font-semibold">📍 Location:</span>
                            <span className="text-slate-300 ml-2">{story.storyMetadata.currentLocation}</span>
                          </div>
                        )}
                        {story.storyMetadata.storyTone && (
                          <div>
                            <span className="text-purple-400 font-semibold">🎭 Tone:</span>
                            <span className="text-slate-300 ml-2">{story.storyMetadata.storyTone}</span>
                          </div>
                        )}
                        {story.storyMetadata.activeNPCs && story.storyMetadata.activeNPCs.length > 0 && (
                          <div>
                            <span className="text-green-400 font-semibold">👥 Active NPCs:</span>
                            <span className="text-slate-300 ml-2">{story.storyMetadata.activeNPCs.join(', ')}</span>
                          </div>
                        )}
                        {story.storyMetadata.phaseStatus && (
                          <div>
                            <span className="text-orange-400 font-semibold">📊 Phase:</span>
                            <span className="text-slate-300 ml-2 capitalize">{story.storyMetadata.phaseStatus}</span>
                          </div>
                        )}
                      </div>
                      
                      {story.storyMetadata.nextActions && story.storyMetadata.nextActions.length > 0 && (
                        <div className="mt-4">
                          <span className="text-yellow-400 font-semibold">🎯 Possible Actions:</span>
                          <ul className="mt-2 space-y-1">
                            {story.storyMetadata.nextActions.map((action, index) => (
                              <li key={index} className="text-slate-300 text-sm">• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}



              {/* Current Speaker Response */}
              {story?.currentSpeaker ? (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-slate-200 mb-4">Current Speaker: {story.currentSpeaker.name}</h3>
                  
                  {(story?.currentSpeaker?.userId === user?.uid) || (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ? (
                    <div className="space-y-4">
                      <textarea
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        placeholder={story?.currentSpeaker?.id === 'dm' ? "Continue the story or describe what happens next..." : `What does ${story.currentSpeaker.name} do?`}
                        className="w-full bg-slate-800/50 border border-slate-600 text-slate-100 px-4 py-3 rounded-lg focus:border-slate-500 focus:outline-none transition-colors min-h-[120px] resize-none"
                        rows={4}
                      />
                      <div className="flex space-x-3">
                      <button
                        onClick={handleSendResponse}
                          disabled={!playerResponse.trim() || loading}
                          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {loading ? 'Processing...' : story?.currentSpeaker?.id === 'dm' ? 'Continue Story' : 'Send Response'}
                      </button>
                    </div>
                  </div>
                ) : (
                    <p className="text-slate-300">Waiting for {story.currentSpeaker.name} to respond...</p>
                  )}
                </div>
              ) : (
                /* DM Response Box - Only show when no current speaker AND user is DM */
                user?.uid === party?.dmId && (
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-slate-200 mb-4">Dungeon Master Response</h3>
                    
                    <div className="space-y-4">
                      <textarea
                        value={playerResponse}
                        onChange={(e) => setPlayerResponse(e.target.value)}
                        placeholder="Continue the story or describe what happens next..."
                        className="w-full bg-slate-800/50 border border-slate-600 text-slate-100 px-4 py-3 rounded-lg focus:border-slate-500 focus:outline-none transition-colors min-h-[120px] resize-none"
                        rows={4}
                      />
                      <div className="flex space-x-3">
                          <button
                          onClick={handleSendResponse}
                          disabled={!playerResponse.trim() || loading}
                          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Processing...' : 'Continue Story'}
                          </button>
                        </div>
                      </div>
                    </div>
                )
              )}

              {/* Party Members Selection - Mobile Side by Side */}
              <div className="lg:hidden bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
                <h3 className="font-bold text-slate-200 mb-3">Party Members</h3>
                <div className="grid grid-cols-2 gap-2">
                  {getSortedCharacters().map((character) => {
                    const isCurrentSpeaker = story?.currentSpeaker?.userId === character.userId;
                    const isCurrentUser = user?.uid === character.userId;
                    // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
                    const canBeSelected = (
                      (story?.currentSpeaker?.userId === user?.uid) || 
                      (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                      (!story?.currentSpeaker && user?.uid === party?.dmId)
                    );
                    return (
                      <div 
                        key={character.id}
                        className={`p-2 rounded transition-colors ${
                          isCurrentSpeaker
                            ? 'bg-blue-600/30 border border-blue-500' 
                            : canBeSelected
                              ? 'bg-slate-700/50 hover:bg-slate-600/50 cursor-pointer'
                              : 'bg-slate-700/30 opacity-60 cursor-not-allowed'
                        }`}
                        onClick={canBeSelected ? () => handleSetSpeaker(character) : undefined}
                      >
                        <div className="font-semibold text-slate-200 text-xs">{character.name}</div>
                        <div className="text-slate-400 text-xs">{character.race} {character.class}</div>
                        {isCurrentSpeaker && (
                            <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                        )}
                        {!canBeSelected && !isCurrentSpeaker && (
                          <div className="text-slate-500 text-xs mt-1">Waiting for turn...</div>
                        )}
                        {canBeSelected && !isCurrentSpeaker && (
                          <div className="text-green-400 text-xs mt-1">Click to select</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Story Messages History */}
              {story?.storyMessages && story.storyMessages.length > 0 && (
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-lg p-6 mt-8 shadow-lg">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-100 mb-2 border-b border-slate-600 pb-3">
                      📜 Story History
                    </h3>
                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {story.storyMessages.map((message, index) => (
                      <div key={index} className="border-l-4 border-slate-500 pl-4 py-2 bg-slate-800/30 rounded-r-lg">
                        <div className="text-slate-300 text-sm font-semibold mb-2 flex items-center">
                          <span className="mr-2">👤</span>
                          {message.speaker || 'Narrator'}
                </div>
                        <div 
                          className="text-slate-400 text-sm leading-6 pl-6 border-l border-slate-600"
                          dangerouslySetInnerHTML={{ __html: highlightKeywords(message.content) }}
                        />
                </div>
                    ))}
                  </div>
          </div>
        )}

        {/* Death Recap */}
        {showDeathRecap && deadPlayers.length > 0 && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-600 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-xl">💀</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200 mb-2">Combat Aftermath</h3>
                <p className="text-red-100 text-sm mb-3">
                  The battle has ended. Some heroes have fallen, but the story continues...
                </p>
                <div className="bg-red-800/30 border border-red-600 rounded p-3 mb-3">
                  <h4 className="text-red-200 font-semibold mb-2">Fallen Heroes:</h4>
                  <div className="space-y-2">
                    {deadPlayers.map((player, index) => (
                      <div key={index} className="text-red-200 text-sm">
                        <strong>{player.name}</strong> ({player.class}, Level {player.level}) - {player.deathCause}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-red-100 text-xs">
                  The fallen heroes will need to create new characters to rejoin the adventure.
                </p>
              </div>
              <button
                onClick={() => setShowDeathRecap(false)}
                className="text-red-400 hover:text-red-200 transition-colors"
              >
                ✕
              </button>
                  </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-red-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-200 mb-2">Notice</h3>
                <p className="text-red-100 text-sm mb-3">{error}</p>
                {error.includes('AI service') && (
                  <div className="bg-red-800/30 border border-red-600 rounded p-3">
                    <p className="text-red-200 text-xs mb-2">
                      <strong>What this means:</strong> The AI storytelling service is temporarily unavailable.
                    </p>
                    <p className="text-red-200 text-xs mb-2">
                      <strong>You can still:</strong>
                    </p>
                    <ul className="text-red-200 text-xs list-disc list-inside space-y-1">
                      <li>Continue the story manually by typing your responses</li>
                      <li>Use the predefined plot options if available</li>
                      <li>Wait a few minutes and try again</li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-200 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Debug Panel */}
        {showDebug && (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-600 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-slate-200 mb-4">🐛 Debug Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-slate-300 font-semibold mb-2">Story State</h4>
                <div className="space-y-1 text-slate-400">
                  <div>Story ID: {story?.id || 'None'}</div>
                  <div>Status: {story?.status || 'None'}</div>
                  <div>Phase: {story?.storyMetadata?.phaseStatus || 'None'}</div>
                  <div>Ready Players: {story?.readyPlayers?.length || 0}/{partyMembers.length}</div>
                  <div>Current Speaker: {story?.currentSpeaker?.name || 'None'}</div>
                </div>
              </div>
              <div>
                <h4 className="text-slate-300 font-semibold mb-2">User State</h4>
                <div className="space-y-1 text-slate-400">
                  <div>User ID: {user?.uid || 'None'}</div>
                  <div>Is DM: {user?.uid === party?.dmId ? 'Yes' : 'No'}</div>
                  <div>Is Ready: {isReady ? 'Yes' : 'No'}</div>
                  <div>All Ready: {allPlayersReady ? 'Yes' : 'No'}</div>
                  <div>Combat Loading: {combatLoading ? 'Yes' : 'No'}</div>
                  <div>Has Navigated: {hasNavigatedToCombat ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
            
            {/* Manual Combat Trigger for DM */}
            {user?.uid === party?.dmId && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <h4 className="text-slate-300 font-semibold mb-2">⚔️ Manual Combat Controls</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      console.log('🎮 DM manually triggering combat...');
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
                    }}
                    disabled={combatLoading || hasNavigatedToCombat}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {combatLoading ? 'Loading...' : 'Trigger Combat'}
                  </button>
                  <button
                    onClick={() => {
                      setHasNavigatedToCombat(false);
                      setCombatLoading(false);
                      console.log('🔄 Reset combat navigation state');
                    }}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Reset State
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
        )}

        {/* Modals */}
        {showActionValidation && (
        <ActionValidationDisplay
            validation={actionValidation}
          onClose={handleActionValidationClose}
          onProceed={handleActionProceed}
          onRevise={handleActionRevise}
        />
      )}

        {showDiceRoll && (
        <DiceRollDisplay
            diceResult={diceResult}
          onClose={handleDiceRollClose}
          />
        )}
      </div>
    </div>
  );
} 