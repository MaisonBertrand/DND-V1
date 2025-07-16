import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  getCombatSession, 
  updateCombatSession, 
  updateCombatSessionWithNarrative,
  addToCombatBattleLog,
  subscribeToCombatSession,
  updateCampaignStory,
  getPartyCharacters,
  updatePartyCharacterStats,
  getCampaignStory
} from '../firebase/database';
import { combatService } from '../services/combat';
import PlayerDeath from '../components/PlayerDeath';
import CampaignDefeat from '../components/CampaignDefeat';

// Import new components
import CombatHeader from '../components/combat/CombatHeader';
import TurnOrder from '../components/combat/TurnOrder';
import BattleLog from '../components/combat/BattleLog';
import CombatStatus from '../components/combat/CombatStatus';
import ActionSelector from '../components/combat/ActionSelector';

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
  const [campaignDefeated, setCampaignDefeated] = useState(false);
  const [deadCharacters, setDeadCharacters] = useState([]);
  const [combatSummary, setCombatSummary] = useState(null);
  const [story, setStory] = useState(null);
  const [spectating, setSpectating] = useState(false);
  const [lastProcessedTurn, setLastProcessedTurn] = useState(-1);
  const [damageAnimation, setDamageAnimation] = useState(null);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  const [enemyTurnComplete, setEnemyTurnComplete] = useState(false);
  const [partyMembersReady, setPartyMembersReady] = useState(new Set());
  const [battleLog, setBattleLog] = useState([]);
  const [combatReady, setCombatReady] = useState(false);
  
  // Ref to track if subscription is already set up
  const subscriptionRef = useRef(null);
  
  // Check if this is a test combat session
  const isTestCombat = location.state?.isTestCombat;
  const testData = location.state;

  // Auth effect
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

  // Initialize combat data
  useEffect(() => {
    if (isTestCombat && testData) {
      initializeTestCombat();
    } else if (sessionId) {
      const refreshCombatData = async () => {
        await loadCombatData();
      };
      refreshCombatData();
    }
  }, [isTestCombat, testData, sessionId]);

  // Event listeners for help buttons
  useEffect(() => {
    const handleRefreshCombat = async () => {
      await loadCombatData();
    };

    const handleCleanupCombat = async () => {
      if (combatSession?.partyId) {
        await combatService.forceCleanupCombatSessions(combatSession.partyId);
        setTimeout(async () => {
          await loadCombatData();
        }, 1000);
      }
    };

    window.addEventListener('refreshCombatSession', handleRefreshCombat);
    window.addEventListener('cleanupCombatSessions', handleCleanupCombat);

    return () => {
      window.removeEventListener('refreshCombatSession', handleRefreshCombat);
      window.removeEventListener('cleanupCombatSessions', handleCleanupCombat);
    };
  }, [combatSession?.partyId]);

  // Combat session subscription
  useEffect(() => {
    if (sessionId && !isTestCombat) {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      
      const unsubscribe = subscribeToCombatSession(sessionId, (session) => {
        setCombatSession(session);
        setLoading(false);
        
        if (session?.currentTurn !== undefined) {
          if (lastProcessedTurn !== session.currentTurn && !processingTurn) {
            setLastProcessedTurn(session.currentTurn);
          } else if (processingTurn && lastProcessedTurn === session.currentTurn) {
            setLastProcessedTurn(session.currentTurn);
          }
        }
        
        if (session) {
          if (session.battleLog && session.battleLog.length > 0) {
            setBattleLog(session.battleLog);
          }
          
          updateAvailableActions(session);
          setEnvironmentalFeatures(session.environmentalFeatures || []);
          setTeamUpOpportunities(session.teamUpOpportunities || []);
          
          checkPlayerDeath();
        }
      });
      
      subscriptionRef.current = unsubscribe;
      
      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current();
          subscriptionRef.current = null;
        }
      };
    }
  }, [sessionId, isTestCombat]);

  // Enemy turn processing
  useEffect(() => {
    if (combatSession && combatSession.combatState === 'active') {
      const currentCombatant = getCurrentCombatant();
      
      const shouldProcessEnemyTurn = currentCombatant && 
        currentCombatant.id.startsWith('enemy_') && 
        combatSession.currentTurn !== lastProcessedTurn &&
        !processingTurn &&
        !isEnemyTurn;
      
      if (shouldProcessEnemyTurn) {
        const timer = setTimeout(() => {
          processEnemyTurn();
        }, isTestCombat ? 2000 : 1000);
        return () => clearTimeout(timer);
      }
      
      // Safety check for stuck enemy turns
      if (currentCombatant && 
          currentCombatant.id.startsWith('enemy_') && 
          combatSession.currentTurn === lastProcessedTurn &&
          !processingTurn &&
          !isEnemyTurn) {
        setTimeout(() => {
          advanceTurn();
        }, 3000);
      }
    }
  }, [combatSession?.currentTurn, lastProcessedTurn, processingTurn, isEnemyTurn, isTestCombat, combatSession?.combatants]);

  // Enemy turn completion
  useEffect(() => {
    if (combatSession && enemyTurnComplete && areAllPartyMembersReady()) {
      setTimeout(() => {
        setEnemyTurnComplete(false);
        setPartyMembersReady(new Set());
        advanceTurn();
      }, 1000);
    }
  }, [enemyTurnComplete, partyMembersReady.size, combatSession?.partyMembers?.length]);

  // Complex combat logic functions (keeping these in the main component)
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
      
      // Add cache-busting parameter to ensure fresh data
      const cacheBuster = Date.now();
      
      // Load both combat session and story data
      const [session, storyData] = await Promise.all([
        getCombatSession(sessionId),
        getCampaignStory(sessionId)
      ]);
      
      setStory(storyData);
      
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
      
      // Always ensure combatants array is properly constructed
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
      
      // If combat session is in 'initialized' state, automatically initialize it properly
      if (session.combatState === 'initialized') {
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
        // Session is already in a proper state, ensure combatants are set
        const sessionWithCombatants = {
          ...session,
          combatants: combatants
        };
        setCombatSession(sessionWithCombatants);
        updateAvailableActions(sessionWithCombatants);
        setEnvironmentalFeatures(sessionWithCombatants.environmentalFeatures || []);
        setTeamUpOpportunities(sessionWithCombatants.teamUpOpportunities || []);
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

  const addToBattleLog = async (entry) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      round: combatSession?.round || 1,
      turn: combatSession?.currentTurn || 0,
      ...entry
    };
    
    // Update local battle log
    setBattleLog(prev => [...prev, logEntry]);
    
    // Save to database for co-op mode
    if (!isTestCombat && sessionId) {
      try {
        await addToCombatBattleLog(sessionId, logEntry);
      } catch (error) {
        console.error('Failed to save battle log to database:', error);
      }
    }
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
      
      await addToBattleLog({
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
      
      await addToBattleLog({
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

      // Update combat session with results from the combat service
      const resultSession = {
        ...combatSession,
        currentTurn: result.updatedSession.currentTurn,
        round: result.updatedSession.round,
        combatants: result.updatedSession.combatants
      };
      
      if (isTestCombat) {
        setCombatSession(resultSession);
      } else {
        // Only update the specific fields that changed
        const updates = {
          currentTurn: result.updatedSession.currentTurn,
          round: result.updatedSession.round,
          combatants: result.updatedSession.combatants
        };
        await updateCombatSession(sessionId, updates);
      }

      // Add to battle log
      await addToBattleLog({
        type: result.success ? 'action' : 'action_failed',
        description: result.narrative
      });

      // Add damage/healing to battle log if applicable
      if (result.damage > 0 && target) {
        await addToBattleLog({
          type: 'damage',
          description: `${target.name} takes ${result.damage} damage!`
        });
      }

      if (result.healing > 0 && target) {
        await addToBattleLog({
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
      }
      // Note: Don't call advanceTurn() here because the combat service already advanced the turn

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
        // Update combat session with results from the combat service
        const updatedSession = {
          ...combatSession,
          currentTurn: result.updatedSession.currentTurn,
          round: result.updatedSession.round,
          combatants: result.updatedSession.combatants
        };

        if (isTestCombat) {
          setCombatSession(updatedSession);
        } else {
          // Only update the specific fields that changed
          const updates = {
            currentTurn: result.updatedSession.currentTurn,
            round: result.updatedSession.round,
            combatants: result.updatedSession.combatants
          };
          await updateCombatSession(sessionId, updates);
        }

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

        // Update lastProcessedTurn after successful action execution
        setLastProcessedTurn(combatSession.currentTurn);
        
        // Note: Don't call advanceTurn() here because the combat service already advanced the turn

      } else {
        console.error('Enemy action execution failed:', result.error);
        addToBattleLog({
          type: 'action_failed',
          actor: currentCombatant.name,
          action: actionType,
          description: `${currentCombatant.name}'s ${actionType} failed`
        });
        
        // Only advance turn if the action failed and didn't already advance
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

    // Prepare updates - only send the specific fields that need to be updated
    const updates = {
      currentTurn: nextTurn
    };
    
    // Increment round if we've completed a full cycle
    if (nextTurn === 0) {
      updates.round = combatSession.round + 1;
    }
    
    if (isTestCombat) {
      setCombatSession(prevSession => ({
        ...prevSession,
        ...updates
      }));
    } else {
      await updateCombatSession(sessionId, updates);
    }

    // Update lastProcessedTurn to track the new turn
    setLastProcessedTurn(nextTurn);

    // Add turn advancement to battle log
    const nextCombatant = combatSession.combatants[nextTurn];
    if (nextCombatant) {
      await addToBattleLog({
        type: 'turn_advance',
        description: `🎲 ${nextCombatant.name}'s turn begins`
      });
    }

    // Update available actions for the new current combatant
    const updatedSession = {
      ...combatSession,
      ...updates
    };
    updateAvailableActions(updatedSession);
  };

  const handleCampaignDefeat = async () => {
    if (!combatSession || !story) return;
    
    const summary = combatService.generateCombatSummary(combatSession, 'defeat');
    const deadChars = combatSession.partyMembers.filter(member => member.hp <= 0);
    
    setCombatSummary(summary);
    setDeadCharacters(deadChars);
    setCampaignDefeated(true);
    
    // Update combat session and story
    await updateCombatSessionWithNarrative(sessionId, {
      status: 'ended',
      combatState: 'ended',
      summary: summary
    });
    
    await updateCampaignStory(sessionId, {
      status: 'defeated',
      currentCombat: null
    });
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
      
      // Check if any players died during combat
      const deadPlayers = combatSession.partyMembers.filter(member => member.hp <= 0);
      
      if (deadPlayers.length > 0) {
        // Some players died but party won - they need to create new characters
        await updateCampaignStory(sessionId, {
          status: 'storytelling',
          currentCombat: null,
          deadPlayers: deadPlayers.map(player => ({
            userId: player.userId,
            name: player.name,
            class: player.class,
            level: player.level,
            deathCause: 'Combat wounds'
          }))
        });
        
        // Navigate to character creation for dead players
        const currentUserDead = deadPlayers.find(player => player.userId === user?.uid);
        if (currentUserDead) {
          navigate(`/character-creation/${combatSession.partyId}`);
        } else {
          navigate(`/campaign/${sessionId}`);
        }
      } else {
        // No deaths - normal victory
        await updateCampaignStory(sessionId, {
          status: 'storytelling',
          currentCombat: null
        });
        
        navigate(`/campaign/${sessionId}`);
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
    }
  };

  const getCurrentCombatant = (session = combatSession) => {
    if (!session?.combatants || !Array.isArray(session.combatants) || session.currentTurn === undefined) {
      return null;
    }
    return session.combatants[session.currentTurn] || null;
  };

  const isCurrentUserTurn = () => {
    const currentCombatant = getCurrentCombatant();
    return currentCombatant && currentCombatant.userId === user?.uid;
  };

  const getCurrentUserCharacter = () => {
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
      // Player death - they need to wait for combat to end
      // Don't navigate immediately, let them spectate
    }
  };

  const handleSpectateCombat = () => {
    setSpectating(true);
    setPlayerDied(false); // Hide death screen but keep dead player data
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
    if (!combatSession?.partyMembers) return false;
    const aliveMembers = combatSession.partyMembers.filter(m => m.hp > 0);
    return partyMembersReady.size >= aliveMembers.length;
  };

  const getValidTargetsForAction = (actionType) => {
    if (!actionType || !combatSession?.combatants?.length) return [];
    
    const aliveCombatants = combatSession.combatants.filter(c => c.hp > 0);
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

  const safeCombatants = Array.isArray(combatSession?.combatants)
    ? combatSession.combatants
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
  
  // Show campaign defeat screen
  if (campaignDefeated) {
    return (
      <CampaignDefeat 
        story={story}
        deadCharacters={deadCharacters}
        combatSummary={combatSummary}
      />
    );
  }

  // Show individual player death screen
  if (playerDied && deadPlayer && !spectating) {
    return (
      <PlayerDeath 
        deadPlayer={deadPlayer}
        combatSession={combatSession}
        onSpectate={handleSpectateCombat}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="fantasy-container py-4">
        {/* Header */}
        <CombatHeader 
          currentCombatant={currentCombatant}
          combatSession={combatSession}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <TurnOrder 
              combatants={safeCombatants}
              currentTurn={combatSession?.currentTurn}
            />
            <BattleLog battleLog={battleLog} />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {(() => {
              const shouldShowTurnOptions = currentCombatant && safeCombatants.length > 0;
              return shouldShowTurnOptions;
            })() && (
              <ActionSelector
                currentCombatant={currentCombatant}
                availableActions={availableActions}
                selectedAction={selectedAction}
                setSelectedAction={setSelectedAction}
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                getValidTargetsForAction={getValidTargetsForAction}
                executeAction={executeAction}
                processingTurn={processingTurn}
                isCurrentUserTurn={isCurrentUserTurn()}
              />
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

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <CombatStatus 
              combatants={safeCombatants}
              currentCombatant={currentCombatant}
            />

            {/* Environmental Features */}
            {environmentalFeatures.length > 0 && (
              <div className="fantasy-card">
                <h3 className="font-bold text-blue-300 mb-2 text-sm">🌍 Environment</h3>
                <div className="flex flex-wrap gap-1">
                  {environmentalFeatures.map((feature, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Team Up Opportunities */}
            {teamUpOpportunities.length > 0 && (
              <div className="fantasy-card">
                <h3 className="font-bold text-purple-300 mb-2 text-sm">🤝 Team Up</h3>
                <div className="space-y-1">
                  {teamUpOpportunities.map((opportunity, index) => (
                    <div key={index} className="text-purple-200 text-xs">
                      <strong>{opportunity.classes.join('+')}:</strong> {opportunity.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Damage Animation */}
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

            {/* Player Death Overlay */}
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