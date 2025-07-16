import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  saveCharacter, 
  getCharacterByUserAndParty,
  saveCharacterPreset,
  getUserCharacterPresets,
  deleteCharacterPreset,
  updateCharacter,
  getUserCharacters,
  deleteCharacter,
  getPartyById
} from '../firebase/database';

// Import new components
import BasicInfo from '../components/character/BasicInfo';
import AbilityScores from '../components/character/AbilityScores';
import PhysicalDescription from '../components/character/PhysicalDescription';
import Personality from '../components/character/Personality';
import Equipment from '../components/character/Equipment';
import PresetManager from '../components/character/PresetManager';

// Import custom hook
import useCharacterCreation from '../hooks/useCharacterCreation';

export default function CharacterCreation() {
  const navigate = useNavigate();
  const { partyId } = useParams();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [party, setParty] = useState(null);
  const [isDM, setIsDM] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);

  // Use custom hook for character creation state
  const {
    character,
    abilityScoreMethod,
    rolledScores,
    unassignedScores,
    assignedScores,
    hasRolled,
    weaponChoices,
    spellChoices,
    characterPresets,
    presetName,
    editingCharacter,
    existingCharacter,
    setCharacter,
    setAbilityScoreMethod,
    setRolledScores,
    setUnassignedScores,
    setAssignedScores,
    setHasRolled,
    setWeaponChoices,
    setSpellChoices,
    setCharacterPresets,
    setPresetName,
    setShowPresetModal: setHookShowPresetModal,
    setShowLoadPresetModal: setHookShowLoadPresetModal,
    setEditingCharacter,
    setExistingCharacter,
    handleInputChange,
    rollAllAbilityScores,
    assignScoreToAbility,
    unassignScore,
    applyStandardArray,
    resetCharacterData,
    loadExistingCharacter
  } = useCharacterCreation(user, partyId);

  // Sync modal states with hook
  useEffect(() => {
    setShowPresetModal(showPresetModal);
    setShowLoadPresetModal(showLoadPresetModal);
  }, [showPresetModal, showLoadPresetModal]);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      if (partyId) {
        loadPartyInfo(partyId, user.uid);
        checkExistingCharacter(user.uid, partyId).catch(error => {
          // Silently handle errors
        });
      }
      loadCharacterPresets(user.uid).catch(error => {
        // Silently handle errors
      });
    });
    return () => unsubscribe();
  }, [navigate, partyId]);

  const loadPartyInfo = async (partyId, userId) => {
    try {
      const partyData = await getPartyById(partyId);
      setParty(partyData);
      setIsDM(partyData.dmId === userId);
      
      // If user is DM and it's a manual campaign, redirect to DM interface
      if (partyData.dmId === userId && partyData.campaignType === 'manual') {
        navigate(`/manual-campaign-dm/${partyId}`);
      }
    } catch (error) {
      console.error('Error loading party info:', error);
    }
  };

  // Auto-cleanup duplicate characters when component loads
  useEffect(() => {
    if (user && partyId) {
      const autoCleanup = async () => {
        try {
          const allUserCharacters = await getUserCharacters(user.uid);
          const partyCharacters = allUserCharacters.filter(char => char.partyId === partyId);
          
          if (partyCharacters.length > 1) {
            await cleanupOldCharacters();
            await checkExistingCharacter(user.uid, partyId);
          }
        } catch (error) {
          // Silently handle cleanup errors
        }
      };
      autoCleanup();
    }
  }, [user, partyId]);

  const checkExistingCharacter = async (userId, partyId) => {
    try {
      const existingChar = await getCharacterByUserAndParty(userId, partyId);
      if (existingChar) {
        loadExistingCharacter(existingChar);
        setCurrentStep(6); // Go to final step if character exists
      }
    } catch (error) {
      console.error('Error checking existing character:', error);
    }
  };

  const cleanupDuplicateCharacters = async (characters, keepCharacterId) => {
    const deletePromises = characters
      .filter(char => char.id !== keepCharacterId)
      .map(char => deleteCharacter(char.id));
    
    await Promise.all(deletePromises);
  };

  const cleanupOldCharacters = async () => {
    try {
      const allUserCharacters = await getUserCharacters(user.uid);
      const partyCharacters = allUserCharacters.filter(char => char.partyId === partyId);
      
      if (partyCharacters.length > 1) {
        // Keep the most recently updated character
        const sortedCharacters = partyCharacters.sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
          const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
          return bTime - aTime;
        });
        
        const keepCharacterId = sortedCharacters[0].id;
        await cleanupDuplicateCharacters(partyCharacters, keepCharacterId);
      }
    } catch (error) {
      console.error('Error cleaning up old characters:', error);
    }
  };

  const loadCharacterPresets = async (userId) => {
    try {
      const presets = await getUserCharacterPresets(userId);
      setCharacterPresets(presets);
    } catch (error) {
      console.error('Error loading character presets:', error);
    }
  };

  const handleJoinCampaign = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validate required fields
      const requiredFields = ['name', 'race', 'class'];
      const missingFields = requiredFields.filter(field => !character[field]);
      
      if (missingFields.length > 0) {
        setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // Prepare character data - always set level to 1
      const characterData = {
        ...character,
        level: 1, // Everyone starts at level 1
        userId: user.uid,
        partyId: partyId,
        weaponChoices,
        spellChoices,
        abilityScoreMethod,
        rolledScores,
        assignedScores,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (character.class) {
        characterData.equipment = getStartingEquipment(character.class);
      }

      if (spellChoices.length > 0) {
        characterData.spells = spellChoices;
      }

      if (editingCharacter && existingCharacter) {
        // Update existing character
        await updateCharacter(existingCharacter.id, characterData);
      } else {
        // Create new character
        await saveCharacter(user.uid, partyId, characterData);
        setEditingCharacter(true);
      }

      // Navigate to campaign
      navigate(`/campaign/${partyId}`);
      
    } catch (error) {
      console.error('Error joining campaign:', error);
      setError('Failed to join campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAsPreset = async () => {
    if (!presetName.trim()) {
      setError('Please enter a name for your preset.');
      return;
    }

    try {
      const presetData = {
        name: presetName,
        data: {
          ...character,
          weaponChoices,
          spellChoices,
          abilityScoreMethod,
          rolledScores,
          assignedScores
        },
        userId: user.uid,
        createdAt: new Date()
      };

      await saveCharacterPreset(user.uid, presetData);
      setMessage('Preset saved successfully!');
      setShowPresetModal(false);
      setPresetName('');
      await loadCharacterPresets(user.uid);
      
    } catch (error) {
      console.error('Error saving preset:', error);
      setError('Failed to save preset. Please try again.');
    }
  };

  const handlePresetKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveCurrentAsPreset();
    }
  };

  const loadPreset = (preset) => {
    try {
      const presetData = preset.data;
      
      // Load character data
      setCharacter({
        name: presetData.name || '',
        race: presetData.race || '',
        class: presetData.class || '',
        level: 1, // Always set to level 1
        background: presetData.background || '',
        alignment: presetData.alignment || '',
        strength: presetData.strength || 10,
        dexterity: presetData.dexterity || 10,
        constitution: presetData.constitution || 10,
        intelligence: presetData.intelligence || 10,
        wisdom: presetData.wisdom || 10,
        charisma: presetData.charisma || 10,
        age: presetData.age || '',
        height: presetData.height || '',
        weight: presetData.weight || '',
        eyes: presetData.eyes || '',
        skin: presetData.skin || '',
        hair: presetData.hair || '',
        personality: presetData.personality || '',
        ideals: presetData.ideals || '',
        bonds: presetData.bonds || '',
        flaws: presetData.flaws || '',
        backstory: presetData.backstory || '',
        equipment: presetData.equipment || [],
        spells: presetData.spells || [],
        proficiencies: presetData.proficiencies || [],
        portrait: presetData.portrait || '/placeholder-character.png'
      });

      // Load additional data
      if (presetData.weaponChoices) {
        setWeaponChoices(presetData.weaponChoices);
      }
      if (presetData.spellChoices) {
        setSpellChoices(presetData.spellChoices);
      }
      if (presetData.abilityScoreMethod) {
        setAbilityScoreMethod(presetData.abilityScoreMethod);
      }
      if (presetData.rolledScores) {
        setRolledScores(presetData.rolledScores);
        setAssignedScores(presetData.assignedScores || {});
        setHasRolled(presetData.rolledScores.length > 0);
      }

      setShowLoadPresetModal(false);
      setMessage('Preset loaded successfully!');
      
    } catch (error) {
      console.error('Error loading preset:', error);
      setError('Failed to load preset. Please try again.');
    }
  };

  const deletePreset = async (presetId) => {
    try {
      await deleteCharacterPreset(user.uid, presetId);
      await loadCharacterPresets(user.uid);
      setMessage('Preset deleted successfully!');
    } catch (error) {
      console.error('Error deleting preset:', error);
      setError('Failed to delete preset. Please try again.');
    }
  };

  const clearExistingCharacter = () => {
    resetCharacterData();
    setMessage('Character form cleared. You can create a new character.');
  };

  const refreshExistingCharacter = async () => {
    if (user && partyId) {
      await checkExistingCharacter(user.uid, partyId);
      setMessage('Character data refreshed.');
    }
  };

  // Helper function for starting equipment
  const getStartingEquipment = (characterClass) => {
    const baseEquipment = {
      'Fighter': ['Chain mail', 'Martial weapon and a shield', 'Crossbow, light and 20 bolts', 'Dungeoneer\'s pack'],
      'Wizard': ['Quarterstaff', 'Component pouch', 'Scholar\'s pack', 'Spellbook'],
      'Cleric': ['Shield', 'Holy symbol', 'Priest\'s pack', 'Chain shirt'],
      'Rogue': ['Shortsword', 'Shortbow and 20 arrows', 'Burglar\'s pack', 'Leather armor'],
      'Ranger': ['Longbow and 20 arrows', 'Leather armor', 'Dungeoneer\'s pack', 'Two shortswords'],
      'Paladin': ['Martial weapon and a shield', 'Five javelins', 'Priest\'s pack', 'Chain mail'],
      'Bard': ['Rapier', 'Diplomat\'s pack', 'Lute', 'Leather armor'],
      'Barbarian': ['Greataxe', 'Two handaxes', 'Explorer\'s pack', 'Four javelins'],
      'Druid': ['Shield', 'Scimitar', 'Explorer\'s pack', 'Druidic focus'],
      'Monk': ['Shortsword', 'Dungeoneer\'s pack', '10 darts'],
      'Sorcerer': ['Quarterstaff', 'Component pouch', 'Scholar\'s pack', 'Two daggers'],
      'Warlock': ['Quarterstaff', 'Component pouch', 'Scholar\'s pack', 'Leather armor']
    };

    if (!characterClass || !baseEquipment[characterClass]) {
      return ['Adventurer\'s pack', 'Simple weapon', '5 gp'];
    }
    
    const equipment = [...(baseEquipment[characterClass] || ['Adventurer\'s pack', 'Simple weapon', '5 gp'])];
    
    // Add chosen weapons to equipment
    if (weaponChoices) {
      Object.values(weaponChoices).forEach(weapon => {
        if (weapon) {
          equipment.push(weapon);
        }
      });
    }
    
    // Add chosen spells to equipment
    if (spellChoices && spellChoices.length > 0) {
      equipment.push(`Spells: ${spellChoices.join(', ')}`);
    }
    
    return equipment;
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const isStepComplete = (step) => {
    switch (step) {
      case 1:
        return character.name && character.race && character.class;
      case 2:
        return hasRolled || abilityScoreMethod === 'standard';
      case 3:
        return character.age && character.height && character.weight;
      case 4:
        return character.personality && character.ideals && character.bonds && character.flaws;
      case 5:
        return true; // Equipment is optional
      default:
        return false;
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Basic Information';
      case 2: return 'Ability Scores';
      case 3: return 'Physical Description';
      case 4: return 'Personality';
      case 5: return 'Equipment';
      case 6: return 'Review & Join';
      default: return '';
    }
  };

  const getStepIcon = (step) => {
    switch (step) {
      case 1: return '📝';
      case 2: return '⚔️';
      case 3: return '👤';
      case 4: return '💭';
      case 5: return '🎒';
      case 6: return '✅';
      default: return '📋';
    }
  };

  // Show loading state while checking for existing character
  if (!partyId) {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading character creation...</p>
            <p className="text-gray-400 text-sm mt-2">No party ID found</p>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <h1 className="fantasy-title text-center">
            {existingCharacter ? 'Edit Character' : 'Create Character'}
          </h1>
          
          <p className="text-center text-gray-300 mb-6">
            {party?.name ? `Party: ${party.name}` : 'Loading party...'}
          </p>

          {/* Load Preset Button - Always visible if user has presets */}
          {characterPresets.length > 0 ? (
            <div className="text-center mb-6 p-4 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
              <h3 className="text-lg font-bold text-emerald-300 mb-3">💾 Quick Start</h3>
              <button
                type="button"
                onClick={() => setShowLoadPresetModal(true)}
                className="fantasy-button bg-emerald-600 hover:bg-emerald-700 px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold mb-3"
              >
                📋 Load Character Preset
              </button>
              <p className="text-emerald-200 text-sm sm:text-base">
                Quickly load a previously saved character template to get started faster
              </p>
              <p className="text-emerald-300/70 text-xs mt-2">
                You have {characterPresets.length} saved preset{characterPresets.length !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <div className="text-center mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <h3 className="text-lg font-bold text-blue-300 mb-3">🎯 New Character</h3>
              <p className="text-blue-200 text-sm sm:text-base">
                Start creating your character from scratch. You can save it as a preset for future use!
              </p>
            </div>
          )}

          {/* Progress Steps */}
          <div className="mb-8">
            {/* Step Navigation - Consistent across all screen sizes */}
            <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <button
                  key={step}
                  onClick={() => goToStep(step)}
                  className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg text-lg font-bold transition-all duration-200 ${
                    currentStep === step
                      ? 'bg-amber-600 text-white shadow-lg'
                      : isStepComplete(step)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            {/* Step indicator - Always visible */}
            <div className="text-center mt-4">
              <div className="text-lg font-bold text-amber-400 mb-1">
                {getStepIcon(currentStep)} {getStepTitle(currentStep)}
              </div>
              <div className="text-sm text-gray-400">
                Step {currentStep} of 6
              </div>
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-300">{message}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="space-y-8">
            {/* Step Content */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Start by defining your character's core identity</p>
                </div>
                
                <BasicInfo 
                  character={character}
                  onInputChange={handleInputChange}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Determine your character's physical and mental capabilities</p>
                </div>
                <AbilityScores
                  character={character}
                  onInputChange={handleInputChange}
                  abilityScoreMethod={abilityScoreMethod}
                  setAbilityScoreMethod={setAbilityScoreMethod}
                  rolledScores={rolledScores}
                  unassignedScores={unassignedScores}
                  assignedScores={assignedScores}
                  hasRolled={hasRolled}
                  onRollAllScores={rollAllAbilityScores}
                  onApplyStandardArray={applyStandardArray}
                  onAssignScore={assignScoreToAbility}
                  onUnassignScore={unassignScore}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Describe your character's appearance</p>
                </div>
                <PhysicalDescription 
                  character={character}
                  onInputChange={handleInputChange}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Define your character's personality traits and background</p>
                </div>
                <Personality 
                  character={character}
                  onInputChange={handleInputChange}
                />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Choose your character's weapons, armor, and gear</p>
                </div>
                <Equipment
                  character={character}
                  weaponChoices={weaponChoices}
                  setWeaponChoices={setWeaponChoices}
                  spellChoices={spellChoices}
                  setSpellChoices={setSpellChoices}
                />
              </div>
            )}

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300 text-sm sm:text-base">Review your character and join the adventure!</p>
                </div>
                
                {/* Character Summary */}
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-100 mb-4">Character Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <h4 className="text-amber-300 font-medium mb-2">Basic Info</h4>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>Name:</strong> {character.name || 'Not set'}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>Race:</strong> {character.race || 'Not set'}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>Class:</strong> {character.class || 'Not set'}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>Level:</strong> 1</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>Background:</strong> {character.background || 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="text-amber-300 font-medium mb-2">Ability Scores</h4>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>STR:</strong> {character.strength || 10}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>DEX:</strong> {character.dexterity || 10}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>CON:</strong> {character.constitution || 10}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>INT:</strong> {character.intelligence || 10}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>WIS:</strong> {character.wisdom || 10}</p>
                      <p className="text-gray-300 text-sm sm:text-base"><strong>CHA:</strong> {character.charisma || 10}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleJoinCampaign}
                    className="fantasy-button px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white mr-2"></div>
                        Joining Campaign...
                      </>
                    ) : (
                      <>
                        🎮 Join Campaign
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowPresetModal(true)}
                    className="fantasy-button bg-emerald-600 hover:bg-emerald-700 px-4 sm:px-6 py-3"
                  >
                    💾 Save as Preset
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-gray-600 gap-3 sm:gap-0">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="fantasy-button bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 order-2 sm:order-1"
              >
                ← Previous
              </button>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="fantasy-button bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </button>
                
                {currentStep < 6 && (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepComplete(currentStep)}
                    className="fantasy-button disabled:bg-gray-800 disabled:text-gray-500"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preset Modals */}
        <PresetManager
          characterPresets={characterPresets}
          showPresetModal={showPresetModal}
          setShowPresetModal={setShowPresetModal}
          showLoadPresetModal={showLoadPresetModal}
          setShowLoadPresetModal={setShowLoadPresetModal}
          presetName={presetName}
          setPresetName={setPresetName}
          onSavePreset={saveCurrentAsPreset}
          onLoadPreset={loadPreset}
          onDeletePreset={deletePreset}
          onPresetKeyPress={handlePresetKeyPress}
        />
      </div>
    );
  } catch (error) {
    console.error('Error rendering CharacterCreation:', error);
    return (
      <div className="fantasy-container py-8">
        <div className="fantasy-card">
          <div className="text-center py-8">
            <p className="text-red-400 text-lg mb-2">An error occurred while rendering the component.</p>
            <p className="text-gray-300">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
} 