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
  createCombatSession,
  updateCombatSession,
  subscribeToCombatSession,
  createCampaignStory
} from '../firebase/database';
import { 
  generateHiddenObjectives, 
  getDiscoveredObjectives
} from '../services/objectives';
import { dungeonMasterService } from '../services/chatgpt';
import { ActionValidationService } from '../services/actionValidation';
import { CombatService } from '../services/combat';
import ActionValidationDisplay from './ActionValidationDisplay';
import DiceRollDisplay from './DiceRollDisplay';

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
  
  // Combat state
  const [combatState, setCombatState] = useState('inactive');
  const [combatSession, setCombatSession] = useState(null);
  const [combatSessionId, setCombatSessionId] = useState(null);
  const [currentCombatant, setCurrentCombatant] = useState(null);
  const [processingCombatAction, setProcessingCombatAction] = useState(false);
  const [battleLog, setBattleLog] = useState([]);
  const [hasNavigatedToCombat, setHasNavigatedToCombat] = useState(false);
  const [combatLoading, setCombatLoading] = useState(false);

  // Services
  const actionValidationService = new ActionValidationService();
  const combatService = new CombatService();

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
      console.log('📡 Setting up real-time subscription for story:', story.id);
      const unsubscribe = subscribeToCampaignStory(story.id, (updatedStory) => {
        if (updatedStory) {
          console.log('📡 Story update received:', updatedStory);
          setStory(updatedStory);
          
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
          
          console.log('🔍 Phase detection debug:', {
            storyMetadataPhase: storyMetadata.phaseStatus,
            contentPhase: storyContent.toLowerCase().includes('phase_status:') ? 
                         storyContent.toLowerCase().split('phase_status:')[1]?.split('\n')[0]?.trim() : 'not found',
            conflictKeywords: storyContent.toLowerCase().includes('conflict'),
            combatKeywords: hasCombatKeywords,
            finalPhaseStatus: phaseStatus
          });
          
          if ((phaseStatus && String(phaseStatus).toLowerCase() === 'conflict') || 
              (hasCombatKeywords && storyContent.toLowerCase().includes('attack') && !hasNavigatedToCombat)) {
            console.log('⚔️ Conflict phase detected, preparing combat session...');
            setHasNavigatedToCombat(true);
            setCombatLoading(true);
            
            // Wait for all players to be ready before creating combat session
            const members = party?.members || [];
            if (updatedStory.readyPlayers?.length === members.length && members.length > 0) {
              console.log('🎉 All players ready, creating combat session...');
              
              // Create a basic combat session before navigating
              console.log('🔍 Debugging party members before combat session creation:', partyMembers);
              console.log('🔍 Debugging party characters before combat session creation:', partyCharacters);
              
              // Use partyCharacters (actual character objects) instead of partyMembers (user IDs)
              const charactersToUse = partyCharacters.length > 0 ? partyCharacters : partyMembers;
              
              // Deep clean and validate party members data
              const validatedPartyMembers = charactersToUse.map((member, index) => {
                console.log(`🔍 Validating member ${index}:`, member);
                
                // If member is a string (user ID), create a basic character object
                if (typeof member === 'string') {
                  console.log(`⚠️ Member ${index} is a user ID string, creating basic character object`);
                  const basicCharacter = {
                    id: `member_${index}`,
                    name: `Player ${index + 1}`,
                    userId: member,
                    race: 'Unknown',
                    class: 'Unknown',
                    level: 1,
                    initiative: Math.floor(Math.random() * 20) + 1,
                    hp: 10,
                    maxHp: 10,
                    ac: 10
                  };
                  console.log(`✅ Created basic character for user ID:`, basicCharacter);
                  return basicCharacter;
                }
                
                // If member is an object, validate and clean it
                const cleanMember = {
                  id: member.id || `member_${index}`,
                  name: member.name || `Unknown Member ${index}`,
                  userId: member.userId || null,
                  race: member.race || 'Unknown',
                  class: member.class || 'Unknown',
                  level: member.level || 1,
                  // Combat stats with fallbacks
                  initiative: member.initiative || Math.floor(Math.random() * 20) + 1,
                  hp: member.hp || member.maxHp || 10,
                  maxHp: member.maxHp || member.hp || 10,
                  ac: member.ac || 10,
                  // Remove any undefined values
                  ...Object.fromEntries(
                    Object.entries(member).filter(([key, value]) => 
                      value !== undefined && 
                      value !== null && 
                      key !== 'id' && 
                      key !== 'name' && 
                      key !== 'userId' && 
                      key !== 'race' && 
                      key !== 'class' && 
                      key !== 'level' && 
                      key !== 'initiative' && 
                      key !== 'hp' && 
                      key !== 'maxHp' && 
                      key !== 'ac'
                    )
                  )
                };
                
                console.log(`✅ Cleaned member ${index}:`, cleanMember);
                return cleanMember;
              });
              
              console.log('✅ Final validated party members:', validatedPartyMembers);
              
              // Extract enemies from story content
              let extractedEnemies = [];
              
              // Debug: Log the story metadata
              console.log('🔍 Story metadata:', updatedStory.storyMetadata);
              console.log('🔍 Story metadata enemy details:', updatedStory.storyMetadata?.enemyDetails);
              
              // First, try to get enemies from story metadata
              if (updatedStory.storyMetadata?.enemyDetails && updatedStory.storyMetadata.enemyDetails.length > 0) {
                console.log('🔍 Found enemy details in story metadata:', updatedStory.storyMetadata.enemyDetails);
                extractedEnemies = convertEnemyDetailsToCombatEnemies(updatedStory.storyMetadata.enemyDetails);
                console.log('⚔️ Extracted enemies from story metadata:', extractedEnemies);
              }
              
              // If no enemies found in metadata, try parsing the story content
              if (extractedEnemies.length === 0 && updatedStory.currentContent) {
                console.log('🔍 No enemies in metadata, trying to parse story content...');
                const parsedResponse = parseStructuredResponse(updatedStory.currentContent);
                if (parsedResponse.enemyDetails && parsedResponse.enemyDetails.length > 0) {
                  extractedEnemies = convertEnemyDetailsToCombatEnemies(parsedResponse.enemyDetails);
                  console.log('⚔️ Extracted enemies from story content:', extractedEnemies);
                }
              }
              
              // If still no enemies found, use fallback enemies
              if (extractedEnemies.length === 0) {
                console.log('⚠️ No enemies found in story or metadata, using fallback enemies');
                extractedEnemies = [
                  {
                    id: 'enemy_0',
                    name: 'Gnoll Tribesmen',
                    hp: 12,
                    maxHp: 12,
                    ac: 15,
                    level: 1,
                    class: 'humanoid',
                    race: 'gnoll',
                    initiative: Math.floor(Math.random() * 20) + 1,
                    strength: 14,
                    dexterity: 12,
                    constitution: 12,
                    intelligence: 8,
                    wisdom: 8,
                    charisma: 6,
                    statusEffects: [],
                    cooldowns: {},
                    lastAction: null,
                    turnCount: 0,
                    basicAttack: 'Spiked Club (1d6 + 2 bludgeoning damage)',
                    specialAbility: 'Pack Tactics (The Gnoll has advantage on an attack roll against a creature if at least one of the gnoll\'s allies is within 5 feet of the creature and the ally isn\'t incapacitated.)'
                  }
                ];
              }
              
              console.log('⚔️ Final enemies for combat session:', extractedEnemies);
              
              // Create a basic combat session with the party members and enemies
              const basicCombatSession = {
                partyId,
                partyMembers: validatedPartyMembers,
                enemies: extractedEnemies, // Use the extracted enemies
                storyContext: updatedStory.currentContent || 'Combat encounter',
                combatState: 'initialized',
                currentTurn: 0,
                round: 1,
                initiative: [], // Add empty initiative array to prevent Firebase error
                environmentalFeatures: [],
                teamUpOpportunities: [],
                narrativeElements: []
              };
              
              console.log('✅ Final combat session object:', basicCombatSession);
              
              // Store the basic session in the database
              createCombatSession(partyId, basicCombatSession).then(() => {
                console.log('⚔️ Basic combat session created, navigating to Combat page...');
                setCombatLoading(false);
                setHasNavigatedToCombat(true);
                navigate(`/combat/${partyId}`);
              }).catch(error => {
                console.error('❌ Failed to create combat session:', error);
                setCombatLoading(false);
                setHasNavigatedToCombat(false);
              });
              
              // Add a timeout to prevent infinite loading
              setTimeout(() => {
                if (combatLoading) {
                  console.warn('⚠️ Combat loading timeout, resetting state...');
                  setCombatLoading(false);
                  setHasNavigatedToCombat(false);
                }
              }, 5000); // Reduced from 10 seconds to 5 seconds
            } else {
              console.log('⏳ Waiting for all players to be ready before combat...');
            }
          } else if (updatedStory.storyMetadata && String(updatedStory.storyMetadata.phaseStatus).toLowerCase() !== 'conflict') {
            // Reset navigation flag when not in conflict phase
            setHasNavigatedToCombat(false);
            setCombatLoading(false);
          }
          
          // Update ready status
          if (updatedStory.readyPlayers?.includes(user?.uid)) {
            console.log('✅ User is ready');
            setIsReady(true);
          }
          
          // Check if all players are ready
          const members = party?.members || [];
          if (updatedStory.readyPlayers?.length === members.length && members.length > 0) {
            console.log('🎉 All players are ready!');
            setAllPlayersReady(true);
          } else {
            console.log('⏳ Not all players ready yet:', updatedStory.readyPlayers?.length, '/', members.length);
            setAllPlayersReady(false);
          }
        }
      });
      
      setUnsubscribe(() => unsubscribe);
      return () => unsubscribe();
    }
  }, [story?.id, user?.uid, party?.members, combatState, navigate, hasNavigatedToCombat]);

  // Subscribe to real-time combat session updates
  useEffect(() => {
    if (combatSessionId) {
      console.log('⚔️ Setting up real-time subscription for combat session:', combatSessionId);
      const unsubscribe = subscribeToCombatSession(partyId, (updatedCombatSession) => {
        if (updatedCombatSession) {
          console.log('⚔️ Combat session update received:', updatedCombatSession);
          console.log('⚔️ Combat session state:', updatedCombatSession.combatState);
          console.log('⚔️ Combat session ID:', updatedCombatSession.id);
          
          // Reconstruct the full combat session from database data
          const reconstructedSession = {
            combatants: [
              ...updatedCombatSession.partyMembers,
              ...updatedCombatSession.enemies
            ],
            currentTurn: updatedCombatSession.currentTurn,
            round: updatedCombatSession.round,
            combatState: updatedCombatSession.combatState,
            storyContext: updatedCombatSession.storyContext,
            environmentalFeatures: updatedCombatSession.environmentalFeatures,
            teamUpOpportunities: updatedCombatSession.teamUpOpportunities,
            narrativeElements: updatedCombatSession.narrativeElements
          };
          
          console.log('⚔️ Reconstructed session:', reconstructedSession);
          setCombatSession(reconstructedSession);
          setCurrentCombatant(reconstructedSession.combatants[updatedCombatSession.currentTurn]);
          setCombatState(updatedCombatSession.combatState);
        } else {
          console.log('⚔️ Combat session ended or not found');
          console.log('⚔️ Clearing combat state...');
          setCombatSession(null);
          setCombatSessionId(null);
          setCombatState('inactive');
          setCurrentCombatant(null);
        }
      });
      
      return () => unsubscribe();
    }
  }, [combatSessionId, partyId]);

  // Log current combatant changes
  useEffect(() => {
    if (currentCombatant && combatSession) {
      console.log('🔄 Turn changed to:', currentCombatant.name, 'at index:', combatSession.currentTurn);
      console.log('🔄 Full turn order:', combatSession.combatants.map((c, i) => `${i}: ${c.name} (${c.initiative})`));
    }
  }, [currentCombatant, combatSession]);

  // Auto-process enemy turns
  useEffect(() => {
    if (combatState === 'active' && currentCombatant && currentCombatant.id.startsWith('enemy_') && !processingCombatAction) {
      console.log('🤖 Auto-processing enemy turn for:', currentCombatant.name);
      console.log('🤖 Current turn order:', combatSession?.combatants.map((c, i) => `${i}: ${c.name} (${c.initiative})`));
      console.log('🤖 Current turn index:', combatSession?.currentTurn);
      
      const timer = setTimeout(async () => {
        try {
          setProcessingCombatAction(true);
          
          // Choose enemy action
          const availableActions = combatService.getAvailableActions(currentCombatant);
          console.log('🤖 Available actions for enemy:', availableActions);
          
          const validTargets = combatService.getValidTargets(currentCombatant, 'attack', combatSession);
          console.log('🤖 Valid targets for enemy:', validTargets.map(t => t.name));
          
          const chosenAction = combatService.makeEnemyDecision(currentCombatant, availableActions, validTargets, combatSession);
          
          console.log('🤖 Enemy decision:', chosenAction);
          
          // Execute enemy action
          const result = await combatService.executeAction(combatSession, currentCombatant.id, chosenAction.action, chosenAction.targetId);
          
          if (result.success) {
            console.log('🤖 Enemy action result:', result);
            console.log('🤖 Action details:', {
              enemy: currentCombatant.name,
              action: chosenAction.action,
              target: chosenAction.targetId,
              specialAttack: chosenAction.specialAttack,
              damageType: chosenAction.damageType
            });
            
            // Get the updated session from the result
            const updatedSession = result.combatSession;
            
            // Apply damage to target if damage was dealt
            if (result.results && result.results.damage > 0) {
              const target = updatedSession.combatants.find(c => c.id === chosenAction.targetId);
              if (target) {
                const oldHp = target.hp;
                target.hp = Math.max(0, target.hp - result.results.damage);
                console.log(`🤖 Enemy applied ${result.results.damage} damage to ${target.name}. HP: ${oldHp} → ${target.hp}`);
                
                // Add battle log entry for damage
                addBattleLogEntry({
                  type: 'damage',
                  attacker: currentCombatant.name,
                  target: target.name,
                  damage: result.results.damage,
                  targetHp: target.hp,
                  action: chosenAction.action,
                  message: `${currentCombatant.name} deals ${result.results.damage} damage to ${target.name} (${target.hp} HP remaining)`
                });
              }
            } else if (result.results && result.results.healing > 0) {
              // Add battle log entry for healing
              const target = updatedSession.combatants.find(c => c.id === chosenAction.targetId);
              if (target) {
                addBattleLogEntry({
                  type: 'healing',
                  healer: currentCombatant.name,
                  target: target.name,
                  healing: result.results.healing,
                  action: chosenAction.action,
                  message: `${currentCombatant.name} heals ${target.name} for ${result.results.healing} HP`
                });
              }
            } else {
              // Add battle log entry for other actions
              addBattleLogEntry({
                type: 'action',
                actor: currentCombatant.name,
                action: chosenAction.action,
                target: updatedSession.combatants.find(c => c.id === chosenAction.targetId)?.name || 'None',
                message: `${currentCombatant.name} uses ${chosenAction.action}`
              });
            }
            
            // Log the updated combat session for debugging
            console.log('🤖 Updated combat session:', updatedSession);
            console.log('🤖 Combatants after enemy action:', updatedSession.combatants.map(c => `${c.name}: ${c.hp}/${c.maxHp}`));
            
            // Update combat session
            setCombatSession(updatedSession);
            
            // Update combat session in database for real-time synchronization
            if (combatSessionId) {
              await updateCombatSession(combatSessionId, {
                currentTurn: updatedSession.currentTurn,
                round: updatedSession.round,
                combatState: updatedSession.combatState,
                partyMembers: updatedSession.combatants.filter(c => !c.id.startsWith('enemy_')),
                enemies: updatedSession.combatants.filter(c => c.id.startsWith('enemy_'))
              });
            }
            
            // Update current combatant based on the new turn
            const nextCombatant = updatedSession.combatants[updatedSession.currentTurn];
            setCurrentCombatant(nextCombatant);
            
            // Check if combat should end
            const combatResult = combatService.checkCombatEnd(updatedSession);
            if (combatResult.isComplete) {
              console.log('⚔️ Combat ended:', combatResult);
              setCombatState('complete');
              
              // Add combat end entry to battle log
              addBattleLogEntry({
                type: 'combat_end',
                result: combatResult.result,
                message: combatResult.result === 'victory' ? 
                  '🎉 Victory! All enemies have been defeated!' : 
                  combatResult.result === 'defeat' ? 
                  '💀 Defeat! The party has been overwhelmed!' : 
                  '🤝 Combat ends in a draw.'
              });
              
              // Clear battle log after a delay to show the final result
              setTimeout(() => {
                setBattleLog([]);
              }, 5000);
              
              // Generate combat summary and update story
              const summary = combatService.generateCombatSummary(updatedSession, combatResult);
              const narrative = combatService.generateCombatNarrative(updatedSession, combatResult);
              
              // Update story with combat results
              await updateCampaignStory(story.id, {
                currentContent: narrative,
                storyMetadata: {
                  ...story.storyMetadata,
                  phaseStatus: 'Storytelling',
                  combatResult: combatResult
                }
              });
            } else {
              // Check for individual enemy deaths
              const deadEnemies = updatedSession.combatants.filter(c => 
                c.id.startsWith('enemy_') && c.hp <= 0 && c.maxHp > 0
              );
              
              deadEnemies.forEach(enemy => {
                enemy.maxHp = 0; // Mark as processed
                addBattleLogEntry({
                  type: 'enemy_death',
                  enemy: enemy.name,
                  message: `💀 ${enemy.name} has been defeated!`
                });
              });
            }
          }
          
          setProcessingCombatAction(false);
        } catch (error) {
          console.error('❌ Error processing enemy turn:', error);
          setProcessingCombatAction(false);
        }
      }, 2000); // 2 second delay for enemy turn
      
      return () => clearTimeout(timer);
    }
  }, [currentCombatant, combatState, combatSession, story?.id, story?.storyMetadata, combatService, processingCombatAction, combatSessionId]);

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
      console.log('🔄 Starting loadStoryAndCharacters...');
      setLoading(true);
      
      // Load party data first
      const partyData = await getPartyById(partyId);
      console.log('👥 Party data loaded:', partyData);
      setParty(partyData);
      const members = partyData?.members || [];
      setPartyMembers(members);
      
      // Load story data
      let storyData = await getCampaignStory(partyId);
      console.log('📖 Story data loaded:', storyData);
      
      // Create story if it doesn't exist
      if (!storyData) {
        console.log('📝 Creating new campaign story...');
        storyData = await createCampaignStory(partyId);
        console.log('✅ New story created:', storyData);
        }
        
        setStory(storyData);
      
      // Load characters
      const characters = await getPartyCharacters(partyId);
      console.log('🎭 Characters loaded:', characters);
      console.log('🎭 Character count:', characters.length);
      console.log('🎭 Character details:', characters.map(c => ({ id: c.id, name: c.name, userId: c.userId, partyId: c.partyId })));
      setPartyCharacters(characters);
      
      // Generate objectives
      const objectivesData = generateHiddenObjectives(partyData?.description || "adventure");
      setObjectives(objectivesData);
      
      console.log('✅ loadStoryAndCharacters completed successfully');
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
      console.log('👋 User readying up...');
      setLoading(true);
      await setPlayerReady(story.id, user.uid);
      console.log('✅ Player ready status set');
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
      console.log('🚀 Starting story generation...');
      setLoading(true);
      setIsGeneratingPlots(true);
      
      // Set status to generating
      await updateCampaignStory(story.id, { status: 'generating' });
      console.log('📊 Status set to generating');
      
      try {
        // Generate plots using the dungeon master service
        const plotsResponse = await dungeonMasterService.generateStoryPlots(
          partyCharacters,
          party?.description || 'An epic adventure awaits!',
          objectives
        );
        console.log('📜 Generated plots response:', plotsResponse);
        
        // Parse the plots from the response
        const parsedPlots = parsePlotsFromResponse(plotsResponse);
        console.log('✅ Parsed plots array:', parsedPlots);
        
        // Move to voting phase with the generated plots
        await updateCampaignStory(story.id, {
          status: 'voting',
          availablePlots: parsedPlots
        });
        console.log('🗳️ Moved to voting phase');
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
        console.log('🗳️ Moved to voting phase with fallback plots');
        
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
      console.log('🎯 Selecting plot:', plotIndex);
      setLoading(true);
      
      // Get the filtered plots (without fallback plots)
      const validPlots = story?.availablePlots?.filter(plot => plot.title && !plot.title.startsWith('Plot ')) || [];
      const selectedPlot = validPlots[plotIndex];
      
      console.log('📋 Available plots:', story?.availablePlots);
      console.log('🎯 Valid plots:', validPlots);
      console.log('🎯 Selected plot:', selectedPlot);
      
      if (!selectedPlot) {
        console.error('❌ Selected plot not found');
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
      console.log('📝 Status set to generating_story');
      
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
      console.log('🎤 Setting speaker:', character);
      console.log('🎤 Character data:', JSON.stringify(character));
      console.log('🎤 Story ID:', story?.id);
      setLoading(true);
      
      if (character) {
        await setCurrentSpeaker(story.id, character);
      } else {
        // Clear current speaker
        await updateCampaignStory(story.id, { currentSpeaker: null });
      }
      
      console.log('✅ Speaker set');
    } catch (error) {
      console.error('❌ Error setting speaker:', error);
      setError('Failed to set speaker');
    } finally {
      setLoading(false);
    }
  }, [story?.id]);

  const handleContinueStory = useCallback(async () => {
    try {
      console.log('🚀 Continuing story...');
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
      
      console.log('✅ Story continued');
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
      console.log('🔍 Parsing plots from response...');
      
      // Split the response by plot sections - this format is now guaranteed
      const plotSections = response.split(/\*\*Plot Option \d+:\*\*/).filter(section => section.trim());
      
      console.log('📋 Found plot sections:', plotSections.length);
      
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
        console.log('🔍 Raw enemy details text:', enemyDetailsText);
        
        // Split by "Name:" to get individual enemy blocks
        const enemyBlocks = enemyDetailsText.split(/(?=Name:)/).filter(block => block.trim());
        console.log('🔍 Enemy blocks found:', enemyBlocks.length);
        
        sections.enemyDetails = enemyBlocks.map((block, index) => {
          console.log(`🔍 Parsing enemy block ${index}:`, block);
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
          
          console.log(`✅ Parsed enemy ${index}:`, enemy);
          return enemy;
        });
      }
      
      console.log('✅ Parsed structured response:', sections);
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
      console.log('⚠️ No enemy details provided, returning empty array');
      return [];
    }

    console.log('🔧 Converting enemy details to combat-ready enemies:', enemyDetails);
    
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
      
      console.log(`✅ Converted enemy ${index}:`, combatEnemy);
      return combatEnemy;
    });
  };

  // Add entry to battle log
  const addBattleLogEntry = useCallback((entry) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      ...entry
    };
    setBattleLog(prev => [...prev, logEntry]);
    console.log('📜 Battle Log Entry:', logEntry);
  }, []);

  // Initialize combat when conflict phase is detected
  const initializeCombat = useCallback(async (storyData) => {
    try {
      console.log('⚔️ Initializing combat...');
      
      // In initializeCombat, robust fallback for enemies
      let extractedEnemies = [];
      if (Array.isArray(storyData.storyMetadata?.enemies) && storyData.storyMetadata.enemies.length > 0) {
        extractedEnemies = [...storyData.storyMetadata.enemies];
      } else {
        // Fallback enemy details
        extractedEnemies = [
          {
            id: 'enemy_0',
            name: 'Gnoll Pack',
            hp: 20,
            maxHp: 20,
            ac: 12,
            level: 1,
            class: 'enemy',
            race: 'unknown',
            initiative: Math.floor(Math.random() * 20) + 1,
            strength: 12,
            dexterity: 10,
            constitution: 12,
            intelligence: 8,
            wisdom: 8,
            charisma: 6
          },
          {
            id: 'enemy_1',
            name: 'Gnoll Pack-Leader',
            hp: 25,
            maxHp: 25,
            ac: 14,
            level: 2,
            class: 'enemy',
            race: 'unknown',
            initiative: Math.floor(Math.random() * 20) + 1,
            strength: 14,
            dexterity: 12,
            constitution: 14,
            intelligence: 10,
            wisdom: 10,
            charisma: 8
          }
        ];
        console.log('⚔️ Using fallback enemy details:', extractedEnemies);
      }
      setEnemies(extractedEnemies);
      
      // Add combat start entry to battle log
      addBattleLogEntry({
        type: 'combat_start',
        message: `Combat begins! ${extractedEnemies.length} enemies appear.`,
        enemies: extractedEnemies.map(e => e.name)
      });
      
      // Prepare party characters with proper stats
      const preparedPartyCharacters = partyCharacters.map(character => {
        // Calculate HP if not present
        let hp = character.hp;
        let maxHp = character.maxHp;
        
        if (!hp || !maxHp) {
          const hitDieSizes = {
            'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
            'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Bard': 8,
            'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
          };
          
          const hitDie = hitDieSizes[character.class] || 8;
          const constitution = character.assignedScores?.constitution || 10;
          const constitutionMod = Math.floor((constitution - 10) / 2);
          const calculatedHp = Math.max(1, (hitDie + constitutionMod) * (character.level || 1));
          
          hp = calculatedHp;
          maxHp = calculatedHp;
        }
        
        // Calculate AC if not present
        let ac = character.ac;
        if (!ac) {
          const baseAC = 10;
          const dexterity = character.assignedScores?.dexterity || 10;
          const dexterityMod = Math.floor((dexterity - 10) / 2);
          const classACBonuses = {
            'Barbarian': 3, 'Monk': 2, 'Fighter': 4, 'Paladin': 4, 'Cleric': 4,
            'Ranger': 3, 'Rogue': 2, 'Bard': 2, 'Druid': 2, 'Sorcerer': 0,
            'Warlock': 0, 'Wizard': 0
          };
          const classBonus = classACBonuses[character.class] || 0;
          ac = Math.max(10, baseAC + dexterityMod + classBonus);
        }
        
        return {
          ...character,
          hp: hp,
          maxHp: maxHp,
          ac: ac,
          initiative: Math.floor(Math.random() * 20) + 1
        };
      });
      
      console.log('⚔️ Prepared party characters:', preparedPartyCharacters);
      
      // Initialize combat session
      const session = combatService.initializeCombat(
        preparedPartyCharacters,
        extractedEnemies,
        storyData.currentContent || 'Combat encounter'
      );
      
      console.log('⚔️ Combat initialized with turn order:', session.combatants.map((c, i) => `${i}: ${c.name} (initiative: ${c.initiative})`));
      
      // Store combat session in database for real-time synchronization
      const dbCombatSession = await createCombatSession(partyId, {
        storyContext: session.storyContext,
        partyMembers: session.combatants.filter(c => !c.id.startsWith('enemy_')),
        enemies: session.combatants.filter(c => c.id.startsWith('enemy_')),
        initiative: session.combatants.map(c => ({ id: c.id, name: c.name, initiative: c.initiative })),
        currentTurn: session.currentTurn,
        round: session.round,
        combatState: session.combatState,
        environmentalFeatures: session.environmentalFeatures,
        teamUpOpportunities: session.teamUpOpportunities,
        narrativeElements: session.narrativeElements
      });
      
      console.log('⚔️ Combat session stored in database:', dbCombatSession);
      
      setCombatSession(session);
      setCombatSessionId(dbCombatSession.id);
      setCombatState('active');
      setCurrentCombatant(session.combatants[0]);
      
      console.log('⚔️ Combat initialized:', session);
    } catch (error) {
      console.error('❌ Error initializing combat:', error);
    }
  }, [partyCharacters, combatService, addBattleLogEntry, partyId]);

  // Execute combat action
  const executeCombatAction = useCallback(async (actionType, targetId) => {
    try {
      // Prevent multiple executions
      if (processingCombatAction) {
        console.log('⚔️ Combat action already processing, skipping...');
        return;
      }
      
      console.log('⚔️ Executing combat action:', actionType, 'on target:', targetId);
      setProcessingCombatAction(true);
      
      if (!combatSession || !currentCombatant) {
        console.error('❌ No active combat session or current combatant');
        setProcessingCombatAction(false);
        return;
      }
      
      // Execute the action
      const result = await combatService.executeAction(
        combatSession,
        currentCombatant.id,
        actionType,
        targetId
      );
      
      if (!result.success) {
        console.error('❌ Combat action failed:', result.message);
        setProcessingCombatAction(false);
        return;
      }
      
      console.log('⚔️ Combat action result:', result);
      
      // Get the updated session from the result
      const updatedSession = result.combatSession;
      
      // Apply damage to target if damage was dealt
      if (result.results && result.results.damage > 0) {
        const target = updatedSession.combatants.find(c => c.id === targetId);
        if (target) {
          const oldHp = target.hp;
          target.hp = Math.max(0, target.hp - result.results.damage);
          console.log(`⚔️ Applied ${result.results.damage} damage to ${target.name}. HP: ${oldHp} → ${target.hp}`);
          
          // Add battle log entry for damage
          addBattleLogEntry({
            type: 'damage',
            attacker: currentCombatant.name,
            target: target.name,
            damage: result.results.damage,
            targetHp: target.hp,
            action: actionType,
            message: `${currentCombatant.name} deals ${result.results.damage} damage to ${target.name} (${target.hp} HP remaining)`
          });
        }
      } else if (result.results && result.results.healing > 0) {
        // Add battle log entry for healing
        const target = updatedSession.combatants.find(c => c.id === targetId);
        if (target) {
          addBattleLogEntry({
            type: 'healing',
            healer: currentCombatant.name,
            target: target.name,
            healing: result.results.healing,
            action: actionType,
            message: `${currentCombatant.name} heals ${target.name} for ${result.results.healing} HP`
          });
        }
      } else {
        // Add battle log entry for other actions
        addBattleLogEntry({
          type: 'action',
          actor: currentCombatant.name,
          action: actionType,
          target: updatedSession.combatants.find(c => c.id === targetId)?.name || 'None',
          message: `${currentCombatant.name} uses ${actionType}`
        });
      }
      
      // Log the updated combat session for debugging
      console.log('⚔️ Updated combat session:', updatedSession);
      console.log('⚔️ Combatants after action:', updatedSession.combatants.map(c => `${c.name}: ${c.hp}/${c.maxHp}`));
      
      // Update combat session
      setCombatSession(updatedSession);
      
      // Update combat session in database for real-time synchronization
      if (combatSessionId) {
        await updateCombatSession(combatSessionId, {
          currentTurn: updatedSession.currentTurn,
          round: updatedSession.round,
          combatState: updatedSession.combatState,
          partyMembers: updatedSession.combatants.filter(c => !c.id.startsWith('enemy_')),
          enemies: updatedSession.combatants.filter(c => c.id.startsWith('enemy_'))
        });
      }
      
      // Update current combatant based on the new turn
      const nextCombatant = updatedSession.combatants[updatedSession.currentTurn];
      setCurrentCombatant(nextCombatant);
      
      // Clear selected action
      setSelectedAction(null);
      
      // Check if combat should end
      const combatResult = combatService.checkCombatEnd(updatedSession);
      if (combatResult.isComplete) {
        console.log('⚔️ Combat ended:', combatResult);
        setCombatState('complete');
        
        // Add combat end entry to battle log
        addBattleLogEntry({
          type: 'combat_end',
          result: combatResult.result,
          message: combatResult.result === 'victory' ? 
            '🎉 Victory! All enemies have been defeated!' : 
            combatResult.result === 'defeat' ? 
            '💀 Defeat! The party has been overwhelmed!' : 
            '🤝 Combat ends in a draw.'
        });
        
        // Clear battle log after a delay to show the final result
        setTimeout(() => {
          setBattleLog([]);
        }, 5000);
        
        // Generate combat summary and update story
        const summary = combatService.generateCombatSummary(updatedSession, combatResult);
        const narrative = combatService.generateCombatNarrative(updatedSession, combatResult);
        
        // Update story with combat results
        await updateCampaignStory(story.id, {
          currentContent: narrative,
          storyMetadata: {
            ...story.storyMetadata,
            phaseStatus: 'Storytelling',
            combatResult: combatResult
          }
        });
      } else {
        // Check for individual enemy deaths
        const deadEnemies = updatedSession.combatants.filter(c => 
          c.id.startsWith('enemy_') && c.hp <= 0 && c.maxHp > 0
        );
        
        deadEnemies.forEach(enemy => {
          enemy.maxHp = 0; // Mark as processed
          addBattleLogEntry({
            type: 'enemy_death',
            enemy: enemy.name,
            message: `💀 ${enemy.name} has been defeated!`
          });
        });
      }
      
      setProcessingCombatAction(false);
      
    } catch (error) {
      console.error('❌ Error executing combat action:', error);
      setProcessingCombatAction(false);
    }
  }, [combatSession, currentCombatant, story?.id, story?.storyMetadata, combatService, processingCombatAction, combatSessionId]);

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
                      // Check if this character is the current combatant during combat
                      const isCurrentCombatant = combatState === 'active' && combatSession?.combatants?.[combatSession.currentTurn]?.userId === character.userId;
                      
                      // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
                      // BUT only if combat is not active
                      const canBeSelected = combatState !== 'active' && (
                        (story?.currentSpeaker?.userId === user?.uid) || 
                        (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                        (!story?.currentSpeaker && user?.uid === party?.dmId)
                      ) && !isCurrentSpeaker; // Prevent selecting yourself as speaker (redundant)
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
                          {combatState === 'active' ? (
                            isCurrentCombatant ? (
                              <div className="text-yellow-400 text-xs mt-1">🎲 Current Turn</div>
                            ) : (
                              <div className="text-red-400 text-xs mt-1">⚔️ Combat Active</div>
                            )
                          ) : (
                            isCurrentSpeaker && (
                              <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                            )
                          )}
                          {!canBeSelected && !isCurrentSpeaker && combatState !== 'active' && (
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
                {story?.campaignMetadata && combatState !== 'active' && (
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
                {objectives.length > 0 && combatState !== 'active' && (
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

              {/* Combat Loading Message */}
              {combatLoading && (
                <div className="bg-gradient-to-br from-blue-800/50 to-blue-700/50 border border-blue-600 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <div className="text-blue-200 text-lg font-semibold mb-2">⚔️ Combat is Loading...</div>
                    <div className="text-blue-300 text-sm">Preparing combat encounter...</div>
                    <div className="mt-3 text-blue-400 text-xs">
                      Waiting for all players to be ready...
                    </div>
                  </div>
                </div>
              )}

              {/* Combat UI - Display when in conflict phase */}
              {combatState === 'active' && combatSession && (
                <div className="bg-gradient-to-br from-red-800/50 to-red-700/50 border border-red-600 rounded-lg p-6 mb-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-red-100 mb-2 border-b border-red-600 pb-2">
                      ⚔️ Combat Encounter
                    </h3>
                    <div className="text-red-200 text-sm">
                      Round: {combatSession.round} | Turn: {combatSession.currentTurn + 1}
                    </div>
                    {/* Turn Order Display */}
                    <div className="mt-3 p-3 bg-slate-800/30 rounded-lg">
                      <h5 className="text-slate-300 font-medium mb-2">Turn Order (Initiative):</h5>
                      <div className="flex flex-wrap gap-1">
                        {combatSession.combatants.map((combatant, index) => (
                          <div 
                            key={combatant.id} 
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              index === combatSession.currentTurn 
                                ? 'bg-yellow-600 text-yellow-100 border border-yellow-500' 
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {index + 1}. {combatant.name} ({combatant.initiative})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Combatants */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Party Members */}
                    <div>
                      <h4 className="text-green-400 font-semibold mb-2">Party Members</h4>
                      <div className="space-y-2">
                        {combatSession.combatants?.filter(c => !c.id.startsWith('enemy_')).map((combatant) => (
                          <div key={combatant.id} className={`p-2 rounded ${combatant.id === currentCombatant?.id ? 'bg-green-600/30 border border-green-500' : 'bg-slate-700/30'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-200 font-medium">{combatant.name}</span>
                              <span className="text-slate-300 text-sm">HP: {combatant.hp || 0}/{combatant.maxHp || 0}</span>
                            </div>
                            {combatant.id === currentCombatant?.id && (
                              <div className="text-green-400 text-xs mt-1">Current Turn</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Enemies */}
                    <div>
                      <h4 className="text-red-400 font-semibold mb-2">Enemies</h4>
                      <div className="space-y-2">
                        {combatSession.combatants?.filter(c => c.id.startsWith('enemy_')).map((enemy) => (
                          <div key={enemy.id} className={`p-2 rounded ${enemy.id === currentCombatant?.id ? 'bg-red-600/30 border border-red-500' : 'bg-slate-700/30'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-200 font-medium">{enemy.name}</span>
                              <span className="text-slate-300 text-sm">HP: {enemy.hp || 0}/{enemy.maxHp || 0}</span>
                            </div>
                            {enemy.id === currentCombatant?.id && (
                              <div className="text-red-400 text-xs mt-1">Current Turn</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Combat Actions */}
                  {currentCombatant && !currentCombatant.id.startsWith('enemy_') && (
                    // Show actions if it's the current user's turn OR if we can't determine the user match
                    (currentCombatant.userId === user?.uid || !currentCombatant.userId) && (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <h4 className="text-blue-400 font-semibold mb-3">Actions for {currentCombatant.name}</h4>
                      {processingCombatAction && (
                        <div className="mb-3 p-2 bg-blue-600/30 border border-blue-500 rounded text-blue-200 text-sm">
                          ⚔️ Processing combat action...
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(combatService.actionTypes).map(([actionKey, action]) => (
                          <button
                            key={actionKey}
                            onClick={() => setSelectedAction(actionKey)}
                            disabled={processingCombatAction}
                            className={`p-2 rounded text-sm transition-colors ${
                              selectedAction === actionKey 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {action.name}
                          </button>
                        ))}
                      </div>
                      
                      {selectedAction && (
                        <div className="mt-4">
                          <h5 className="text-slate-300 font-medium mb-2">Select Target:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {combatSession.combatants?.filter(c => c.id !== currentCombatant.id).map((target) => (
                              <button
                                key={target.id}
                                onClick={() => executeCombatAction(selectedAction, target.id)}
                                disabled={processingCombatAction}
                                className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingCombatAction ? 'Processing...' : target.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Fallback Combat Actions - Show for any player character during combat */}
                  {combatState === 'active' && currentCombatant && !currentCombatant.id.startsWith('enemy_') && 
                   currentCombatant.userId !== user?.uid && currentCombatant.userId && (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <h4 className="text-orange-400 font-semibold mb-3">⚠️ Fallback Actions for {currentCombatant.name}</h4>
                      <p className="text-slate-300 text-sm mb-3">User ID mismatch detected. Showing actions anyway.</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(combatService.actionTypes).map(([actionKey, action]) => (
                          <button
                            key={actionKey}
                            onClick={() => setSelectedAction(actionKey)}
                            disabled={processingCombatAction}
                            className={`p-2 rounded text-sm transition-colors ${
                              selectedAction === actionKey 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {action.name}
                          </button>
                        ))}
                      </div>
                      
                      {selectedAction && (
                        <div className="mt-4">
                          <h5 className="text-slate-300 font-medium mb-2">Select Target:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {combatSession.combatants?.filter(c => c.id !== currentCombatant.id).map((target) => (
                              <button
                                key={target.id}
                                onClick={() => executeCombatAction(selectedAction, target.id)}
                                disabled={processingCombatAction}
                                className="p-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingCombatAction ? 'Processing...' : target.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Debug Panel for Combat Issues */}
                  {combatState === 'active' && (
                    <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
                      <h4 className="text-yellow-400 font-semibold mb-3">🐛 Combat Debug Info</h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Combat State: {combatState}</div>
                        <div>Current Combatant: {currentCombatant?.name || 'None'} (ID: {currentCombatant?.id || 'None'})</div>
                        <div>Current User: {user?.uid || 'None'}</div>
                        <div>Combatant User ID: {currentCombatant?.userId || 'None'}</div>
                        <div>Is Enemy: {currentCombatant?.id?.startsWith('enemy_') ? 'Yes' : 'No'}</div>
                        <div>User Match: {currentCombatant?.userId === user?.uid ? 'Yes' : 'No'}</div>
                        <div>Should Show Actions: {currentCombatant && !currentCombatant.id.startsWith('enemy_') && currentCombatant.userId === user?.uid ? 'Yes' : 'No'}</div>
                        <div>Combat Session: {combatSession ? 'Active' : 'None'}</div>
                        <div>Current Turn: {combatSession?.currentTurn || 'None'}</div>
                        <div>Total Combatants: {combatSession?.combatants?.length || 0}</div>
                      </div>
                      
                      {/* Manual Action Trigger */}
                      {currentCombatant && !currentCombatant.id.startsWith('enemy_') && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <h5 className="text-yellow-400 font-medium mb-2">Manual Action Trigger</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
                                if (enemies.length > 0) {
                                  executeCombatAction('attack', enemies[0].id);
                                }
                              }}
                              disabled={processingCombatAction}
                              className="p-2 rounded bg-red-700 hover:bg-red-600 text-white text-xs transition-colors disabled:opacity-50"
                            >
                              Attack First Enemy
                            </button>
                            <button
                              onClick={() => {
                                const allies = combatSession.combatants.filter(c => !c.id.startsWith('enemy_') && c.id !== currentCombatant.id);
                                if (allies.length > 0) {
                                  executeCombatAction('defend', allies[0].id);
                                }
                              }}
                              disabled={processingCombatAction}
                              className="p-2 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs transition-colors disabled:opacity-50"
                            >
                              Defend Ally
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Player Turn Indicator - Show when it's a player's turn but not the current user's */}
                  {currentCombatant && !currentCombatant.id.startsWith('enemy_') && currentCombatant.userId !== user?.uid && (
                    <div className="bg-blue-800/30 rounded-lg p-4 text-center">
                      <div className="text-blue-300 font-medium">Player Turn: {currentCombatant.name}</div>
                      <div className="text-blue-400 text-sm mt-1">Waiting for {currentCombatant.name} to take their action...</div>
                    </div>
                  )}
                  
                  {/* Enemy Turn Indicator */}
                  {currentCombatant && currentCombatant.id.startsWith('enemy_') && (
                    <div className="bg-red-800/30 rounded-lg p-4 text-center">
                      <div className="text-red-300 font-medium">Enemy Turn: {currentCombatant.name}</div>
                      <div className="text-red-400 text-sm mt-1">Processing enemy action...</div>
                    </div>
                  )}
                  
                  {/* Battle Log */}
                  {battleLog.length > 0 && (
                    <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
                      <h4 className="text-yellow-400 font-semibold mb-3">📜 Battle Log</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {battleLog.slice(-10).map((entry) => (
                          <div key={entry.id} className={`text-sm p-2 rounded ${
                            entry.type === 'damage' ? 'bg-red-800/30 border-l-4 border-red-500' :
                            entry.type === 'healing' ? 'bg-green-800/30 border-l-4 border-green-500' :
                            entry.type === 'combat_start' ? 'bg-blue-800/30 border-l-4 border-blue-500' :
                            entry.type === 'enemy_death' ? 'bg-purple-800/30 border-l-4 border-purple-500' :
                            entry.type === 'combat_end' ? 'bg-yellow-800/30 border-l-4 border-yellow-500' :
                            'bg-slate-800/30 border-l-4 border-slate-500'
                          }`}>
                            <div className="flex justify-between items-start">
                              <span className="text-slate-200">{entry.message}</span>
                              <span className="text-slate-400 text-xs ml-2">{entry.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Current Speaker Response */}
              {story?.currentSpeaker && combatState !== 'active' ? (
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
                /* DM Response Box - Only show when no current speaker AND combat is not active AND user is DM */
                combatState !== 'active' && user?.uid === party?.dmId && (
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
                    // Check if this character is the current combatant during combat
                    const isCurrentCombatant = combatState === 'active' && combatSession?.combatants?.[combatSession.currentTurn]?.userId === character.userId;
                    
                    // Allow selection if the current user is the current speaker OR if DM is speaking and user is DM OR if no speaker and user is DM
                    // BUT only if combat is not active
                    const canBeSelected = combatState !== 'active' && (
                      (story?.currentSpeaker?.userId === user?.uid) || 
                      (story?.currentSpeaker?.id === 'dm' && user?.uid === party?.dmId) ||
                      (!story?.currentSpeaker && user?.uid === party?.dmId)
                    ) && !isCurrentSpeaker; // Prevent selecting yourself as speaker (redundant)
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
                        {combatState === 'active' ? (
                          isCurrentCombatant ? (
                            <div className="text-yellow-400 text-xs mt-1">🎲 Current Turn</div>
                          ) : (
                            <div className="text-red-400 text-xs mt-1">⚔️ Combat Active</div>
                          )
                        ) : (
                          isCurrentSpeaker && (
                            <div className="text-blue-400 text-xs mt-1">Currently Speaking</div>
                          )
                        )}
                        {!canBeSelected && !isCurrentSpeaker && combatState !== 'active' && (
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
              {story?.storyMessages && story.storyMessages.length > 0 && combatState !== 'active' && (
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
                  <div>Combat State: {combatState}</div>
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
                    onClick={() => {
                      console.log('🎮 DM manually triggering combat...');
                      setHasNavigatedToCombat(true);
                      setCombatLoading(true);
                      
                      // Deep clean and validate party members data for manual trigger
                      console.log('🔍 Debugging party members for manual combat:', partyMembers);
                      console.log('🔍 Debugging party characters for manual combat:', partyCharacters);
                      
                      // Use partyCharacters (actual character objects) instead of partyMembers (user IDs)
                      const charactersToUse = partyCharacters.length > 0 ? partyCharacters : partyMembers;
                      
                      const validatedPartyMembers = charactersToUse.map((member, index) => {
                        console.log(`🔍 Validating member ${index} for manual combat:`, member);
                        
                        // If member is a string (user ID), create a basic character object
                        if (typeof member === 'string') {
                          console.log(`⚠️ Member ${index} is a user ID string, creating basic character object for manual combat`);
                          const basicCharacter = {
                            id: `member_${index}`,
                            name: `Player ${index + 1}`,
                            userId: member,
                            race: 'Unknown',
                            class: 'Unknown',
                            level: 1,
                            initiative: Math.floor(Math.random() * 20) + 1,
                            hp: 10,
                            maxHp: 10,
                            ac: 10
                          };
                          console.log(`✅ Created basic character for user ID in manual combat:`, basicCharacter);
                          return basicCharacter;
                        }
                        
                        // If member is an object, validate and clean it
                        const cleanMember = {
                          id: member.id || `member_${index}`,
                          name: member.name || `Unknown Member ${index}`,
                          userId: member.userId || null,
                          race: member.race || 'Unknown',
                          class: member.class || 'Unknown',
                          level: member.level || 1,
                          // Combat stats with fallbacks
                          initiative: member.initiative || Math.floor(Math.random() * 20) + 1,
                          hp: member.hp || member.maxHp || 10,
                          maxHp: member.maxHp || member.hp || 10,
                          ac: member.ac || 10,
                          // Remove any undefined values
                          ...Object.fromEntries(
                            Object.entries(member).filter(([key, value]) => 
                              value !== undefined && 
                              value !== null && 
                              key !== 'id' && 
                              key !== 'name' && 
                              key !== 'userId' && 
                              key !== 'race' && 
                              key !== 'class' && 
                              key !== 'level' && 
                              key !== 'initiative' && 
                              key !== 'hp' && 
                              key !== 'maxHp' && 
                              key !== 'ac'
                            )
                          )
                        };
                        
                        console.log(`✅ Cleaned member ${index} for manual combat:`, cleanMember);
                        return cleanMember;
                      });
                      
                      console.log('✅ Final validated party members for manual combat:', validatedPartyMembers);
                      
                      const basicCombatSession = {
                        partyId: partyId,
                        partyMembers: validatedPartyMembers,
                        enemies: [],
                        storyContext: story?.currentContent || 'Manual combat encounter',
                        combatState: 'initialized',
                        currentTurn: 0,
                        round: 1,
                        environmentalFeatures: [],
                        teamUpOpportunities: [],
                        narrativeElements: []
                      };
                      
                      console.log('✅ Final combat session object for manual combat:', basicCombatSession);
                      
                      createCombatSession(partyId, basicCombatSession).then(() => {
                        console.log('⚔️ Manual combat session created, navigating...');
                        navigate(`/combat/${partyId}`);
                      }).catch(error => {
                        console.error('❌ Failed to create manual combat session:', error);
                        setCombatLoading(false);
                        setHasNavigatedToCombat(false);
                      });
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