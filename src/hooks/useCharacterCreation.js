import { useState, useEffect } from 'react';
import { standardArray } from '../data/characterData';

export default function useCharacterCreation(user, partyId) {
  // Character data state
  const [character, setCharacter] = useState({
    // Basic Info
    name: '',
    race: '',
    class: '',
    level: 1,
    background: '',
    alignment: '',
    
    // Ability Scores
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    
    // Physical Description
    age: '',
    height: '',
    weight: '',
    eyes: '',
    skin: '',
    hair: '',
    
    // Character Details
    personality: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    
    // Equipment
    equipment: [],
    
    // Spells (for spellcasters)
    spells: [],
    
    // Proficiencies
    proficiencies: [],
    
    // Image placeholder
    portrait: '/placeholder-character.png'
  });

  // Ability score generation state
  const [abilityScoreMethod, setAbilityScoreMethod] = useState('standard');
  const [rolledScores, setRolledScores] = useState([]);
  const [unassignedScores, setUnassignedScores] = useState([]);
  const [assignedScores, setAssignedScores] = useState({});
  const [hasRolled, setHasRolled] = useState(false);

  // Equipment and spell choices
  const [weaponChoices, setWeaponChoices] = useState({});
  const [spellChoices, setSpellChoices] = useState([]);

  // Preset management
  const [characterPresets, setCharacterPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);

  // Character management
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [existingCharacter, setExistingCharacter] = useState(null);

  // Utility functions
  const handleInputChange = (field, value) => {
    setCharacter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const rollAbilityScore = () => {
    const rolls = [];
    for (let i = 0; i < 4; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
  };

  const rollAllAbilityScores = () => {
    const scores = [];
    for (let i = 0; i < 6; i++) {
      scores.push(rollAbilityScore());
    }
    setRolledScores(scores);
    setUnassignedScores([...scores]);
    setHasRolled(true);
  };

  const assignScoreToAbility = (score, ability) => {
    setAssignedScores(prev => ({
      ...prev,
      [ability]: score
    }));
    setUnassignedScores(prev => prev.filter(s => s !== score));
  };

  const unassignScore = (ability) => {
    const score = assignedScores[ability];
    if (score) {
      setAssignedScores(prev => {
        const newAssigned = { ...prev };
        delete newAssigned[ability];
        return newAssigned;
      });
      setUnassignedScores(prev => [...prev, score]);
    }
  };

  const applyStandardArray = () => {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const newCharacter = { ...character };
    
    standardArray.forEach((score, index) => {
      newCharacter[abilities[index]] = score;
    });
    
    setCharacter(newCharacter);
  };

  // Reset character data when editing
  const resetCharacterData = () => {
    setCharacter({
      name: '',
      race: '',
      class: '',
      level: 1,
      background: '',
      alignment: '',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      age: '',
      height: '',
      weight: '',
      eyes: '',
      skin: '',
      hair: '',
      personality: '',
      ideals: '',
      bonds: '',
      flaws: '',
      backstory: '',
      equipment: [],
      spells: [],
      proficiencies: [],
      portrait: '/placeholder-character.png'
    });
    setWeaponChoices({});
    setSpellChoices([]);
    setAbilityScoreMethod('standard');
    setRolledScores([]);
    setAssignedScores({});
    setHasRolled(false);
    setEditingCharacter(false);
    setExistingCharacter(null);
  };

  // Load existing character data
  const loadExistingCharacter = (existingChar) => {
    setCharacter({
      name: existingChar.name || '',
      race: existingChar.race || '',
      class: existingChar.class || '',
      level: existingChar.level || 1,
      background: existingChar.background || '',
      alignment: existingChar.alignment || '',
      strength: existingChar.strength || existingChar.assignedScores?.strength || 10,
      dexterity: existingChar.dexterity || existingChar.assignedScores?.dexterity || 10,
      constitution: existingChar.constitution || existingChar.assignedScores?.constitution || 10,
      intelligence: existingChar.intelligence || existingChar.assignedScores?.intelligence || 10,
      wisdom: existingChar.wisdom || existingChar.assignedScores?.wisdom || 10,
      charisma: existingChar.charisma || existingChar.assignedScores?.charisma || 10,
      age: existingChar.age || '',
      height: existingChar.height || '',
      weight: existingChar.weight || '',
      eyes: existingChar.eyes || '',
      skin: existingChar.skin || '',
      hair: existingChar.hair || '',
      personality: existingChar.personality || '',
      ideals: existingChar.ideals || '',
      bonds: existingChar.bonds || '',
      flaws: existingChar.flaws || '',
      backstory: existingChar.backstory || '',
      equipment: existingChar.equipment || [],
      spells: existingChar.spells || [],
      proficiencies: existingChar.proficiencies || [],
      portrait: existingChar.portrait || '/placeholder-character.png'
    });
    
    if (existingChar.weaponChoices) {
      setWeaponChoices(existingChar.weaponChoices);
    }
    if (existingChar.spellChoices) {
      setSpellChoices(existingChar.spellChoices);
    }
    if (existingChar.abilityScoreMethod) {
      setAbilityScoreMethod(existingChar.abilityScoreMethod);
    }
    if (existingChar.rolledScores) {
      setRolledScores(existingChar.rolledScores);
      setAssignedScores(existingChar.assignedScores || {});
      setHasRolled(existingChar.rolledScores.length > 0);
    }
    
    setEditingCharacter(true);
    setExistingCharacter(existingChar);
  };

  return {
    // State
    character,
    abilityScoreMethod,
    rolledScores,
    unassignedScores,
    assignedScores,
    hasRolled,
    weaponChoices,
    spellChoices,
    characterPresets,
    showPresetModal,
    presetName,
    showLoadPresetModal,
    editingCharacter,
    existingCharacter,
    
    // Setters
    setCharacter,
    setAbilityScoreMethod,
    setRolledScores,
    setUnassignedScores,
    setAssignedScores,
    setHasRolled,
    setWeaponChoices,
    setSpellChoices,
    setCharacterPresets,
    setShowPresetModal,
    setPresetName,
    setShowLoadPresetModal,
    setEditingCharacter,
    setExistingCharacter,
    
    // Functions
    handleInputChange,
    rollAllAbilityScores,
    assignScoreToAbility,
    unassignScore,
    applyStandardArray,
    resetCharacterData,
    loadExistingCharacter
  };
} 