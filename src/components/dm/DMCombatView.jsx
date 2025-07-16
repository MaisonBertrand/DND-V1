import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { manualCombatService, manualMonsters } from '../../services/manualCombat';
import { dmToolsService } from '../../services/dmTools';
import { getCampaignStory, updateCampaignStory } from '../../firebase/database';
import DiceRollModal from '../combat/DiceRollModal';

const DMCombatView = React.memo(function DMCombatView({ partyId, partyCharacters, onCombatStart }) {
  // Only log when component actually mounts/unmounts, not on every render
  useEffect(() => {
    console.log('DMCombatView: Component mounted for partyId:', partyId);
    return () => {
      console.log('DMCombatView: Component unmounted for partyId:', partyId);
    };
  }, [partyId]);
  
  const [selectedEnemies, setSelectedEnemies] = useState([]);
  const [combatGrid, setCombatGrid] = useState([]);
  const [gridSize, setGridSize] = useState({ width: 12, height: 8 });
  const [selectedCombatant, setSelectedCombatant] = useState(null);
  const [draggedCombatant, setDraggedCombatant] = useState(null);
  const [combatState, setCombatState] = useState('setup'); // 'setup', 'initiative', 'active'
  const [initiativeOrder, setInitiativeOrder] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Combat action states
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const [validTargets, setValidTargets] = useState([]);
  const [lastCombatResult, setLastCombatResult] = useState(null);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [setupLoaded, setSetupLoaded] = useState(false);

  // Initialize combat grid
  useEffect(() => {
    initializeCombatGrid();
  }, [gridSize]);

  // Load saved combat setup when component mounts - only once
  useEffect(() => {
    if (!partyId || setupLoaded) return;
    
    const loadSavedCombatSetup = async () => {
      try {
        console.log('DMCombatView: Loading saved combat setup for partyId:', partyId);
        const savedSetup = await manualCombatService.getCombatSetup(partyId);
        if (savedSetup) {
          console.log('DMCombatView: Loading saved combat setup:', savedSetup);
          
          // Restore grid size
          if (savedSetup.gridSize) {
            setGridSize(savedSetup.gridSize);
          }
          
          // Restore combat state
          if (savedSetup.combatState) {
            setCombatState(savedSetup.combatState);
          }
          
          // Restore initiative order and turn if combat is active
          if (savedSetup.combatState === 'active') {
            if (savedSetup.initiativeOrder) {
              setInitiativeOrder(savedSetup.initiativeOrder);
            }
            if (savedSetup.currentTurn !== undefined) {
              setCurrentTurn(savedSetup.currentTurn);
            }
            if (savedSetup.round) {
              setRound(savedSetup.round);
            }
          }
          
          // Restore enemies
          if (savedSetup.combatants) {
            const enemies = savedSetup.combatants.filter(c => c.type === 'enemy');
            setSelectedEnemies(enemies);
            
            // Restore combat grid
            const newGrid = [];
            for (let y = 0; y < (savedSetup.gridSize?.height || gridSize.height); y++) {
              const row = [];
              for (let x = 0; x < (savedSetup.gridSize?.width || gridSize.width); x++) {
                row.push({
                  x,
                  y,
                  combatant: null,
                  type: 'empty'
                });
              }
              newGrid.push(row);
            }
            
            // Place all combatants on the grid
            savedSetup.combatants.forEach(combatant => {
              if (combatant.position && combatant.position.x !== undefined && combatant.position.y !== undefined) {
                const x = combatant.position.x;
                const y = combatant.position.y;
                if (x >= 0 && x < newGrid[0].length && y >= 0 && y < newGrid.length) {
                  newGrid[y][x] = {
                    x,
                    y,
                    combatant: combatant,
                    type: combatant.type
                  };
                }
              }
            });
            
            console.log('DMCombatView: Restored combat grid with combatants:', savedSetup.combatants.length);
            setCombatGrid(newGrid);
          }
        }
        
        // Mark setup as loaded to prevent multiple loads
        setSetupLoaded(true);
      } catch (error) {
        console.error('Error loading saved combat setup:', error);
        setSetupLoaded(true); // Mark as loaded even on error to prevent infinite retries
      }
    };
    
    loadSavedCombatSetup();
  }, [partyId, setupLoaded]); // Added setupLoaded to dependencies

  // Listen to campaign story changes for real-time updates
  useEffect(() => {
    if (!partyId || !setupLoaded) return;
    
    console.log('DMCombatView: Setting up campaign story listener for partyId:', partyId);
    let unsubscribe = null;
    
    try {
      unsubscribe = dmToolsService.listenToCampaignStory(partyId, (campaignStory) => {
        if (campaignStory && campaignStory.combat) {
          console.log('DMCombatView: Received campaign story update with combat data:', campaignStory.combat);
          
          // Update combat state if it exists
          if (campaignStory.combat.active) {
            setCombatState('active');
            setInitiativeOrder(campaignStory.combat.initiativeOrder || []);
            setCurrentTurn(campaignStory.combat.currentTurn || 0);
            setRound(campaignStory.combat.round || 1);
            
            // Update grid with new positions
            if (campaignStory.combat.initiativeOrder && campaignStory.combat.initiativeOrder.length > 0) {
              const newGrid = [];
              for (let y = 0; y < gridSize.height; y++) {
                const row = [];
                for (let x = 0; x < gridSize.width; x++) {
                  row.push({
                    x,
                    y,
                    combatant: null,
                    type: 'empty'
                  });
                }
                newGrid.push(row);
              }
              
              // Place all combatants on the grid
              campaignStory.combat.initiativeOrder.forEach(combatant => {
                if (combatant.position && combatant.position.x !== undefined && combatant.position.y !== undefined) {
                  const x = combatant.position.x;
                  const y = combatant.position.y;
                  if (x >= 0 && x < newGrid[0].length && y >= 0 && y < newGrid.length) {
                    newGrid[y][x] = {
                      x,
                      y,
                      combatant: combatant,
                      type: combatant.type
                    };
                  }
                }
              });
              
              setCombatGrid(newGrid);
              
              // Update selected enemies
              const enemies = campaignStory.combat.initiativeOrder.filter(c => c.type === 'enemy');
              setSelectedEnemies(enemies);
            }
          }
        }
      });
    } catch (error) {
      console.error('DMCombatView: Error setting up campaign story listener:', error);
    }
    
    return () => {
      console.log('DMCombatView: Cleaning up campaign story listener for partyId:', partyId);
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [partyId, setupLoaded]); // Added setupLoaded dependency

  // Listen to combat state changes - always listen when component is mounted
  useEffect(() => {
    if (!partyId || !setupLoaded) return;
    
    console.log('DMCombatView: Setting up combat state listener for partyId:', partyId);
    let unsubscribe = null;
    
    try {
      unsubscribe = manualCombatService.listenToCombatState(partyId, (combatData) => {
        console.log('DMCombatView: Received combat state update:', combatData);
        if (combatData) {
          // Handle the combat data structure from the service
          setInitiativeOrder(combatData.initiativeOrder || []);
          setCurrentTurn(combatData.currentTurn || 0);
          setRound(combatData.round || 1);
          setCombatState(combatData.active ? 'active' : 'setup');
          
          // Update combat grid with new positions
          if (combatData.initiativeOrder && combatData.initiativeOrder.length > 0) {
            const newGrid = [];
            for (let y = 0; y < gridSize.height; y++) {
              const row = [];
              for (let x = 0; x < gridSize.width; x++) {
                row.push({
                  x,
                  y,
                  combatant: null,
                  type: 'empty'
                });
              }
              newGrid.push(row);
            }
            
            // Place all combatants on the grid
            combatData.initiativeOrder.forEach(combatant => {
              if (combatant.position && combatant.position.x !== undefined && combatant.position.y !== undefined) {
                const x = combatant.position.x;
                const y = combatant.position.y;
                if (x >= 0 && x < newGrid[0].length && y >= 0 && y < newGrid.length) {
                  newGrid[y][x] = {
                    x,
                    y,
                    combatant: combatant,
                    type: combatant.type
                  };
                }
              }
            });
            
            setCombatGrid(newGrid);
            
            // Update selected enemies
            const enemies = combatData.initiativeOrder.filter(c => c.type === 'enemy');
            setSelectedEnemies(enemies);
          }
        }
      });
    } catch (error) {
      console.error('DMCombatView: Error setting up combat state listener:', error);
    }
    
    return () => {
      console.log('DMCombatView: Cleaning up combat state listener for partyId:', partyId);
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [partyId, setupLoaded]); // Added setupLoaded dependency

  // Save combat state whenever important state changes - with better debouncing
  useEffect(() => {
    const saveState = async () => {
      if (partyId && (selectedEnemies.length > 0 || combatState !== 'setup')) {
        console.log('DMCombatView: Saving combat state to database');
        await saveCombatStateToDatabase();
      }
    };
    
    // Debounce the save to avoid too many database writes
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [selectedEnemies, combatState, initiativeOrder, currentTurn, round, partyId]); // Removed combatGrid from dependencies to prevent excessive saves



  // Update available actions and targets when turn changes
  useEffect(() => {
    if (combatState === 'active' && initiativeOrder.length > 0) {
      const currentCombatant = initiativeOrder[currentTurn];
      if (currentCombatant) {
        // Add a small delay to ensure database state is synchronized
        const timeoutId = setTimeout(() => {
          updateCombatOptions(currentCombatant.id);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentTurn, initiativeOrder, combatState]);

  const initializeCombatGrid = () => {
    const grid = [];
    for (let y = 0; y < gridSize.height; y++) {
      const row = [];
      for (let x = 0; x < gridSize.width; x++) {
        row.push({
          x,
          y,
          combatant: null,
          type: 'empty'
        });
      }
      grid.push(row);
    }
    setCombatGrid(grid);
  };

  const addEnemy = useCallback((monster) => {
    const newEnemy = manualCombatService.createEnemyFromMonster(monster);
    setSelectedEnemies(prev => [...prev, newEnemy]);
  }, []);

  const removeEnemy = useCallback((enemyId) => {
    setSelectedEnemies(prev => prev.filter(e => e.id !== enemyId));
    // Remove from grid
    setCombatGrid(prev => prev.map(row => 
      row.map(cell => 
        cell.combatant?.id === enemyId ? { ...cell, combatant: null, type: 'empty' } : cell
      )
    ));
  }, []);

  const placeCombatant = async (combatant, x, y) => {
    if (x < 0 || x >= gridSize.width || y < 0 || y >= gridSize.height) return;
    
    // Remove from previous position
    setCombatGrid(prev => prev.map(row => 
      row.map(cell => 
        cell.combatant?.id === combatant.id ? { ...cell, combatant: null, type: 'empty' } : cell
      )
    ));

    // Place in new position
    setCombatGrid(prev => prev.map((row, rowY) => 
      row.map((cell, colX) => 
        colX === x && rowY === y ? { ...cell, combatant, type: combatant.type } : cell
      )
    ));

    // Update combatant position
    if (combatant.type === 'enemy') {
      setSelectedEnemies(prev => prev.map(e => 
        e.id === combatant.id ? { ...e, position: { x, y } } : e
      ));
    }

    // Save combat state to database for real-time updates
    await saveCombatStateToDatabase();
  };

  const saveCombatStateToDatabase = async () => {
    try {
      // Get all positioned combatants
      const positionedCombatants = [];
      
      // Add player characters
      partyCharacters.forEach(char => {
        const position = findCombatantPosition(char.id);
        if (position) {
          positionedCombatants.push({
            id: char.userId || char.id || '', // Use userId for player identification
            name: char.name || '',
            type: 'player',
            initiativeModifier: Math.floor(((char.dexterity || 10) - 10) / 2),
            position: position,
            hp: char.hp || 0,
            maxHp: char.maxHp || 0,
            ac: char.ac || 10,
            spells: char.spells || [],
            character: {
              id: char.id || '',
              name: char.name || '',
              dexterity: char.dexterity || 10,
              hp: char.hp || 0,
              maxHp: char.maxHp || 0,
              ac: char.ac || 10,
              spells: char.spells || []
            }
          });
        }
      });

      // Add enemies
      selectedEnemies.forEach(enemy => {
        if (enemy.position) {
          positionedCombatants.push({
            id: enemy.id || '',
            name: enemy.name || '',
            type: 'enemy',
            initiativeModifier: enemy.initiativeModifier || 0,
            position: enemy.position,
            hp: enemy.hp || 0,
            maxHp: enemy.maxHp || 0,
            ac: enemy.ac || 10,
            spells: enemy.spells || [],
            monster: enemy.monster ? {
              name: enemy.monster.name || '',
              hp: enemy.monster.hp || '1d8',
              ac: enemy.monster.ac || 10,
              stats: enemy.monster.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              actions: enemy.monster.actions || [],
              description: enemy.monster.description || ''
            } : null
          });
        }
      });

      // Save to database
      await manualCombatService.saveCombatSetup(partyId, {
        combatants: positionedCombatants,
        gridSize: gridSize,
        combatState: combatState,
        initiativeOrder: combatState === 'active' ? initiativeOrder : [],
        currentTurn: combatState === 'active' ? currentTurn : 0,
        round: combatState === 'active' ? round : 1
      });
      
      // If combat is active, also update the main combat fields in the database
      if (combatState === 'active' && initiativeOrder.length > 0) {
        try {
          const campaignStory = await getCampaignStory(partyId);
          if (campaignStory) {
            const updatedStory = {
              ...campaignStory,
              combat: {
                ...campaignStory?.combat,
                active: true,
                initiativeOrder: initiativeOrder,
                currentTurn: currentTurn,
                round: round,
                lastUpdated: new Date()
              }
            };
            
            // Clean the story data to remove any undefined values
            const cleanedStory = manualCombatService.cleanDataForFirestore(updatedStory);
            await updateCampaignStory(campaignStory.id, cleanedStory);
          }
        } catch (error) {
          console.error('Error updating main combat fields:', error);
        }
      }
    } catch (error) {
      console.error('Error saving combat state:', error);
    }
  };

  const handleCellClick = async (x, y) => {
    if (selectedCombatant) {
      await placeCombatant(selectedCombatant, x, y);
      setSelectedCombatant(null);
    }
  };

  const handleCellDragStart = (x, y) => {
    const cell = combatGrid[y][x];
    if (cell.combatant) {
      setDraggedCombatant(cell.combatant);
    }
  };

  const handleCellDragOver = (e) => {
    e.preventDefault();
  };

  const handleCellDrop = async (x, y) => {
    if (draggedCombatant) {
      await placeCombatant(draggedCombatant, x, y);
      setDraggedCombatant(null);
    }
  };

  const rollInitiative = async () => {
    try {
      setLoading(true);
      
      // Get all combatants with positions
      const positionedCombatants = [];
      
      // Add player characters
      partyCharacters.forEach(char => {
        const position = findCombatantPosition(char.id);
        if (position) {
          positionedCombatants.push({
            id: char.userId || char.id || '', // Use userId for player identification
            name: char.name || '',
            type: 'player',
            initiativeModifier: Math.floor(((char.dexterity || 10) - 10) / 2),
            position: position,
            hp: char.hp || 0,
            maxHp: char.maxHp || 0,
            ac: char.ac || 10,
            spells: char.spells || [],
            character: {
              id: char.id || '',
              name: char.name || '',
              dexterity: char.dexterity || 10,
              hp: char.hp || 0,
              maxHp: char.maxHp || 0,
              ac: char.ac || 10,
              spells: char.spells || []
            }
          });
        }
      });

      // Add enemies
      selectedEnemies.forEach(enemy => {
        if (enemy.position) {
          positionedCombatants.push({
            id: enemy.id || '',
            name: enemy.name || '',
            type: 'enemy',
            initiativeModifier: enemy.initiativeModifier || 0,
            position: enemy.position,
            hp: enemy.hp || 0,
            maxHp: enemy.maxHp || 0,
            ac: enemy.ac || 10,
            spells: enemy.spells || [],
            monster: enemy.monster ? {
              name: enemy.monster.name || '',
              hp: enemy.monster.hp || '1d8',
              ac: enemy.monster.ac || 10,
              stats: enemy.monster.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              actions: enemy.monster.actions || [],
              description: enemy.monster.description || ''
            } : null
          });
        }
      });

      if (positionedCombatants.length === 0) {
        alert('Please position at least one combatant on the grid before rolling initiative.');
        return;
      }

      const results = await manualCombatService.rollInitiative(partyId, positionedCombatants);
      setInitiativeOrder(results);
      setCurrentTurn(0);
      setRound(1);
      setCombatState('initiative');
      
    } catch (error) {
      console.error('Error rolling initiative:', error);
      alert('Failed to roll initiative');
    } finally {
      setLoading(false);
    }
  };

  const findCombatantPosition = useCallback((combatantId) => {
    for (let y = 0; y < combatGrid.length; y++) {
      for (let x = 0; x < combatGrid[y].length; x++) {
        if (combatGrid[y][x].combatant?.id === combatantId) {
          return { x, y };
        }
      }
    }
    return null;
  }, [combatGrid]);

  const startCombat = async () => {
    setCombatState('active');
    
    // Save the active combat state to database
    try {
      await saveCombatStateToDatabase();
    } catch (error) {
      console.error('Error saving combat state when starting combat:', error);
    }
    
    if (onCombatStart) {
      onCombatStart({
        initiativeOrder,
        combatGrid,
        selectedEnemies,
        partyCharacters
      });
    }
  };

  const nextTurn = async () => {
    try {
      const result = await manualCombatService.nextTurn(partyId);
      setCurrentTurn(result.currentTurn);
      setRound(result.round);
      setSelectedAction(null);
      setSelectedTarget(null);
      setLastCombatResult(null);
    } catch (error) {
      console.error('Error advancing turn:', error);
    }
  };

  const endCombat = async () => {
    try {
      await manualCombatService.endCombat(partyId);
      setCombatState('setup');
      setInitiativeOrder([]);
      setCurrentTurn(0);
      setRound(1);
      setSelectedEnemies([]);
      setSelectedAction(null);
      setSelectedTarget(null);
      setLastCombatResult(null);
      initializeCombatGrid();
    } catch (error) {
      console.error('Error ending combat:', error);
    }
  };

  const getCurrentCombatant = useMemo(() => {
    if (initiativeOrder.length === 0 || currentTurn >= initiativeOrder.length) {
      return null;
    }
    return initiativeOrder[currentTurn];
  }, [initiativeOrder, currentTurn]);

  const currentCombatant = getCurrentCombatant;

  const updateCombatOptions = useCallback(async (combatantId) => {
    try {
      const [actions, targets] = await Promise.all([
        manualCombatService.getAvailableActions(partyId, combatantId),
        manualCombatService.getValidTargets(partyId, combatantId, selectedAction?.name)
      ]);
      setAvailableActions(actions);
      setValidTargets(targets);
    } catch (error) {
      // Only log errors that aren't "No active combat" during initialization
      if (!error.message.includes('No active combat') || combatState === 'active') {
        console.error('Error updating combat options:', error);
      }
    }
  }, [partyId, selectedAction?.name, combatState]);

  const performAction = async () => {
    if (!selectedAction || !selectedTarget) {
      alert('Please select both an action and a target.');
      return;
    }

    // For movement actions, execute immediately without dice rolls
    if (selectedAction.name === 'Move') {
      try {
        setLoading(true);
        
        const currentCombatant = getCurrentCombatant;
        const result = await manualCombatService.performAction(
          partyId,
          currentCombatant.id,
          selectedTarget.id,
          selectedAction.name,
          null
        );
        
        setLastCombatResult(result);
        setSelectedAction(null);
        setSelectedTarget(null);
      } catch (error) {
        console.error('Error performing movement:', error);
        alert('Failed to perform movement');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Store the pending action and show dice modal for attack actions
    const currentCombatant = getCurrentCombatant;
    setPendingAction({
      action: selectedAction,
      target: selectedTarget,
      combatant: currentCombatant
    });
    setShowDiceModal(true);
  };

  const handleDiceRollComplete = async (rollResult) => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      
      // Determine what type of roll this is
      const isAttack = !pendingAction.action.name.includes('Move');
      let customRolls = null;
      
      if (isAttack) {
        // For attacks, we need both attack and damage rolls
        customRolls = {
          attack: rollResult.total
        };
        
        // If it's a hit, we'll need damage roll too
        const targetAC = pendingAction.target.ac || 10;
        const isHit = rollResult.total >= targetAC;
        
        if (isHit) {
          // Show damage roll modal
          setPendingAction(prev => ({
            ...prev,
            attackRoll: rollResult.total,
            isHit: true
          }));
          setShowDiceModal(false);
          // We'll handle damage roll in the next modal
          return;
        }
      }

      const result = await manualCombatService.performAction(
        partyId,
        pendingAction.combatant.id,
        pendingAction.target.id,
        pendingAction.action.name,
        customRolls
      );
      
      setLastCombatResult(result);
      setSelectedAction(null);
      setSelectedTarget(null);
      setPendingAction(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  const handleDamageRollComplete = async (rollResult) => {
    if (!pendingAction) return;

    try {
      setLoading(true);
      
      const customRolls = {
        attack: pendingAction.attackRoll,
        damage: rollResult.total
      };

      const result = await manualCombatService.performAction(
        partyId,
        pendingAction.combatant.id,
        pendingAction.target.id,
        pendingAction.action.name,
        customRolls
      );
      
      setLastCombatResult(result);
      setSelectedAction(null);
      setSelectedTarget(null);
      setPendingAction(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  // Update targets when action changes
  const handleActionSelect = useCallback(async (action) => {
    setSelectedAction(action);
    setSelectedTarget(null);
    
    if (currentCombatant) {
      try {
        const targets = await manualCombatService.getValidTargets(partyId, currentCombatant.id, action.name);
        setValidTargets(targets);
      } catch (error) {
        console.error('Error getting targets for action:', error);
      }
    }
  }, [partyId, currentCombatant]);

  return (
    <div className="fantasy-card max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-100">⚔️ Combat Setup</h3>
        <div className="flex gap-2">
          {combatState === 'setup' && (
            <button
              onClick={rollInitiative}
              disabled={loading || selectedEnemies.length === 0}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm disabled:opacity-50"
            >
              {loading ? 'Rolling...' : '🎲 Roll Initiative'}
            </button>
          )}
          {combatState === 'initiative' && (
            <>
              <button
                onClick={async () => await startCombat()}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                ⚔️ Start Combat
              </button>
              <button
                onClick={() => {
                  dmToolsService.updatePlayerView(partyId, 'combat');
                }}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                👁️ Show to Players
              </button>
              <button
                onClick={() => setCombatState('setup')}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                ↩️ Back to Setup
              </button>
            </>
          )}
          {combatState === 'active' && (
            <>
              <button
                onClick={() => {
                  dmToolsService.updatePlayerView(partyId, 'combat');
                }}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                👁️ Show to Players
              </button>
              <button
                onClick={endCombat}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                🏁 End Combat
              </button>
            </>
          )}
        </div>
      </div>

      {/* Combat Status */}
      {(combatState === 'initiative' || combatState === 'active') && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-slate-300">Round: </span>
              <span className="text-amber-400 font-bold">{round}</span>
            </div>
            <div>
              <span className="text-slate-300">Turn: </span>
              <span className="text-amber-400 font-bold">{currentTurn + 1}</span>
              <span className="text-slate-400"> / {initiativeOrder.length}</span>
            </div>
          </div>
          {currentCombatant && (
            <div className="p-3 bg-slate-600 rounded">
              <span className="text-slate-300">Current: </span>
              <span className={`font-bold ${currentCombatant.type === 'player' ? 'text-blue-400' : 'text-red-400'}`}>
                {currentCombatant.name}
              </span>
              <span className="text-slate-400 ml-2">
                (Initiative: {currentCombatant.initiative})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Centered */}
      <div className="flex justify-center mb-6">
        <div className="w-full max-w-4xl">
          {/* Combat Grid */}
          <div className="fantasy-card bg-slate-800/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-200">🗺️ Combat Grid</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setGridSize({ width: 8, height: 6 })}
                  className={`px-2 py-1 text-xs rounded ${gridSize.width === 8 ? 'bg-amber-600' : 'bg-slate-600'}`}
                >
                  8x6
                </button>
                <button
                  onClick={() => setGridSize({ width: 12, height: 8 })}
                  className={`px-2 py-1 text-xs rounded ${gridSize.width === 12 ? 'bg-amber-600' : 'bg-slate-600'}`}
                >
                  12x8
                </button>
                <button
                  onClick={() => setGridSize({ width: 16, height: 10 })}
                  className={`px-2 py-1 text-xs rounded ${gridSize.width === 16 ? 'bg-amber-600' : 'bg-slate-600'}`}
                >
                  16x10
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 overflow-auto">
              <div className="inline-block">
                {combatGrid.map((row, y) => (
                  <div key={y} className="flex">
                    {row.map((cell, x) => (
                      <div
                        key={`${x}-${y}`}
                        onClick={() => handleCellClick(x, y)}
                        onDragStart={() => handleCellDragStart(x, y)}
                        onDragOver={handleCellDragOver}
                        onDrop={() => handleCellDrop(x, y)}
                        draggable={cell.combatant !== null}
                        className={`w-12 h-12 border border-slate-600 flex items-center justify-center text-sm cursor-pointer transition-colors hover:border-amber-400 ${
                          cell.combatant 
                            ? cell.combatant.type === 'player' 
                              ? 'bg-blue-600/50 border-blue-500' 
                              : 'bg-red-600/50 border-red-500'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                        title={`${x}, ${y}${cell.combatant ? ` - ${cell.combatant.name}` : ''}`}
                      >
                        {cell.combatant ? (
                          <div className="text-center">
                            <div className="text-lg">
                              {cell.combatant.type === 'player' ? '👤' : '👹'}
                            </div>
                            <div className="text-xs text-slate-300">
                              {cell.combatant.name.substring(0, 3)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">·</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Combatant Selection */}
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-slate-300 mb-2">Place Combatants:</h5>
              <div className="grid grid-cols-2 gap-2">
                {/* Player Characters */}
                <div>
                  <h6 className="text-xs font-semibold text-blue-400 mb-1">Players:</h6>
                  <div className="space-y-1">
                    {partyCharacters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedCombatant({
                          id: char.id,
                          name: char.name,
                          type: 'player',
                          hp: char.hp,
                          maxHp: char.maxHp,
                          ac: char.ac,
                          spells: char.spells || [],
                          character: char
                        })}
                        className={`w-full text-left p-2 rounded text-xs transition-colors ${
                          selectedCombatant?.id === char.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {char.name} (HP: {char.hp}/{char.maxHp})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Enemies */}
                <div>
                  <h6 className="text-xs font-semibold text-red-400 mb-1">Enemies:</h6>
                  <div className="space-y-1">
                    {selectedEnemies.map((enemy) => (
                      <button
                        key={enemy.id}
                        onClick={() => setSelectedCombatant(enemy)}
                        className={`w-full text-left p-2 rounded text-xs transition-colors ${
                          selectedCombatant?.id === enemy.id
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {enemy.name} (HP: {enemy.hp}/{enemy.maxHp})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Initiative Order */}
          {(combatState === 'initiative' || combatState === 'active') && initiativeOrder.length > 0 && (
            <div className="fantasy-card bg-slate-800/50 mb-6">
              <h4 className="text-lg font-semibold text-slate-200 mb-3">📋 Initiative Order:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {initiativeOrder.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-2 rounded transition-colors ${
                      index === currentTurn
                        ? 'bg-amber-600/30 border border-amber-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        participant.type === 'player' ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        {participant.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({participant.type})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {participant.roll} + {participant.modifier} = {participant.initiative}
                      </span>
                      {index === currentTurn && (
                        <span className="text-amber-400 text-sm">👑</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combat Actions - Only for Enemy Turns */}
          {combatState === 'active' && currentCombatant && currentCombatant.type === 'enemy' && (
            <div className="fantasy-card bg-slate-800/50 mb-6">
              <h4 className="text-lg font-semibold text-slate-200 mb-3">
                ⚔️ {currentCombatant.name}'s Turn (DM Control)
              </h4>
              
              {/* Last Combat Result */}
              {lastCombatResult && (
                <div className="mb-4 p-3 bg-slate-700 rounded">
                  {lastCombatResult.action === 'Move' ? (
                    // Movement result
                    <div className="text-sm">
                      <div>
                        <span className="text-slate-300">{lastCombatResult.combatant}</span>
                        <span className="text-slate-400"> moved from </span>
                        <span className="text-amber-400">({lastCombatResult.oldPosition.x}, {lastCombatResult.oldPosition.y})</span>
                        <span className="text-slate-400"> to </span>
                        <span className="text-amber-400">({lastCombatResult.newPosition.x}, {lastCombatResult.newPosition.y})</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Distance moved: {lastCombatResult.movementDistance} square(s)
                      </div>
                    </div>
                  ) : (
                    // Attack result
                    <>
                      <div className="text-sm">
                        <span className="text-slate-300">{lastCombatResult.attacker}</span>
                        <span className="text-slate-400"> attacks </span>
                        <span className="text-slate-300">{lastCombatResult.target}</span>
                        <span className="text-slate-400"> with </span>
                        <span className="text-amber-400">{lastCombatResult.action}</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="text-slate-400">Roll: </span>
                        <span className="text-amber-400">{lastCombatResult.attackRoll}</span>
                        <span className="text-slate-400"> vs AC </span>
                        <span className="text-amber-400">{lastCombatResult.targetAC}</span>
                        <span className={`ml-2 ${lastCombatResult.isHit ? 'text-green-400' : 'text-red-400'}`}>
                          {lastCombatResult.isHit ? 'HIT!' : 'MISS!'}
                        </span>
                      </div>
                      {lastCombatResult.isHit && (
                        <div className="text-sm mt-1">
                          <span className="text-slate-400">Damage: </span>
                          <span className="text-red-400">{lastCombatResult.damageDetails}</span>
                          <span className="text-slate-400 ml-2">
                            ({lastCombatResult.target} HP: {lastCombatResult.targetNewHp})
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Action Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Actions */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-300 mb-2">Available Actions:</h5>
                  <div className="space-y-2">
                    {availableActions.map((action) => (
                      <button
                        key={action.name}
                        onClick={() => handleActionSelect(action)}
                        className={`w-full text-left p-2 rounded transition-colors ${
                          selectedAction?.name === action.name
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <div className="font-medium">{action.name}</div>
                        <div className="text-xs text-slate-400">
                          {action.type} • Attack: {action.attack} • Damage: {action.damage}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valid Targets */}
                <div>
                  <h5 className="text-sm font-semibold text-slate-300 mb-2">
                    {selectedAction?.name === 'Move' ? 'Valid Positions:' : 'Valid Targets:'}
                  </h5>
                  <div className="space-y-2">
                    {validTargets.map((target) => (
                      <button
                        key={target.id}
                        onClick={() => setSelectedTarget(target)}
                        className={`w-full text-left p-2 rounded transition-colors ${
                          selectedTarget?.id === target.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <div className="font-medium">{target.name}</div>
                        <div className="text-xs text-slate-400">
                          {target.type === 'position' ? (
                            `Position (${target.x}, ${target.y}) - Distance: ${target.distance}`
                          ) : (
                            `HP: ${target.hp}/${target.maxHp} • AC: ${target.ac}`
                          )}
                        </div>
                      </button>
                    ))}
                    {validTargets.length === 0 && (
                      <p className="text-slate-400 text-sm italic">
                        {selectedAction?.name === 'Move' ? 'No valid movement positions available' : 'No valid targets available'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Range Information */}
              {selectedAction && !selectedAction.name.includes('Move') && (
                <div className="mt-3 p-2 bg-slate-700/50 rounded border border-slate-600/50">
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold">Range:</span> {
                      selectedAction.name === 'Basic Attack' 
                        ? 'Melee (1 square)'
                        : selectedAction.name === 'Ranged Attack'
                        ? 'Ranged (3 squares)'
                        : selectedAction.range || 'Melee (1 square)'
                    }
                  </div>
                </div>
              )}

              {/* Perform Action Button */}
              <div className="mt-4">
                <button
                  onClick={performAction}
                  disabled={!selectedAction || !selectedTarget || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'Performing Action...' : `⚔️ Perform ${selectedAction?.name || 'Action'}`}
                </button>
              </div>

              {/* Manual Next Turn Button for DM */}
              <div className="mt-2">
                <button
                  onClick={nextTurn}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  ⏭️ End Turn & Continue
                </button>
              </div>
            </div>
          )}

          {/* Player Turn Message */}
          {combatState === 'active' && currentCombatant && currentCombatant.type === 'player' && (
            <div className="fantasy-card bg-slate-800/50 mb-6">
              <h4 className="text-lg font-semibold text-slate-200 mb-3">
                ⚔️ {currentCombatant.name}'s Turn (Player Control)
              </h4>
              <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 mb-2">
                      It's <span className="font-bold text-blue-300">{currentCombatant.name}</span>'s turn!
                    </p>
                    <p className="text-blue-300 text-sm">
                      The player should be controlling their actions through their own interface.
                    </p>
                  </div>
                  <div className="text-4xl">👤</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-blue-300 text-sm">Waiting for player action...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DM Tools - Moved to Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enemy Selection */}
        <div className="fantasy-card bg-slate-800/50">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">👹 Enemy Selection</h4>
          
          {/* Selected Enemies */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Selected Enemies:</h5>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedEnemies.map((enemy) => (
                <div key={enemy.id} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                  <div>
                    <div className="font-medium text-red-400">{enemy.name}</div>
                    <div className="text-xs text-slate-400">
                      HP: {enemy.hp} | AC: {enemy.ac} | Initiative: +{enemy.initiativeModifier}
                    </div>
                  </div>
                  <button
                    onClick={() => removeEnemy(enemy.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {selectedEnemies.length === 0 && (
                <p className="text-slate-400 text-sm">No enemies selected</p>
              )}
            </div>
          </div>

          {/* Monster Catalog */}
          <div>
            <h5 className="text-sm font-semibold text-slate-300 mb-2">Available Monsters:</h5>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {manualMonsters.map((monster) => (
                <button
                  key={monster.id}
                  onClick={() => addEnemy(monster)}
                  className="w-full text-left p-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  <div className="font-medium text-slate-200">{monster.name}</div>
                  <div className="text-xs text-slate-400">
                    CR {monster.cr} • HP {monster.hp} • AC {monster.ac}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Combat Status Summary */}
        <div className="fantasy-card bg-slate-800/50">
          <h4 className="text-lg font-semibold text-slate-200 mb-4">📊 Combat Status</h4>
          
          {/* Player Status */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-blue-400 mb-2">Players:</h5>
            <div className="space-y-2">
              {partyCharacters.map((char) => {
                const position = findCombatantPosition(char.id);
                return (
                  <div key={char.id} className="bg-slate-700 p-2 rounded">
                    <div className="font-medium text-blue-400">{char.name}</div>
                    <div className="text-xs text-slate-400">
                      HP: {char.hp}/{char.maxHp} • AC: {char.ac}
                      {position && ` • Position: (${position.x}, ${position.y})`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enemy Status */}
          <div>
            <h5 className="text-sm font-semibold text-red-400 mb-2">Enemies:</h5>
            <div className="space-y-2">
              {selectedEnemies.map((enemy) => {
                const position = findCombatantPosition(enemy.id);
                return (
                  <div key={enemy.id} className="bg-slate-700 p-2 rounded">
                    <div className="font-medium text-red-400">{enemy.name}</div>
                    <div className="text-xs text-slate-400">
                      HP: {enemy.hp}/{enemy.maxHp} • AC: {enemy.ac}
                      {position && ` • Position: (${position.x}, ${position.y})`}
                    </div>
                  </div>
                );
              })}
              {selectedEnemies.length === 0 && (
                <p className="text-slate-400 text-sm">No enemies in combat</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dice Roll Modal */}
      <DiceRollModal
        isOpen={showDiceModal}
        onClose={() => {
          setShowDiceModal(false);
          setPendingAction(null);
        }}
        onRollComplete={pendingAction?.isHit ? handleDamageRollComplete : handleDiceRollComplete}
        diceNotation={
          pendingAction?.isHit 
            ? pendingAction.action.damage || '1d6'
            : '1d20'
        }
        rollType={
          pendingAction?.isHit 
            ? 'Damage Roll'
            : pendingAction?.action.name.includes('Move')
            ? 'Movement'
            : 'Attack Roll'
        }
        modifier={
          pendingAction?.isHit 
            ? 0
            : pendingAction?.action.name.includes('Move')
            ? 0
            : Math.floor(((pendingAction?.combatant?.character?.dexterity || 10) - 10) / 2)
        }
      />
    </div>
  );
});

export default DMCombatView;