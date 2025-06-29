import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  updateCombatSessionWithNarrative,
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters,
  updatePartyCharacterStats
} from '../firebase/database';
import { combatService } from '../services/combat';

export default function Combat() {
  const { sessionId } = useParams();
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
      initializeTestCombat();
    } else if (sessionId) {
      loadCombatData();
    }
  }, [isTestCombat, testData, sessionId]);

  useEffect(() => {
    if (sessionId && !isTestCombat) {
      const unsubscribe = subscribeToCombatSession(sessionId, (session) => {
        setCombatSession(session);
        setLoading(false);
        
        if (session) {
          updateAvailableActions(session);
          setEnvironmentalFeatures(session.environmentalFeatures || []);
          setTeamUpOpportunities(session.teamUpOpportunities || []);
          
          checkPlayerDeath();
          
          const currentCombatant = session.combatants?.[session.currentTurn];
          if (currentCombatant && 
              currentCombatant.id.startsWith('enemy_') && 
              session.combatState === 'active' &&
              session.currentTurn !== lastProcessedTurn &&
              !processingTurn &&
              !isEnemyTurn) {
            
            setTimeout(() => {
              processEnemyTurn();
            }, 1000);
          }
        }
      });
      return () => {
        unsubscribe();
      };
    }
  }, [sessionId, lastProcessedTurn, processingTurn, isEnemyTurn, isTestCombat]);

  useEffect(() => {
    if (isTestCombat && combatSession && combatSession.combatState === 'active') {
      const currentCombatant = getCurrentCombatant();
      if (currentCombatant && currentCombatant.id.startsWith('enemy_')) {
        const timer = setTimeout(() => {
          processEnemyTurn();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [combatSession?.currentTurn, isTestCombat]);

  useEffect(() => {
    if (combatSession && enemyTurnComplete && areAllPartyMembersReady()) {
      setTimeout(() => {
        setEnemyTurnComplete(false);
        setPartyMembersReady(new Set());
        advanceTurn();
      }, 1000);
    }
  }, [enemyTurnComplete, partyMembersReady.size, combatSession?.partyMembers?.length]);

  useEffect(() => {
    if (combatSession) {
      updateAvailableActions(combatSession);
    }
  }, [combatSession?.currentTurn, combatSession?.combatState]);

  // Auto-check for combat end conditions
  useEffect(() => {
    if (combatSession && combatSession.combatState === 'active') {
      const partyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
      const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
      
      const partyAlive = partyMembers.some(member => member.hp > 0);
      const enemiesAlive = enemies.some(enemy => enemy.hp > 0);
      
      if (!partyAlive) {
        // Party defeated
        if (isTestCombat) {
          navigate('/test-environment', { 
            state: { 
              ...testData,
              combatResult: 'defeat' 
            } 
          });
        } else {
          endCombat('defeat');
        }
      } else if (!enemiesAlive) {
        // Enemies defeated
        if (isTestCombat) {
          navigate('/test-environment', { 
            state: { 
              ...testData,
              combatResult: 'victory' 
            } 
          });
        } else {
          endCombat('victory');
        }
      }
    }
  }, [combatSession?.combatants, combatSession?.combatState]);

  const initializeTestCombat = async () => {
    try {
      setLoading(true);
      
      const validatedPartyMembers = testData.partyMembers.map(member => {
        if (!member.hp || !member.maxHp || !member.ac) {
          const { class: characterClass, level, constitution, dexterity } = member;
          
          const hitDieSizes = {
            'Barbarian': 12, 'Fighter': 10, 'Paladin': 10, 'Ranger': 10,
            'Cleric': 8, 'Druid': 8, 'Monk': 8, 'Rogue': 8, 'Bard': 8,
            'Sorcerer': 6, 'Warlock': 8, 'Wizard': 6
          };
          const hitDie = hitDieSizes[characterClass] || 8;
          const constitutionMod = Math.floor((constitution - 10) / 2);
          const hp = Math.max(1, (hitDie + constitutionMod) * level);
          
          const baseAC = 10;
          const dexterityMod = Math.floor((dexterity - 10) / 2);
          const classACBonuses = {
            'Barbarian': 3, 'Monk': 2, 'Fighter': 4, 'Paladin': 4, 'Cleric': 4,
            'Ranger': 3, 'Rogue': 2, 'Bard': 2, 'Druid': 2, 'Sorcerer': 0,
            'Warlock': 0, 'Wizard': 0
          };
          const classBonus = classACBonuses[characterClass] || 0;
          const ac = Math.max(10, baseAC + dexterityMod + classBonus);
          
          return {
            ...member,
            hp: hp,
            maxHp: hp,
            ac: ac
          };
        }
        return member;
      });
      
      const testSession = {
        id: 'test_combat_session',
        partyMembers: validatedPartyMembers || [],
        enemies: testData.enemies || [],
        storyContext: testData.storyContext || 'Test combat environment',
        combatState: 'initialized',
        currentTurn: 0,
        combatants: [],
        round: 1
      };

      if (!testSession.enemies || testSession.enemies.length === 0) {
        setCombatSession({ 
          ...testSession, 
          status: 'no_enemies',
          combatState: 'ended'
        });
        setLoading(false);
        return;
      }

      const initializedCombat = combatService.initializeCombat(
        testSession.partyMembers,
        testSession.enemies,
        testSession.storyContext
      );

      const finalSession = {
        ...testSession,
        ...initializedCombat,
        currentTurn: 0,
        combatState: 'active'
      };

      setCombatSession(finalSession);
      setLoading(false);
      
      updateAvailableActions(finalSession);
      setEnvironmentalFeatures(finalSession.environmentalFeatures || []);
      setTeamUpOpportunities(finalSession.teamUpOpportunities || []);
    } catch (error) {
      console.error('Error initializing test combat:', error);
      setLoading(false);
    }
  };

  const loadCombatData = async () => {
    if (!sessionId) {
      return;
    }
    
    try {
      setLoading(true);
      
      const session = await getCombatSession(sessionId);
      
      if (!session) {
        console.error('No combat session found with ID:', sessionId);
        navigate('/dashboard');
        return;
      }
      
      // Use partyId from the session for character operations
      const partyId = session.partyId;
      const characters = await getPartyCharacters(partyId);
      
      // Update character stats if needed (HP/AC calculation)
      try {
        await updatePartyCharacterStats(partyId);
        // Reload characters after stats update
        const updatedCharacters = await getPartyCharacters(partyId);
        setPartyCharacters(updatedCharacters);
      } catch (error) {
        console.warn('Failed to update character stats:', error);
        setPartyCharacters(characters);
      }
    
      // Check if there are enemies to fight
      if (session.enemies && session.enemies.length === 0 && !isTestCombat) {
        // No enemies to fight, show message and redirect
        setCombatSession({ ...session, status: 'no_enemies' });
        return;
      }
      
      // If combat session is in 'initialized' state, automatically initialize it properly
      if (session.combatState === 'initialized') {
        // Create combatants array if it doesn't exist
        let combatants = session.combatants || [];
        
        if (combatants.length === 0) {
          // Combine party members and enemies into combatants
          const partyCombatants = (session.partyMembers || []).map(member => ({
            ...member,
            isEnemy: false,
            userId: member.userId,
            cooldowns: member.cooldowns || {},
            statusEffects: member.statusEffects || [],
            hp: member.hp ?? member.maxHp ?? 10,
            maxHp: member.maxHp ?? member.hp ?? 10,
          }));

          const enemyCombatants = (session.enemies || []).map(enemy => ({
            ...enemy,
            isEnemy: true,
            userId: null,
            cooldowns: enemy.cooldowns || {},
            statusEffects: enemy.statusEffects || [],
            hp: enemy.hp ?? enemy.maxHp ?? 10,
            maxHp: enemy.maxHp ?? enemy.hp ?? 10,
          }));

          combatants = [...partyCombatants, ...enemyCombatants];
        }
        
        // Update the session to be active
        const activeSession = {
          ...session,
          combatants: combatants,
          combatState: 'active',
          currentTurn: 0,
          round: 1
        };
        
        // Update the session in the database
        await updateCombatSession(sessionId, activeSession);
        
        // Set the active session locally
        setCombatSession(activeSession);
        updateAvailableActions(activeSession);
        setEnvironmentalFeatures(activeSession.environmentalFeatures || []);
        setTeamUpOpportunities(activeSession.teamUpOpportunities || []);
      } else {
        // Session is already in a proper state, just set it
        setCombatSession(session);
        updateAvailableActions(session);
        setEnvironmentalFeatures(session.environmentalFeatures || []);
        setTeamUpOpportunities(session.teamUpOpportunities || []);
      }
    } catch (error) {
      console.error('Error loading combat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAvailableActions = (session) => {
    const currentCombatant = getCurrentCombatant(session);
    if (!currentCombatant) {
      return;
    }

    const actions = [];
    const cooldowns = currentCombatant.cooldowns || {};

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

    if (environmentalFeatures.length > 0) {
      actions.push({
        type: 'environmental',
        name: 'Use Environment',
        description: 'Use the environment to your advantage',
        priority: 'normal',
        narrativeTemplate: '{character} uses the {environment} to their advantage!'
      });
    }

    if (teamUpOpportunities.length > 0) {
      actions.push({
        type: 'teamUp',
        name: 'Team Up',
        description: 'Coordinate with another party member',
        priority: 'high',
        narrativeTemplate: '{character} coordinates with {ally} for a powerful combination!'
      });
    }

    setAvailableActions(actions);
  };

  const addToBattleLog = (entry) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        await updateCombatSession(sessionId, updatedSession);
      }
      
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
        await updateCombatSession(sessionId, updatedSession);
      }
      
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
    if (!combatSession || !isCurrentUserTurn()) return;
    
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
        await updateCombatSession(sessionId, updatedSession);
      }
      
      // Add combat start entry to battle log
      addToBattleLog({
        type: 'combat_start',
        description: 'Combat begins!'
      });
      
      // Add combat begin entry to battle log
      addToBattleLog({
        type: 'combat_begin',
        description: 'The battle is joined!'
      });

      // Execute the action
      const currentCombatant = getCurrentCombatant();
      const target = combatSession.combatants.find(c => c.id === targetId);
      
      const result = await combatService.executeAction(
        combatSession,
        currentCombatant.id,
        actionType,
        targetId,
        additionalData
      );

      // Update combat session with results
      const resultSession = {
        ...combatSession,
        currentTurn: result.updatedSession.currentTurn,
        round: result.updatedSession.round,
        combatants: result.updatedSession.combatants
      };

      if (isTestCombat) {
        setCombatSession(resultSession);
      } else {
        await updateCombatSession(sessionId, resultSession);
      }

      // Add to battle log
      addToBattleLog({
        type: result.success ? 'action' : 'action_failed',
        description: result.narrative
      });

      // Add damage/healing to battle log if applicable
      if (result.damage > 0 && target) {
        addToBattleLog({
          type: 'damage',
          description: `${target.name} takes ${result.damage} damage!`
        });
      }

      if (result.healing > 0 && target) {
        addToBattleLog({
          type: 'healing',
          description: `${target.name} is healed for ${result.healing} HP!`
        });
      }

      // Show action result
      setActionMessage(result.narrative);
      if (result.description) {
        setNarrativeDescription(result.description);
      }

      // Check if combat ended
      const combatResult = combatService.checkCombatEnd(resultSession);
      if (combatResult.ended) {
        if (isTestCombat) {
          navigate('/test-environment', { 
            state: { 
              ...testData,
              combatResult: combatResult.result 
            } 
          });
        } else {
          await endCombat(combatResult.result);
        }
        return;
      }

      // If it was an enemy turn, show enemy turn UI
      if (currentCombatant.id.startsWith('enemy_')) {
        setEnemyTurnComplete(true);
        setEnemyTurnMessage(result.narrative);
        setEnemyTurnNarrative(result.description);
      } else {
        // Player turn - advance to next turn
        advanceTurn();
      }

      // Show damage animation
      if (result.damage > 0 && target) {
        setDamageAnimation({
          targetId: target.id,
          damage: result.damage,
          type: 'damage'
        });
        setShowDamageAnimation(true);
        setTimeout(() => setShowDamageAnimation(false), 2000);
      }

      // Show healing animation
      if (result.healing > 0 && target) {
        setDamageAnimation({
          targetId: target.id,
          healing: result.healing,
          type: 'healing'
        });
        setShowDamageAnimation(true);
        setTimeout(() => setShowDamageAnimation(false), 2000);
      }

      // Clear selections after action
      setSelectedAction(null);
      setSelectedTarget(null);
    } catch (error) {
      console.error('Error executing action:', error);
      addToBattleLog({
        type: 'error',
        description: 'An error occurred while executing the action.'
      });
    } finally {
      setProcessingTurn(false);
    }
  };

  const processEnemyTurn = async () => {
    if (!combatSession || combatSession.combatState !== 'active') {
      return;
    }
    
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant || !currentCombatant.id.startsWith('enemy_')) {
      return;
    }
    
    try {
    setProcessingTurn(true);
      setIsEnemyTurn(true);

      addToBattleLog({
        type: 'turn_start',
        actor: currentCombatant.name,
        description: `${currentCombatant.name}'s turn begins`
      });

      const selectedAction = combatService.chooseEnemyAction(currentCombatant, combatSession);
      if (!selectedAction) {
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      const actionType = selectedAction.action;
      const targetId = selectedAction.target;

      if (!actionType) {
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      const target = combatSession.combatants.find(c => c.id === targetId);
      if (!target && actionType !== 'defend') {
        setTimeout(() => {
          advanceTurn();
        }, 1000);
        return;
      }

      addToBattleLog({
        type: 'action',
        actor: currentCombatant.name,
        action: actionType,
        target: target?.name || 'self',
        description: `${currentCombatant.name} uses ${actionType}${target ? ` on ${target.name}` : ''}`
      });

      const result = await combatService.executeAction(
        combatSession,
        currentCombatant.id,
        actionType,
        targetId,
        selectedAction
      );

      if (result.success) {
        const updatedSession = {
          ...combatSession,
          ...(result.updatedSession || {}),
          currentTurn: (result.updatedSession?.currentTurn !== undefined) 
            ? result.updatedSession.currentTurn 
            : combatSession.currentTurn
        };

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

        if (result.targetDied) {
          addToBattleLog({
            type: 'death',
            actor: currentCombatant.name,
            target: target?.name || 'self',
            description: `${target?.name || 'self'} has been defeated!`
          });
        }

        setCombatSession(updatedSession);

        if (result.damage && target) {
          setDamageAnimation({
            targetId: target.id,
            damage: result.damage,
            type: 'damage'
          });
          setShowDamageAnimation(true);
          setTimeout(() => setShowDamageAnimation(false), 2000);
        }

        if (result.healing && target) {
          setDamageAnimation({
            targetId: target.id,
            damage: result.healing,
            type: 'healing'
          });
          setShowDamageAnimation(true);
          setTimeout(() => setShowDamageAnimation(false), 2000);
        }

        const narrative = combatService.generateActionNarrative(
          currentCombatant,
          actionType,
          target,
          selectedAction
        );

        setEnemyTurnMessage(`${currentCombatant.name} uses ${actionType}!`);
        setEnemyTurnNarrative(narrative);

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
            await endCombat(result.combatResult);
          }
          return;
        }

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
            await endCombat('defeat');
          }
          return;
        }

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
      return;
    }

    // Check for combat end conditions first
    const partyMembers = combatSession.combatants.filter(c => !c.id.startsWith('enemy_'));
    const enemies = combatSession.combatants.filter(c => c.id.startsWith('enemy_'));
    
    const partyAlive = partyMembers.some(member => member.hp > 0);
    const enemiesAlive = enemies.some(enemy => enemy.hp > 0);
    
    if (!partyAlive) {
      // Party defeated
      if (isTestCombat) {
        navigate('/test-environment', { 
          state: { 
            ...testData,
            combatResult: 'defeat' 
          } 
        });
      } else {
        await endCombat('defeat');
      }
      return;
    }
    
    if (!enemiesAlive) {
      // Enemies defeated
      if (isTestCombat) {
        navigate('/test-environment', { 
          state: { 
            ...testData,
            combatResult: 'victory' 
          } 
        });
      } else {
        await endCombat('victory');
      }
      return;
    }

    // Find next alive combatant
    let nextTurn = (combatSession.currentTurn + 1) % combatSession.combatants.length;
    let attempts = 0;
    const maxAttempts = combatSession.combatants.length;

    while (attempts < maxAttempts) {
      const nextCombatant = combatSession.combatants[nextTurn];
      
      if (nextCombatant && nextCombatant.hp > 0) {
        break;
      }
      
      nextTurn = (nextTurn + 1) % combatSession.combatants.length;
      attempts++;
    }

    // If we've checked all combatants and none are alive, end combat
    if (attempts >= maxAttempts) {
      if (isTestCombat) {
        navigate('/test-environment', { 
          state: { 
            ...testData,
            combatResult: 'draw' 
          } 
        });
      } else {
        await endCombat('draw');
      }
      return;
    }

    // Update session with new turn
    const updatedSession = {
      ...combatSession,
      currentTurn: nextTurn
    };
    
    // Increment round if we've completed a full cycle
    if (nextTurn === 0) {
      updatedSession.round = combatSession.round + 1;
    }
    
    if (isTestCombat) {
      setCombatSession(updatedSession);
    } else {
      await updateCombatSession(sessionId, updatedSession);
    }

    // Update available actions for the new current combatant
    updateAvailableActions(updatedSession);
  };

  const endCombat = async (result = 'victory') => {
    if (!combatSession) return;
    
    const summary = combatService.generateCombatSummary(combatSession, result);
    
    if (isTestCombat) {
      setCombatSession(prevSession => ({
        ...prevSession,
        status: 'ended',
        combatState: 'ended',
        summary: summary
      }));
      
      navigate('/test-environment');
    } else {
      await updateCombatSessionWithNarrative(sessionId, {
        status: 'ended',
        combatState: 'ended',
        summary: summary
      });
      
      await updateCampaignStory(sessionId, {
        status: 'storytelling',
        currentCombat: null
      });
      
      navigate(`/campaign/${sessionId}`);
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
        setCombatSession(prevSession => ({
          ...prevSession,
          enemies: updatedEnemies,
          combatants: updatedCombatants
        }));
      } else {
        await updateCombatSessionWithNarrative(sessionId, {
          enemies: updatedEnemies,
          combatants: updatedCombatants
        });
      }
      
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
        setCombatSession(prevSession => ({
          ...prevSession,
          partyMembers: updatedPartyMembers,
          combatants: updatedCombatants
        }));
      } else {
        await updateCombatSessionWithNarrative(sessionId, {
          partyMembers: updatedPartyMembers,
          combatants: updatedCombatants
        });
      }
      
      setCombatSession(prevSession => ({
        ...prevSession,
        partyMembers: updatedPartyMembers,
        combatants: updatedCombatants
      }));
    }
  };

  const getCurrentCombatant = (session = combatSession) => {
    if (!session) {
      return null;
    }

    const combatants = session.combatants || [];
    const currentTurn = session.currentTurn || 0;

    if (combatants.length === 0 || currentTurn >= combatants.length) {
      return null;
    }

    return combatants[currentTurn];
  };

  const isCurrentUserTurn = () => {
    const currentCombatant = getCurrentCombatant();
    if (!currentCombatant) return false;
    
    if (isTestCombat) {
      const result = !currentCombatant.isEnemy;
      return result;
    }
    
    const result = currentCombatant.userId === user?.uid;
    return result;
  };

  const getCurrentUserCharacter = () => {
    if (isTestCombat) {
      const currentCombatant = getCurrentCombatant();
      if (currentCombatant && !currentCombatant.isEnemy) {
        return currentCombatant;
      }
      return null;
    }
    
    return partyCharacters.find(char => char.userId === user?.uid);
  };

  const checkPlayerDeath = () => {
    if (!combatSession) return;
    
    if (isTestCombat) {
      const testCharacter = combatSession.combatants.find(c => !c.isEnemy);
      if (testCharacter && testCharacter.hp <= 0) {
        setPlayerDied(true);
        setDeadPlayer(testCharacter);
      }
    } else if (user) {
      const currentPlayer = combatSession.partyMembers.find(p => p.userId === user.uid) ||
                           combatSession.combatants.find(c => c.userId === user.uid && !c.isEnemy);
      if (currentPlayer && currentPlayer.hp <= 0) {
        setPlayerDied(true);
        setDeadPlayer(currentPlayer);
      }
    }
  };

  const handlePlayerDeath = () => {
    if (isTestCombat) {
      navigate('/dashboard');
    } else {
      const partyId = combatSession?.partyId;
      navigate(`/character-creation/${partyId}`);
    }
  };

  const handleProceedAfterEnemyTurn = () => {
    if (isTestCombat) {
      setEnemyTurnComplete(false);
      setPartyMembersReady(new Set());
      advanceTurn();
    } else {
      const currentUserId = user?.uid;
      if (currentUserId) {
        setPartyMembersReady(prev => new Set([...prev, currentUserId]));
      }
    }
  };

  const areAllPartyMembersReady = () => {
    if (isTestCombat) {
      return true;
    }
    
    if (!combatSession?.partyMembers) return false;
    
    const alivePartyMembers = combatSession.partyMembers.filter(member => member.hp > 0);
    const readyMembers = partyMembersReady.size;
    
    return readyMembers >= alivePartyMembers.length;
  };

  const safeCombatants = Array.isArray(combatSession?.combatants)
    ? combatSession.combatants
    : Array.isArray(combatSession?.partyMembers) && Array.isArray(combatSession?.enemies)
      ? [
          ...combatSession.partyMembers.map(member => ({
            ...member,
            isEnemy: false,
            userId: member.userId,
            cooldowns: member.cooldowns || {},
            statusEffects: member.statusEffects || [],
            hp: member.hp ?? member.maxHp ?? 1,
            maxHp: member.maxHp ?? member.hp ?? 1,
          })),
          ...combatSession.enemies.map(enemy => ({
            ...enemy,
            isEnemy: true,
            userId: null,
            cooldowns: enemy.cooldowns || {},
            statusEffects: enemy.statusEffects || [],
            hp: enemy.hp ?? enemy.maxHp ?? 1,
            maxHp: enemy.maxHp ?? enemy.hp ?? 1,
          }))
        ]
      : [];

  const getValidTargetsForAction = (actionType) => {
    if (!actionType || !safeCombatants.length) return [];
    
    const aliveCombatants = safeCombatants.filter(c => c.hp > 0);
    const currentCombatant = getCurrentCombatant();
    
    if (!currentCombatant) return [];
    
    const isPlayer = !currentCombatant.id.startsWith('enemy_');
    
    switch (actionType) {
      case 'attack':
      case 'spell':
      case 'special':
        if (isPlayer) {
          return aliveCombatants.filter(c => c.id.startsWith('enemy_'));
        } else {
          return aliveCombatants.filter(c => !c.id.startsWith('enemy_'));
        }
        
      case 'heal':
      case 'item':
        if (isPlayer) {
          return aliveCombatants.filter(c => !c.id.startsWith('enemy_') && c.id !== currentCombatant.id);
        } else {
          return aliveCombatants.filter(c => c.id.startsWith('enemy_') && c.id !== currentCombatant.id);
        }
        
      case 'defend':
      case 'environmental':
        return [currentCombatant];
        
      case 'teamUp':
        if (isPlayer) {
          return aliveCombatants.filter(c => !c.id.startsWith('enemy_') && c.id !== currentCombatant.id);
        } else {
          return aliveCombatants.filter(c => c.id.startsWith('enemy_') && c.id !== currentCombatant.id);
        }
        
      default:
        return aliveCombatants;
    }
  };

  const safeEnemies = Array.isArray(combatSession?.enemies)
    ? combatSession.enemies
    : [];

  if (!user) {
    return null;
  }

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

  if ((combatSession.status === 'no_enemies' || (safeEnemies.length === 0)) && !isTestCombat) {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="fantasy-title mb-0">⚔️ Combat Arena</h1>
        </div>

        {combatSession.storyContext && (
          <div className="fantasy-card mb-6">
            <h3 className="font-bold text-gray-100 mb-2">Story Context</h3>
            <p className="text-gray-300 italic text-sm">{combatSession.storyContext}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-1 space-y-6">
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

            <div className="fantasy-card">
              <h3 className="font-bold text-gray-100 mb-3">Combat Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-300 mb-2">Party Members</h4>
                  <div className="space-y-2">
                    {safeCombatants.filter(c => !c.id.startsWith('enemy_')).map(combatant => (
                      <div key={combatant.id} className={`p-2 rounded border ${
                        combatant.hp <= 0 ? 'bg-red-900/20 border-red-600' :
                        combatant.hp < combatant.maxHp * 0.5 ? 'bg-yellow-900/20 border-yellow-600' :
                        'bg-blue-900/20 border-blue-600'
                      } ${currentCombatant?.id === combatant.id ? 'ring-2 ring-amber-400' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-100">
                            {combatant.name}
                            {currentCombatant?.id === combatant.id && (
                              <span className="ml-2 text-amber-400">🎲</span>
                            )}
                          </span>
                          <span className={`text-sm ${
                            combatant.hp <= 0 ? 'text-red-400' :
                            combatant.hp < combatant.maxHp * 0.5 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {combatant.hp}/{combatant.maxHp} HP
                          </span>
                        </div>
                        {combatant.hp <= 0 && (
                          <div className="text-xs text-red-400 mt-1">💀 Defeated</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-red-300 mb-2">Enemies</h4>
                  <div className="space-y-2">
                    {safeCombatants.filter(c => c.id.startsWith('enemy_')).map(combatant => (
                      <div key={combatant.id} className={`p-2 rounded border ${
                        combatant.hp <= 0 ? 'bg-red-900/20 border-red-600' :
                        combatant.hp < combatant.maxHp * 0.5 ? 'bg-yellow-900/20 border-yellow-600' :
                        'bg-red-900/20 border-red-600'
                      } ${currentCombatant?.id === combatant.id ? 'ring-2 ring-amber-400' : ''}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-100">
                            {combatant.name}
                            {currentCombatant?.id === combatant.id && (
                              <span className="ml-2 text-amber-400">🎲</span>
                            )}
                          </span>
                          <span className={`text-sm ${
                            combatant.hp <= 0 ? 'text-red-400' :
                            combatant.hp < combatant.maxHp * 0.5 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {combatant.hp}/{combatant.maxHp} HP
                          </span>
                        </div>
                        {combatant.hp <= 0 && (
                          <div className="text-xs text-red-400 mt-1">💀 Defeated</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
          </div>

          <div className="xl:col-span-2 space-y-6">
            {(() => {
              const shouldShowTurnOptions = currentCombatant && safeCombatants.length > 0;
              return shouldShowTurnOptions;
            })() && (
              <div className="fantasy-card">
                <h3 className="font-bold text-gray-100 mb-3">
                  🎲 {currentCombatant.name}'s Turn
                </h3>
                
                {isCurrentUserTurn() ? (
                  <div className="space-y-4">
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

                    {selectedAction && (
                      <div>
                        <h4 className="font-semibold text-gray-200 mb-2">Select Target:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {getValidTargetsForAction(selectedAction.type).map(target => (
                            <button
                              key={target.id}
                              onClick={() => setSelectedTarget(target)}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                selectedTarget?.id === target.id
                                  ? 'border-red-500 bg-red-900/20'
                                  : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-medium text-gray-100">{target.name}</div>
                              <div className="text-sm text-gray-300">
                                HP: {target.hp}/{target.maxHp} | AC: {target.ac}
                              </div>
                              <div className="text-xs text-gray-400">
                                {target.id.startsWith('enemy_') ? 'Enemy' : 'Ally'}
                              </div>
                            </button>
                          ))}
                        </div>
                        {getValidTargetsForAction(selectedAction.type).length === 0 && (
                          <div className="text-center p-4 bg-gray-700 border border-gray-600 rounded">
                            <p className="text-gray-300">No valid targets for this action.</p>
                          </div>
                        )}
                      </div>
                    )}

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

            {(!safeCombatants.length || !safeEnemies.length) && (
              <div className="fantasy-card bg-gray-800 border-gray-600">
                <h3 className="font-bold text-gray-100 mb-3">Combat Status</h3>
                <div className="text-gray-300 space-y-2">
                  <p><strong>Combat State:</strong> {combatSession.combatState}</p>
                  <p><strong>Combatants:</strong> {safeCombatants.length}</p>
                  <p><strong>Enemies:</strong> {safeEnemies.length}</p>
                  <p><strong>Current Turn:</strong> {combatSession.currentTurn}</p>
                  {combatSession.combatState === 'preparation' && (
                    <button 
                      onClick={startCombat}
                      className="fantasy-button bg-yellow-600 hover:bg-yellow-700 mt-4"
                    >
                      Start Combat
                    </button>
                  )}
                </div>
              </div>
            )}

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

            {processingTurn && !isEnemyTurn && (
              <div className="fantasy-card bg-amber-900/20 border-amber-700">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                  <span className="ml-2 text-amber-300 font-medium">Processing turn...</span>
                </div>
              </div>
            )}

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

          <div className="xl:col-span-1 space-y-6">
            {safeCombatants.length > 0 && (
              <div className="fantasy-card">
                <h3 className="font-bold text-gray-100 mb-3">🎯 Turn Order</h3>
                <div className="space-y-2">
                  {safeCombatants.map((combatant) => (
                    <div
                      key={combatant.id}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        combatant.id === safeCombatants[combatSession.currentTurn]?.id
                          ? 'border-amber-500 bg-amber-900/20'
                          : combatant.hp <= 0
                          ? 'border-red-600 bg-red-900/20 opacity-50'
                          : 'border-gray-600 bg-gray-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-100">
                            {combatant.name}
                            {combatant.id === safeCombatants[combatSession.currentTurn]?.id && (
                              <span className="ml-2 text-amber-400">← Current Turn</span>
                            )}
                            {combatant.hp <= 0 && (
                              <span className="ml-2 text-red-400">💀 Defeated</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            Initiative: {combatant.initiative || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            combatant.hp <= 0 ? 'text-red-400' :
                            combatant.hp < combatant.maxHp * 0.5 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {combatant.hp}/{combatant.maxHp} HP
                          </div>
                          <div className="text-xs text-gray-500">
                            AC: {combatant.ac || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showDamageAnimation && damageAnimation && (
              <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
                <div className={`text-6xl font-bold animate-bounce px-6 py-4 rounded-lg shadow-lg ${
                  damageAnimation.type === 'damage' 
                    ? 'text-red-400 bg-red-900/80' 
                    : 'text-green-400 bg-green-900/80'
                }`}>
                  {damageAnimation.type === 'damage' ? '-' : '+'}{damageAnimation.damage}
                </div>
              </div>
            )}

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