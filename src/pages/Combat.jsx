import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  updateCombatSessionWithNarrative,
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters
} from '../firebase/database';
import { combatService } from '../services/combat';

export default function Combat() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [combatSession, setCombatSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partyCharacters, setPartyCharacters] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [narrativeDescription, setNarrativeDescription] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [environmentalFeatures, setEnvironmentalFeatures] = useState([]);
  const [teamUpOpportunities, setTeamUpOpportunities] = useState([]);
  const [isEnemyTurn, setIsEnemyTurn] = useState(false);
  const [enemyTurnMessage, setEnemyTurnMessage] = useState('');
  const [enemyTurnNarrative, setEnemyTurnNarrative] = useState('');
  const [processingTurn, setProcessingTurn] = useState(false);
  const [playerDied, setPlayerDied] = useState(false);
  const [deadPlayer, setDeadPlayer] = useState(null);
  const [lastProcessedTurn, setLastProcessedTurn] = useState(-1);
  const [damageAnimation, setDamageAnimation] = useState(null);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  const [enemyTurnComplete, setEnemyTurnComplete] = useState(false);
  const [partyMembersReady, setPartyMembersReady] = useState(new Set());
  const [battleLog, setBattleLog] = useState([]);
  const [combatReady, setCombatReady] = useState(false);
  
  // Check if this is a test combat session
  const isTestCombat = location.state?.isTestCombat;
  const testData = location.state;

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
    if (isTestCombat && testData) {
      // Initialize test combat session
      initializeTestCombat();
    } else if (partyId) {
      // Load regular combat session
      loadCombatData();
    }
  }, [isTestCombat, testData, partyId]);

  useEffect(() => {
    if (partyId && !isTestCombat) {
      const unsubscribe = subscribeToCombatSession(partyId, (session) => {
        setCombatSession(session);
        setLoading(false);
        
        if (session) {
          // Update available actions based on current combatant
          updateAvailableActions(session);
          setEnvironmentalFeatures(session.environmentalFeatures || []);
          setTeamUpOpportunities(session.teamUpOpportunities || []);
          
          // Check for player death
          checkPlayerDeath();
          
          // Check if current turn is an enemy turn and auto-process
          // Only process if we haven't already processed this turn and it's not currently processing
          const currentCombatant = session.combatants?.[session.currentTurn];
          if (currentCombatant && 
              currentCombatant.id.startsWith('enemy_') && 
              session.combatState === 'active' &&
              session.currentTurn !== lastProcessedTurn &&
              !processingTurn &&
              !isEnemyTurn) {
            
            console.log('Auto-processing enemy turn for:', currentCombatant.name, 'turn:', session.currentTurn);
            setLastProcessedTurn(session.currentTurn);
            
            // Delay to allow UI to update first
            setTimeout(() => {
              processEnemyTurn();
            }, 1000);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [partyId, lastProcessedTurn, processingTurn, isEnemyTurn, isTestCombat]);

  // Additional useEffect for test combat sessions
  useEffect(() => {
    if (combatSession && isTestCombat && combatSession.combatState === 'active') {
      const currentCombatant = combatSession.combatants?.[combatSession.currentTurn];
      console.log('Test combat useEffect check:', {
        currentTurn: combatSession.currentTurn,
        currentCombatant: currentCombatant?.name,
        isEnemy: currentCombatant?.id.startsWith('enemy_'),
        lastProcessedTurn,
        processingTurn,
        isEnemyTurn,
        totalCombatants: combatSession.combatants?.length,
        combatState: combatSession.combatState
      });
      
      // Only process if this is an enemy turn that hasn't been processed yet
      if (currentCombatant && 
          currentCombatant.id.startsWith('enemy_') && 
          combatSession.currentTurn !== lastProcessedTurn &&
          !processingTurn &&
          !isEnemyTurn) {
        
        console.log('Auto-processing test enemy turn for:', currentCombatant.name, 'turn:', combatSession.currentTurn);
        setLastProcessedTurn(combatSession.currentTurn);
        
        // Delay to allow UI to update first
        setTimeout(() => {
          processEnemyTurn();
        }, 1000);
      }
    }
  }, [combatSession?.currentTurn, isTestCombat, lastProcessedTurn, processingTurn, isEnemyTurn]);

  // Update available actions when combat session or turn changes
  useEffect(() => {
    if (combatSession && combatSession.combatState === 'active') {
      updateAvailableActions(combatSession);
    }
  }, [combatSession?.currentTurn, combatSession?.combatState]);

  // Auto-advance turn when all party members are ready
  useEffect(() => {
    if (enemyTurnComplete && areAllPartyMembersReady()) {
      console.log('All party members ready, advancing to next turn');
      setEnemyTurnComplete(false);
      setPartyMembersReady(new Set());
      advanceTurn();
    }
  }, [enemyTurnComplete, partyMembersReady]);

  const initializeTestCombat = async () => {
    try {
      setLoading(true);
      
      console.log('Initializing test combat with data:', testData);
      
      // Create a test combat session
      const testSession = {
        id: 'test_combat_session',
        partyMembers: testData.partyMembers || [],
        enemies: testData.enemies || [],
        storyContext: testData.storyContext || 'Test combat environment',
        combatState: 'initialized',
        currentTurn: 0,
        combatants: [],
        round: 1
      };

      console.log('Test session created:', {
        partyMembers: testSession.partyMembers.length,
        enemies: testSession.enemies.length,
        enemyList: testSession.enemies
      });

      // Check if we have enemies
      if (!testSession.enemies || testSession.enemies.length === 0) {
        console.error('No enemies provided for test combat!');
        setCombatSession({ 
          ...testSession, 
          status: 'no_enemies',
          combatState: 'ended'
        });
        setLoading(false);
        return;
      }

      // Initialize combat with Pokemon-style mechanics
      const initializedCombat = combatService.initializeCombat(
        testSession.partyMembers,
        testSession.enemies,
        testSession.storyContext
      );

      console.log('Combat initialized:', {
        combatants: initializedCombat.combatants.length,
        enemies: initializedCombat.combatants.filter(c => c.id.startsWith('enemy_')).length,
        players: initializedCombat.combatants.filter(c => !c.id.startsWith('enemy_')).length,
        turnOrder: initializedCombat.combatants.map(c => `${c.name} (${c.initiative})`)
      });

      // Use the combatants in their proper initiative order - don't reorder them!
      const finalSession = {
        ...testSession,
        ...initializedCombat,
        currentTurn: 0,
        combatState: 'active'
      };

      console.log('Final test session:', {
        combatants: finalSession.combatants.length,
        enemies: finalSession.combatants.filter(c => c.id.startsWith('enemy_')).map(e => e.name),
        players: finalSession.combatants.filter(c => !c.id.startsWith('enemy_')).map(p => p.name),
        enemyIds: finalSession.combatants.filter(c => c.id.startsWith('enemy_')).map(e => e.id),
        playerIds: finalSession.combatants.filter(c => !c.id.startsWith('enemy_')).map(p => p.id),
        turnOrder: finalSession.combatants.map((c, i) => `${i}: ${c.name} (${c.initiative})`)
      });

      setCombatSession(finalSession);
      setLoading(false);
      
      // Update available actions for the current combatant
      updateAvailableActions(finalSession);
      setEnvironmentalFeatures(finalSession.environmentalFeatures || []);
      setTeamUpOpportunities(finalSession.teamUpOpportunities || []);
    } catch (error) {
      console.error('Error initializing test combat:', error);
      setLoading(false);
    }
  };

  const loadCombatData = async () => {
    if (!partyId) {
      console.log('No partyId provided, skipping loadCombatData');
      return;
    }
    
    try {
      setLoading(true);
      const session = await getCombatSession(partyId);
      
      if (!session) {
        // No active combat session, redirect back to story
          console.log('No combat session found, navigating to story with partyId:', partyId);
          try {
            navigate(`/campaign-story/${partyId}`);
          } catch (error) {
            console.error('Navigation error in loadCombatData:', error);
            navigate('/dashboard');
        }
        return;
      }
      
        const characters = await getPartyCharacters(partyId);
        setPartyCharacters(characters);
      
      // Check if there are enemies to fight
      if (session.enemies && session.enemies.length === 0 && !isTestCombat) {
        // No enemies to fight, show message and redirect
        console.log('No enemies found in regular combat session');
        setCombatSession({ ...session, status: 'no_enemies' });
        return;
      }
      
      console.log('Setting combat session:', {
        enemies: session.enemies?.length,
        combatants: session.combatants?.length,
        isTestCombat
      });
      
      setCombatSession(session);
      updateAvailableActions(session);
      setEnvironmentalFeatures(session.environmentalFeatures || []);
      setTeamUpOpportunities(session.teamUpOpportunities || []);
    } catch (error) {
      console.error('Error loading combat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableActions = (session) => {
    const currentCombatant = getCurrentCombatant(session);
    if (!currentCombatant) {
      console.log('No current combatant found for updateAvailableActions');
      return;
    }

    console.log('Updating available actions for:', currentCombatant.name, {
      class: currentCombatant.class,
      cooldowns: currentCombatant.cooldowns,
      isEnemy: currentCombatant.id.startsWith('enemy_')
    });

    const actions = [];
    const cooldowns = currentCombatant.cooldowns || {};

    // Add basic actions
    Object.entries(combatService.actionTypes).forEach(([actionType, config]) => {
      if (cooldowns[actionType] === 0 || cooldowns[actionType] === undefined) {
        actions.push({
          type: actionType,
          name: config.name,
          description: config.description,
          priority: config.priority,
          narrativeTemplate: config.narrativeTemplate
        });
      }
    });

    // Add class-specific abilities
    const classAbility = combatService.classAbilities[currentCombatant.class?.toLowerCase()];
    if (classAbility && (cooldowns.special === 0 || cooldowns.special === undefined)) {
      actions.push({
        type: 'special',
        name: classAbility.name,
        description: classAbility.description,
        priority: 'high',
        narrativeTemplate: '{character} uses their {ability}!'
      });
    }

    // Add environmental actions if available
    if (environmentalFeatures.length > 0) {
      actions.push({
        type: 'environmental',
        name: 'Use Environment',
        description: 'Use the environment to your advantage',
        priority: 'normal',
        narrativeTemplate: '{character} uses the {environment} to their advantage!'
      });
    }

    // Add team-up actions if available
    if (teamUpOpportunities.length > 0) {
      actions.push({
        type: 'teamUp',
        name: 'Team Up',
        description: 'Coordinate with another party member',
        priority: 'high',
        narrativeTemplate: '{character} coordinates with {ally} for a powerful combination!'
      });
    }

    console.log('Generated actions for:', currentCombatant.name, actions);
    setAvailableActions(actions);
  };

  const addToBattleLog = (entry) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      timestamp,
      round: combatSession?.round || 1,
      turn: combatSession?.currentTurn || 0,
      ...entry
    };
    setBattleLog(prev => [...prev, logEntry]);
  };

  const startCombat = async () => {
    if (!combatSession) return;
    
    try {
      setProcessingTurn(true);
      
      // Clear battle log for new combat
      setBattleLog([]);
      
      const updatedSession = {
        ...combatSession,
        combatState: 'ready',
        currentTurn: 0,
        round: 1
      };

      if (isTestCombat) {
        setCombatSession(updatedSession);
        updateAvailableActions(updatedSession);
      } else {
        await updateCombatSession(partyId, updatedSession);
      }
      
      // Add combat start entry to battle log
      addToBattleLog({
        type: 'combat_start',
        description: 'Combat is ready to begin!'
      });
      
      } catch (error) {
      console.error('Error starting combat:', error);
    } finally {
      setProcessingTurn(false);
    }
  };

  const beginCombat = async () => {
    if (!combatSession) return;
    
    try {
      setProcessingTurn(true);
      
      const updatedSession = {
        ...combatSession,
        combatState: 'active'
      };

      if (isTestCombat) {
        setCombatSession(updatedSession);
        updateAvailableActions(updatedSession);
    } else {
        await updateCombatSession(partyId, updatedSession);
      }
      
      // Add combat begin entry to battle log
      addToBattleLog({
        type: 'combat_begin',
        description: 'Fight!'
      });
      
      setCombatReady(true);
      
    } catch (error) {
      console.error('Error beginning combat:', error);
    } finally {
      setProcessingTurn(false);
    }
  };

  const executeAction = async (actionType, targetId, additionalData = {}) => {
    if (!combatSession || combatSession.combatState !== 'active') {
      console.error('Combat not active');
      return;
    }

    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant) {
      console.error('No current combatant');
      return;
    }

    console.log('Executing action:', {
      actionType,
      targetId,
      currentCombatant: currentCombatant.name,
      additionalData
    });

    try {
      setProcessingTurn(true);
      
      // Record the action in battle log
      const target = combatSession.combatants.find(c => c.id === targetId);
      addToBattleLog({
        type: 'action',
        actor: currentCombatant.name,
        action: actionType,
        target: target?.name || 'Unknown',
        description: `${currentCombatant.name} uses ${actionType}${target ? ` on ${target.name}` : ''}`
      });

      const result = await combatService.executeAction(
        combatSession,
        currentCombatant.id,
        actionType,
        targetId,
        additionalData
      );

      if (result.success) {
        console.log('Action executed successfully:', result);
        
        // Update combat session with result - fix the undefined error
        const updatedSession = {
          ...combatSession,
          ...(result.updatedSession || {}),
          currentTurn: (result.updatedSession?.currentTurn !== undefined) 
            ? result.updatedSession.currentTurn 
            : combatSession.currentTurn
        };

        // Record damage/healing in battle log
        if (result.damage) {
          addToBattleLog({
            type: 'damage',
            actor: currentCombatant.name,
            target: target?.name || 'Unknown',
            damage: result.damage,
            description: `${currentCombatant.name} deals ${result.damage} damage to ${target?.name || 'Unknown'}`
          });
        }

        if (result.healing) {
          addToBattleLog({
            type: 'healing',
            actor: currentCombatant.name,
            target: target?.name || 'Unknown',
            healing: result.healing,
            description: `${currentCombatant.name} heals ${target?.name || 'Unknown'} for ${result.healing} HP`
          });
        }

        // Record status effects
        if (result.statusEffects && result.statusEffects.length > 0) {
          result.statusEffects.forEach(effect => {
            addToBattleLog({
              type: 'status_effect',
              actor: currentCombatant.name,
              target: target?.name || 'Unknown',
              effect: effect.type,
              description: `${target?.name || 'Unknown'} is affected by ${effect.type}`
            });
          });
        }

        // Record death
        if (result.targetDied) {
          addToBattleLog({
            type: 'death',
            actor: currentCombatant.name,
            target: target?.name || 'Unknown',
            description: `${target?.name || 'Unknown'} has been defeated!`
          });
        }

        setCombatSession(updatedSession);
        
        // Show damage animation
        if (result.damage && target) {
          setDamageAnimation({
            targetId: target.id,
            damage: result.damage,
            type: 'damage'
          });
          setShowDamageAnimation(true);
          setTimeout(() => setShowDamageAnimation(false), 2000);
        }

        // Check if combat should end
        if (result.combatEnded) {
          console.log('Combat ended');
          if (isTestCombat) {
            navigate('/test-environment', { 
              state: { 
                ...testData,
                combatResult: result.combatResult 
              } 
            });
          } else {
            await endCombat();
          }
          return;
        }

        // Check if target is dead and no more enemies
        const remainingEnemies = updatedSession.combatants.filter(c => 
          c.id.startsWith('enemy_') && c.hp > 0
        );
        
        if (remainingEnemies.length === 0) {
          console.log('No more enemies, ending combat');
          if (isTestCombat) {
            navigate('/test-environment', { 
              state: { 
                ...testData,
                combatResult: 'victory' 
              } 
            });
          } else {
            await endCombat();
          }
          return;
        }

        // Automatically advance to next turn after a short delay
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        
      } else {
        console.error('Action execution failed:', result.error);
        setActionMessage(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      setActionMessage('Error executing action');
    } finally {
      setProcessingTurn(false);
    }
  };

  const processEnemyTurn = async () => {
    if (!combatSession || combatSession.combatState !== 'active') {
      console.error('Combat not active');
      return;
    }
    
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant || !currentCombatant.id.startsWith('enemy_')) {
      console.error('Not an enemy turn');
      return;
    }
    
    console.log('Processing enemy turn for:', currentCombatant.name);

    try {
    setProcessingTurn(true);
      setIsEnemyTurn(true);

      // Record enemy turn start in battle log
      addToBattleLog({
        type: 'turn_start',
        actor: currentCombatant.name,
        description: `${currentCombatant.name}'s turn begins`
      });

      // Use the correct method name from combat service
      const selectedAction = combatService.chooseEnemyAction(currentCombatant, combatSession);
      console.log('Selected enemy action:', selectedAction);

      if (!selectedAction) {
        console.log('No action selected for enemy');
        addToBattleLog({
          type: 'no_action',
          actor: currentCombatant.name,
          description: `${currentCombatant.name} cannot decide on an action`
        });
        
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      // Fix: Use the correct property names from the combat service
      const actionType = selectedAction.action; // Changed from selectedAction.type
      const targetId = selectedAction.target; // Changed from target.id

      if (!actionType) {
        console.log('No action type in selected action');
        addToBattleLog({
          type: 'no_action',
          actor: currentCombatant.name,
          description: `${currentCombatant.name} has no valid action type`
        });
        
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      // Get the target combatant
      const target = combatSession.combatants.find(c => c.id === targetId);
      if (!target && actionType !== 'defend') {
        console.log('No target found for enemy action');
        addToBattleLog({
          type: 'no_target',
          actor: currentCombatant.name,
          action: actionType,
          description: `${currentCombatant.name} cannot find a target for ${actionType}`
        });
        
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      // Record the action in battle log
      addToBattleLog({
        type: 'action',
        actor: currentCombatant.name,
        action: actionType,
        target: target?.name || 'self',
        description: `${currentCombatant.name} uses ${actionType}${target ? ` on ${target.name}` : ''}`
      });

      // Execute the action
      const result = await combatService.executeAction(
        combatSession,
        currentCombatant.id,
        actionType,
        targetId,
        selectedAction // Pass the full selectedAction object as additionalData
      );

      if (result.success) {
        console.log('Enemy action executed successfully:', result);

        // Update combat session
        const updatedSession = {
          ...combatSession,
          ...(result.updatedSession || {}),
          currentTurn: (result.updatedSession?.currentTurn !== undefined) 
            ? result.updatedSession.currentTurn 
            : combatSession.currentTurn
        };

        // Record damage/healing in battle log
        if (result.damage) {
          addToBattleLog({
            type: 'damage',
            actor: currentCombatant.name,
            target: target?.name || 'self',
            damage: result.damage,
            description: `${currentCombatant.name} deals ${result.damage} damage to ${target?.name || 'self'}`
          });
        }

        if (result.healing) {
          addToBattleLog({
            type: 'healing',
            actor: currentCombatant.name,
            target: target?.name || 'self',
            healing: result.healing,
            description: `${currentCombatant.name} heals ${target?.name || 'self'} for ${result.healing} HP`
          });
        }

        // Record status effects
        if (result.statusEffects && result.statusEffects.length > 0) {
          result.statusEffects.forEach(effect => {
            addToBattleLog({
              type: 'status_effect',
              actor: currentCombatant.name,
              target: target?.name || 'self',
              effect: effect.type,
              description: `${target?.name || 'self'} is affected by ${effect.type}`
            });
          });
        }

        // Record death
        if (result.targetDied) {
          addToBattleLog({
            type: 'death',
            actor: currentCombatant.name,
            target: target?.name || 'self',
            description: `${target?.name || 'self'} has been defeated!`
          });
        }

        setCombatSession(updatedSession);

        // Show damage animation
        if (result.damage && target) {
          setDamageAnimation({
            targetId: target.id,
            damage: result.damage,
            type: 'damage'
          });
          setShowDamageAnimation(true);
          setTimeout(() => setShowDamageAnimation(false), 2000);
        }

        // Generate narrative description
        const narrative = combatService.generateActionNarrative(
          currentCombatant,
          actionType,
          target,
          selectedAction
        );

        setEnemyTurnMessage(`${currentCombatant.name} uses ${actionType}!`);
        setEnemyTurnNarrative(narrative);

        // Check if combat should end
        if (result.combatEnded) {
          console.log('Combat ended');
          if (isTestCombat) {
            navigate('/test-environment', { 
              state: { 
                ...testData,
                combatResult: result.combatResult 
              } 
            });
          } else {
            await endCombat();
          }
      return;
    }
    
        // Check if all players are dead
        const remainingPlayers = updatedSession.combatants.filter(c => 
          !c.id.startsWith('enemy_') && c.hp > 0
        );
        
        if (remainingPlayers.length === 0) {
          console.log('All players dead, ending combat');
          if (isTestCombat) {
            navigate('/test-environment', { 
              state: { 
                ...testData,
                combatResult: 'defeat' 
              } 
            });
    } else {
            await endCombat();
          }
          return;
        }

        // Automatically advance to next turn after a short delay
        setTimeout(() => {
          advanceTurn();
        }, 1000);

      } else {
        console.error('Enemy action execution failed:', result.error);
        addToBattleLog({
          type: 'action_failed',
          actor: currentCombatant.name,
          action: actionType,
          description: `${currentCombatant.name}'s ${actionType} failed`
        });
        
        setTimeout(() => {
          advanceTurn();
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing enemy turn:', error);
      addToBattleLog({
        type: 'error',
        actor: currentCombatant.name,
        description: `Error during ${currentCombatant.name}'s turn`
      });
      
      setTimeout(() => {
        advanceTurn();
      }, 1000);
    } finally {
      setProcessingTurn(false);
      setIsEnemyTurn(false);
    }
  };

  const advanceTurn = async () => {
    if (!combatSession || combatSession.combatState !== 'active') {
      console.error('Combat not active');
      return;
    }

    console.log('Advancing turn from:', combatSession.currentTurn);

    // Find the next alive combatant
    let nextTurn = (combatSession.currentTurn + 1) % combatSession.combatants.length;
    let attempts = 0;
    const maxAttempts = combatSession.combatants.length;

    while (attempts < maxAttempts) {
      const nextCombatant = combatSession.combatants[nextTurn];
      
      if (nextCombatant && nextCombatant.hp > 0) {
        break; // Found an alive combatant
      }
      
      nextTurn = (nextTurn + 1) % combatSession.combatants.length;
      attempts++;
    }

    // If we've checked all combatants and none are alive, end combat
    if (attempts >= maxAttempts) {
      console.log('No alive combatants found, ending combat');
      if (isTestCombat) {
        navigate('/test-environment', { 
          state: { 
            ...testData,
            combatResult: 'draw' 
          } 
        });
      } else {
        await endCombat();
      }
      return;
    }

    // Check if we've completed a full round
    if (nextTurn === 0) {
      const updatedSession = {
        ...combatSession,
        currentTurn: nextTurn,
        round: combatSession.round + 1
      };
      
      if (isTestCombat) {
        setCombatSession(updatedSession);
      } else {
        await updateCombatSession(partyId, updatedSession);
      }
    } else {
      const updatedSession = {
        ...combatSession,
        currentTurn: nextTurn
      };
      
      if (isTestCombat) {
        setCombatSession(updatedSession);
      } else {
        await updateCombatSession(partyId, updatedSession);
      }
    }

    console.log('Turn advanced to:', nextTurn, 'combatant:', combatSession.combatants[nextTurn]?.name);

    // Update available actions for the new current combatant
    const newSession = isTestCombat ? combatSession : await getCombatSession(partyId);
    if (newSession) {
      updateAvailableActions(newSession);
    }
  };

  const endCombat = async () => {
    if (!combatSession) return;
    
    // Generate combat summary
    const summary = combatService.generateCombatSummary(combatSession, 'victory');
    
    // Mark combat session as ended
    if (isTestCombat) {
      // For test combat, update only local state
      setCombatSession(prevSession => ({
        ...prevSession,
        status: 'ended',
        combatState: 'ended',
        summary: summary
      }));
      
      // For test combat, navigate back to test environment
      navigate('/test-environment');
    } else {
    await updateCombatSessionWithNarrative(combatSession.id, {
      status: 'ended',
      combatState: 'ended',
      summary: summary
    });
    
      // For regular combat, return story to active state
      await updateCampaignStory(partyId, {
        status: 'storytelling',
        currentCombat: null
      });
      
      // Navigate back to story
      try {
        console.log('Ending combat, navigating to story with partyId:', partyId);
        navigate(`/campaign-story/${partyId}`);
      } catch (error) {
        console.error('Navigation error in endCombat:', error);
        navigate('/dashboard');
      }
    }
  };

  const updateHp = async (combatantId, newHp) => {
    if (!combatSession) return;
    
    const clampedHp = Math.max(0, newHp);
    
    if (combatantId.startsWith('enemy_')) {
      const updatedEnemies = combatSession.enemies.map(enemy => 
        enemy.id === combatantId ? { ...enemy, hp: clampedHp } : enemy
      );
      const updatedCombatants = combatSession.combatants.map(combatant => 
        combatant.id === combatantId ? { ...combatant, hp: clampedHp } : combatant
      );
      if (isTestCombat) {
        // For test combat, update only local state
        setCombatSession(prevSession => ({
          ...prevSession,
          enemies: updatedEnemies,
          combatants: updatedCombatants
        }));
      } else {
      await updateCombatSessionWithNarrative(combatSession.id, {
        enemies: updatedEnemies,
        combatants: updatedCombatants
      });
      }
      
      // Update local state immediately
      setCombatSession(prevSession => ({
        ...prevSession,
        enemies: updatedEnemies,
        combatants: updatedCombatants
      }));
    } else {
      const updatedPartyMembers = combatSession.partyMembers.map(member => 
        member.id === combatantId ? { ...member, hp: clampedHp } : member
      );
      const updatedCombatants = combatSession.combatants.map(combatant => 
        combatant.id === combatantId ? { ...combatant, hp: clampedHp } : combatant
      );
      if (isTestCombat) {
        // For test combat, update only local state
        setCombatSession(prevSession => ({
          ...prevSession,
          partyMembers: updatedPartyMembers,
          combatants: updatedCombatants
        }));
      } else {
      await updateCombatSessionWithNarrative(combatSession.id, {
        partyMembers: updatedPartyMembers,
        combatants: updatedCombatants
      });
      }
      
      // Update local state immediately
      setCombatSession(prevSession => ({
        ...prevSession,
        partyMembers: updatedPartyMembers,
        combatants: updatedCombatants
      }));
    }
  };

  const getCurrentCombatant = (session = combatSession) => {
    if (!session?.combatants || session.currentTurn === undefined) {
      console.log('getCurrentCombatant: No session or combatants');
      return null;
    }
    
    const combatant = session.combatants[session.currentTurn];
    console.log('getCurrentCombatant:', {
      currentTurn: session.currentTurn,
      totalCombatants: session.combatants.length,
      combatant: combatant?.name,
      isEnemy: combatant?.id.startsWith('enemy_'),
      hp: combatant?.hp
    });
    
    return combatant;
  };

  const isCurrentUserTurn = () => {
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant) return false;
    
    // For test combat, if the current combatant is not an enemy, it's the user's turn
    if (isTestCombat) {
      return !currentCombatant.id.startsWith('enemy_');
    }
    
    // For regular combat, check if the current combatant belongs to the current user
    return currentCombatant.userId === user?.uid;
  };

  const getCurrentUserCharacter = () => {
    // For test combat, return the current combatant if it's not an enemy
    if (isTestCombat) {
      const currentCombatant = getCurrentCombatant();
      if (currentCombatant && !currentCombatant.id.startsWith('enemy_')) {
        return currentCombatant;
      }
      return null;
    }
    
    // For regular combat, find the character belonging to the current user
    return partyCharacters.find(char => char.userId === user?.uid);
  };

  // Check if current player is dead
  const checkPlayerDeath = () => {
    if (!combatSession) return;
    
    if (isTestCombat) {
      // For test combat, check if the test character is dead
      const testCharacter = combatSession.combatants.find(c => !c.id.startsWith('enemy_'));
      if (testCharacter && testCharacter.hp <= 0) {
        setPlayerDied(true);
        setDeadPlayer(testCharacter);
      }
    } else if (user) {
      // For regular combat, check if the current user's character is dead
    const currentPlayer = combatSession.partyMembers.find(p => p.userId === user.uid) ||
                         combatSession.combatants.find(c => c.userId === user.uid && !c.id.startsWith('enemy_'));
    if (currentPlayer && currentPlayer.hp <= 0) {
      setPlayerDied(true);
      setDeadPlayer(currentPlayer);
      }
    }
  };

  // Handle player death
  const handlePlayerDeath = () => {
    if (isTestCombat) {
      // For test combat, navigate to dashboard
      navigate('/dashboard');
    } else {
      // For regular combat, navigate to character creation
      navigate(`/character-creation/${partyId}`);
    }
  };

  // Handle "Okay" button click to proceed after enemy turn
  const handleProceedAfterEnemyTurn = () => {
    if (isTestCombat) {
      // For test combat, just proceed immediately
      setEnemyTurnComplete(false);
      setPartyMembersReady(new Set());
      advanceTurn();
    } else {
      // For regular combat, mark current user as ready
      const currentUserId = user?.uid;
      if (currentUserId) {
        setPartyMembersReady(prev => new Set([...prev, currentUserId]));
      }
    }
  };

  // Check if all party members are ready to proceed
  const areAllPartyMembersReady = () => {
    if (isTestCombat) {
      return true; // Test combat doesn't need multiple confirmations
    }
    
    if (!combatSession?.partyMembers) return false;
    
    const alivePartyMembers = combatSession.partyMembers.filter(member => member.hp > 0);
    const readyMembers = partyMembersReady.size;
    
    return readyMembers >= alivePartyMembers.length;
  };

  if (!user) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚔️</div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Loading Combat...</h2>
            <p className="text-gray-300 mb-6">
              Preparing the battlefield and gathering combatants...
            </p>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!combatSession) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-gray-400">No active combat session found.</div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no enemies to fight
  if ((combatSession.status === 'no_enemies' || (combatSession.enemies && combatSession.enemies.length === 0)) && !isTestCombat) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🕊️</div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">No Enemies to Fight</h2>
            <p className="text-gray-300 mb-6">
              There are no enemies present in this area. Combat cannot begin.
            </p>
            <p className="text-gray-400 text-sm">
              The combat session will end automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentCombatant = getCurrentCombatant();

  // Player Death Screen
  if (playerDied && deadPlayer) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card bg-red-50 border-red-200">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💀</div>
            <h1 className="text-3xl font-bold text-red-800 mb-4">Character Death</h1>
            <div className="text-xl text-red-700 mb-6">
              {deadPlayer.name} has fallen in battle...
            </div>
            <div className="bg-white p-6 rounded-lg border border-red-300 mb-6">
              <h2 className="text-lg font-semibold text-stone-800 mb-2">Fallen Hero</h2>
              <p className="text-stone-600 mb-2">
                <strong>Name:</strong> {deadPlayer.name}
              </p>
              <p className="text-stone-600 mb-2">
                <strong>Class:</strong> {deadPlayer.class}
              </p>
              <p className="text-stone-600 mb-2">
                <strong>Level:</strong> {deadPlayer.level}
              </p>
              <p className="text-stone-600">
                <strong>Final HP:</strong> {deadPlayer.hp}/{deadPlayer.maxHp}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-stone-600">
                Your character has been defeated. You must create a new character to continue.
              </p>
              <button
                onClick={handlePlayerDeath}
                className="fantasy-button bg-red-600 hover:bg-red-700"
              >
                Create New Character
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="fantasy-container py-4">
        {/* Combat Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">⚔️ Combat Arena</h1>
          <div className="flex space-x-2">
            {combatSession.combatState === 'preparation' && (
              <button onClick={startCombat} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                Start Combat
              </button>
            )}
            {combatSession.combatState === 'active' && (
                <button onClick={endCombat} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg">
                  End Combat
                </button>
            )}
          </div>
        </div>

        {/* Main Combat Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Column - Combat Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* Story Context */}
            {combatSession.storyContext && (
              <div className="fantasy-card">
                <h3 className="font-bold text-gray-100 mb-2">Story Context</h3>
                <p className="text-gray-300 italic text-sm">{combatSession.storyContext}</p>
              </div>
            )}

            {/* Environmental Features */}
            {environmentalFeatures.length > 0 && (
              <div className="fantasy-card">
                <h3 className="font-bold text-blue-300 mb-2">🌍 Environmental Features</h3>
                <div className="flex flex-wrap gap-2">
                  {environmentalFeatures.map((feature, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Team Up Opportunities */}
            {teamUpOpportunities.length > 0 && (
              <div className="fantasy-card">
                <h3 className="font-bold text-purple-300 mb-2">🤝 Team Up Opportunities</h3>
                <div className="space-y-2">
                  {teamUpOpportunities.map((opportunity, index) => (
                    <div key={index} className="text-purple-200 text-sm">
                      <strong>{opportunity.classes.join(' + ')}:</strong> {opportunity.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Battle Log */}
            <div className="fantasy-card h-96">
              <h3 className="text-lg font-semibold mb-4 text-yellow-400">Battle Log</h3>
              <div className="space-y-2 h-80 overflow-y-auto">
                {battleLog.length === 0 ? (
                  <p className="text-gray-400 text-sm">No actions recorded yet...</p>
                ) : (
                  battleLog.map((entry) => (
                    <div key={entry.id} className="text-sm border-l-2 border-gray-600 pl-3 py-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-gray-400 text-xs">{entry.timestamp}</span>
                        <span className="text-blue-400 text-xs">R{entry.round} T{entry.turn}</span>
                      </div>
                      <div className={`${
                        entry.type === 'damage' ? 'text-red-400' :
                        entry.type === 'healing' ? 'text-green-400' :
                        entry.type === 'death' ? 'text-red-500 font-semibold' :
                        entry.type === 'status_effect' ? 'text-purple-400' :
                        entry.type === 'action_failed' ? 'text-orange-400' :
                        entry.type === 'error' ? 'text-red-500' :
                        'text-gray-200'
                      }`}>
                        {entry.description}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Main Combat Area */}
          <div className="xl:col-span-2 space-y-6">
            {/* Initiative Order */}
            {combatSession.combatState === 'active' && (
              <div className="fantasy-card">
                <h3 className="font-bold text-gray-100 mb-3">🎯 Turn Order</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {combatSession.combatants.map((combatant) => (
                    <div
                      key={combatant.id}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        combatant.id === combatSession.combatants[combatSession.currentTurn]?.id
                          ? 'border-amber-500 bg-amber-900/20'
                          : 'border-gray-600 bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-100">
                            {combatant.name}
                            {combatant.id === combatSession.combatants[combatSession.currentTurn]?.id && (
                              <span className="ml-2 text-amber-400">← Current Turn</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-300">
                            HP: {combatant.hp}/{combatant.maxHp} | AC: {combatant.ac}
                          </div>
                          {combatant.statusEffects && combatant.statusEffects.length > 0 && (
                            <div className="text-xs text-red-400 mt-1">
                              {combatant.statusEffects.map(effect => effect.type).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          Initiative: {combatant.initiative}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Turn Actions */}
            {combatSession.combatState === 'active' && currentCombatant && (
              <div className="fantasy-card">
                <h3 className="font-bold text-gray-100 mb-3">
                  🎲 {currentCombatant.name}'s Turn
                </h3>
                
                {isCurrentUserTurn() ? (
                  <div className="space-y-4">
                    {/* Available Actions */}
                    <div>
                      <h4 className="font-semibold text-gray-200 mb-2">Available Actions:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableActions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedAction(action)}
                            className={`p-3 rounded-lg border-2 transition-colors text-left ${
                              selectedAction?.type === action.type
                                ? 'border-amber-500 bg-amber-900/20'
                                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                            }`}
                          >
                            <div className="font-medium text-gray-100">{action.name}</div>
                            <div className="text-sm text-gray-300">{action.description}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Priority: {action.priority}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target Selection */}
                    {selectedAction && (
                      <div>
                        <h4 className="font-semibold text-gray-200 mb-2">Select Target:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {combatSession.enemies.map(enemy => (
                            <button
                              key={enemy.id}
                              onClick={() => setSelectedTarget(enemy)}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                selectedTarget?.id === enemy.id
                                  ? 'border-red-500 bg-red-900/20'
                                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-medium text-gray-100">{enemy.name}</div>
                              <div className="text-sm text-gray-300">
                                HP: {enemy.hp}/{enemy.maxHp} | AC: {enemy.ac}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Execute Action */}
                    {selectedAction && selectedTarget && (
                      <div className="text-center">
                        <button
                          onClick={() => executeAction(selectedAction.type, selectedTarget.id)}
                          disabled={processingTurn}
                          className="fantasy-button bg-amber-600 hover:bg-amber-700"
                        >
                          {processingTurn ? 'Executing...' : `Execute ${selectedAction.name}`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <h4 className="font-bold text-blue-300 mb-2">
                      Waiting for {currentCombatant.name} to act
                    </h4>
                    <p className="text-blue-200">
                      {currentCombatant.userId === user?.uid 
                        ? 'It\'s your turn! Please select an action.'
                        : 'Please wait for the current player to make their move.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Results */}
            {actionMessage && (
              <div className="fantasy-card bg-green-900/20 border-green-700">
                <h4 className="font-bold text-green-300 mb-2">Action Result</h4>
                <p className="text-green-200">{actionMessage}</p>
                {narrativeDescription && (
                  <div className="mt-2 p-3 bg-gray-700 border border-green-600 rounded">
                    <p className="text-gray-200 italic">{narrativeDescription}</p>
                  </div>
                )}
              </div>
            )}

            {/* Enemy Turn Animation */}
            {isEnemyTurn && (
              <div className="fantasy-card bg-red-900/20 border-red-700 animate-pulse">
                <div className="text-center">
                  <h4 className="font-bold text-red-300 mb-3 text-xl">🦹 Enemy Turn</h4>
                  {enemyTurnMessage && (
                    <div className="text-red-200 font-bold text-lg mb-3 bg-gray-700 p-3 rounded border border-red-600">
                      {enemyTurnMessage}
                    </div>
                  )}
                  {enemyTurnNarrative && (
                    <div className="mt-3 p-4 bg-gray-700 border border-red-600 rounded">
                      <p className="text-gray-200 italic">{enemyTurnNarrative}</p>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                    <span className="ml-3 text-red-300 font-medium">Enemy is acting...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Proceed After Enemy Turn */}
            {enemyTurnComplete && (
              <div className="fantasy-card bg-blue-900/20 border-blue-700">
                <div className="text-center">
                  <h4 className="font-bold text-blue-300 mb-3 text-xl">✅ Enemy Turn Complete</h4>
                  <p className="text-blue-200 mb-4">
                    {isTestCombat 
                      ? "The enemy has finished their turn. Click 'Confirm' to proceed to the next turn."
                      : "The enemy has finished their turn. All party members must click 'Confirm' to proceed."
                    }
                  </p>
                  
                  {!isTestCombat && (
                    <div className="mb-4 p-3 bg-gray-700 border border-blue-600 rounded">
                      <p className="text-sm text-blue-200">
                        <strong>Ready to continue:</strong> {partyMembersReady.size} / {combatSession?.partyMembers?.filter(m => m.hp > 0).length || 0} party members
                      </p>
                      {partyMembersReady.size > 0 && (
                        <div className="mt-2 text-xs text-blue-300">
                          Waiting for: {combatSession?.partyMembers
                            ?.filter(m => m.hp > 0 && !partyMembersReady.has(m.userId))
                            ?.map(m => m.name)
                            ?.join(', ') || 'None'}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={handleProceedAfterEnemyTurn}
                      disabled={!isTestCombat && partyMembersReady.has(user?.uid)}
                      className={`fantasy-button px-8 py-3 text-lg font-semibold ${
                        !isTestCombat && partyMembersReady.has(user?.uid)
                          ? 'bg-green-700 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                      }`}
                    >
                      {!isTestCombat && partyMembersReady.has(user?.uid) 
                        ? '✓ Ready' 
                        : 'Confirm'
                      }
                    </button>
                    
                    {isTestCombat && (
                      <button
                        onClick={() => {
                          setEnemyTurnComplete(false);
                          setPartyMembersReady(new Set());
                          advanceTurn();
                        }}
                        className="fantasy-button px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        Skip Confirmation
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600 rounded">
                    <p className="text-sm text-yellow-200">
                      <strong>Note:</strong> Review the battle log and enemy actions before continuing to the next turn.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Turn Indicator */}
            {processingTurn && !isEnemyTurn && (
              <div className="fantasy-card bg-amber-900/20 border-amber-700">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  <span className="ml-2 text-amber-300 font-medium">Processing turn...</span>
                </div>
              </div>
            )}

            {/* Fight! Confirmation */}
            {combatSession?.combatState === 'ready' && !combatReady && (
              <div className="fantasy-card bg-red-900/20 border-red-700">
                <div className="text-center">
                  <h4 className="font-bold text-red-300 mb-4 text-2xl">⚔️ Combat Ready!</h4>
                  <p className="text-red-200 mb-6 text-lg">
                    All combatants are in position. Click 'Fight!' to begin the battle.
                  </p>
                  <button
                    onClick={beginCombat}
                    disabled={processingTurn}
                    className="fantasy-button px-12 py-4 text-xl font-bold bg-red-600 hover:bg-red-700 shadow-lg"
                  >
                    {processingTurn ? 'Preparing...' : 'Fight!'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Additional Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* Damage Animation */}
            {showDamageAnimation && damageAnimation && (
              <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className={`animate-bounce text-6xl font-bold px-6 py-4 rounded-lg shadow-lg ${
                  damageAnimation.type === 'healing' 
                    ? 'text-green-400 bg-green-900/80' 
                    : 'text-red-400 bg-red-900/80'
                }`}>
                  {damageAnimation.type === 'healing' ? '+' : '-'}{damageAnimation.damage}
                </div>
              </div>
            )}

            {/* Player Death Screen */}
            {playerDied && deadPlayer && (
              <div className="fantasy-card bg-red-900/20 border-red-700">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">💀</div>
                  <h1 className="text-3xl font-bold text-red-300 mb-4">Character Death</h1>
                  <div className="text-xl text-red-200 mb-6">
                    {deadPlayer.name} has fallen in battle...
                  </div>
                  <div className="bg-gray-700 p-6 rounded-lg border border-red-600 mb-6">
                    <h2 className="text-lg font-semibold text-gray-100 mb-2">Fallen Hero</h2>
                    <p className="text-gray-300 mb-2">
                      <strong>Name:</strong> {deadPlayer.name}
                    </p>
                    <p className="text-gray-300 mb-2">
                      <strong>Class:</strong> {deadPlayer.class}
                    </p>
                    <p className="text-gray-300 mb-2">
                      <strong>Level:</strong> {deadPlayer.level}
                    </p>
                    <p className="text-gray-300">
                      <strong>Final HP:</strong> {deadPlayer.hp}/{deadPlayer.maxHp}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-gray-300">
                      Your character has been defeated. You must create a new character to continue.
                    </p>
                    <button
                      onClick={handlePlayerDeath}
                      className="fantasy-button bg-red-600 hover:bg-red-700"
                    >
                      Create New Character
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 