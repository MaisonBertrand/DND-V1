import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { onAuthChange } from '../firebase/auth';
import { 
  saveCharacter, 
  getCharacterByUserAndParty,
  saveCharacterPreset,
  getUserCharacterPresets,
  deleteCharacterPreset,
  updateCharacter
} from '../firebase/database';

export default function CharacterCreation() {
  const navigate = useNavigate();
  const { partyId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [existingCharacter, setExistingCharacter] = useState(null);
  const [characterPresets, setCharacterPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showLoadPresetModal, setShowLoadPresetModal] = useState(false);
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

  const [abilityScoreMethod, setAbilityScoreMethod] = useState('standard'); // 'standard', 'roll'
  const [rolledScores, setRolledScores] = useState([]);
  const [unassignedScores, setUnassignedScores] = useState([]);
  const [assignedScores, setAssignedScores] = useState({});
  const [hasRolled, setHasRolled] = useState(false);
  const [weaponChoices, setWeaponChoices] = useState({});
  const [spellChoices, setSpellChoices] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      if (partyId) {
        checkExistingCharacter(user.uid, partyId);
      }
      loadCharacterPresets(user.uid);
    });
    return () => unsubscribe();
  }, [navigate, partyId]);

  // If editing, load character data into form
  useEffect(() => {
    if (existingCharacter) {
      setCharacter({ ...existingCharacter });
      if (existingCharacter.weaponChoices) setWeaponChoices(existingCharacter.weaponChoices);
      if (existingCharacter.spellChoices) setSpellChoices(existingCharacter.spellChoices);
      if (existingCharacter.abilityScoreMethod) setAbilityScoreMethod(existingCharacter.abilityScoreMethod);
      if (existingCharacter.rolledScores) setRolledScores(existingCharacter.rolledScores);
      if (existingCharacter.assignedScores) setAssignedScores(existingCharacter.assignedScores);
      if (existingCharacter.rolledScores) setHasRolled(existingCharacter.rolledScores.length > 0);
    }
  }, [existingCharacter]);

  const checkExistingCharacter = async (userId, partyId) => {
    try {
      const existing = await getCharacterByUserAndParty(userId, partyId);
      setExistingCharacter(existing);
    } catch (error) {
      // Handle error silently or show user-friendly message
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

  const races = [
    'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Tiefling', 
    'Half-Elf', 'Half-Orc', 'Gnome', 'Aarakocra', 'Genasi', 'Goliath'
  ];

  const classes = [
    'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
    'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
  ];

  const alignments = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
  ];

  const backgrounds = [
    'Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier'
  ];

  // Standard D&D 5e ability score array
  const standardArray = [15, 14, 13, 12, 10, 8];

  // Weapon options for different classes
  const weaponOptions = {
    'Fighter': {
      'Martial Weapon': [
        'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip'
      ],
      'Shield': ['Shield']
    },
    'Paladin': {
      'Martial Weapon': [
        'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip'
      ],
      'Shield': ['Shield']
    },
    'Barbarian': {
      'Martial Melee Weapon': [
        'Battleaxe', 'Flail', 'Glaive', 'Greataxe', 'Greatsword', 'Halberd', 'Lance', 'Longsword', 'Maul', 'Morningstar', 'Pike', 'Rapier', 'Scimitar', 'Shortsword', 'Trident', 'War pick', 'Warhammer', 'Whip'
      ]
    },
    'Bard': {
      'Weapon': ['Rapier', 'Longsword']
    },
    'Druid': {
      'Simple Weapon': [
        'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear'
      ]
    },
    'Monk': {
      'Simple Weapon': [
        'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear'
      ]
    },
    'Sorcerer': {
      'Simple Weapon': [
        'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear'
      ]
    },
    'Warlock': {
      'Simple Weapon': [
        'Club', 'Dagger', 'Greatclub', 'Handaxe', 'Javelin', 'Light hammer', 'Mace', 'Quarterstaff', 'Sickle', 'Spear'
      ]
    }
  };

  // Spell options for spellcasting classes with descriptions
  const spellOptions = {
    'Wizard': [
      { name: 'Acid Splash', description: 'Throw acid at one or two creatures within 60 feet.' },
      { name: 'Blade Ward', description: 'Take the dodge action, gaining resistance to weapon damage.' },
      { name: 'Booming Blade', description: 'Make a melee attack that deals extra thunder damage if target moves.' },
      { name: 'Control Flames', description: 'Manipulate flames within 60 feet - double, halve, or change their color.' },
      { name: 'Create Bonfire', description: 'Create a bonfire that damages creatures who enter or start their turn in it.' },
      { name: 'Dancing Lights', description: 'Create up to four lights that you can move around within 60 feet.' },
      { name: 'Fire Bolt', description: 'Hurl a mote of fire at a target within 120 feet for 1d10 fire damage.' },
      { name: 'Friends', description: 'Gain advantage on Charisma checks against one creature for 1 minute.' },
      { name: 'Frostbite', description: 'Numb a creature within 60 feet, dealing cold damage and possibly giving disadvantage.' },
      { name: 'Green-Flame Blade', description: 'Make a melee attack that can also damage a second creature with fire.' },
      { name: 'Gust', description: 'Create a strong wind to push creatures or objects within 30 feet.' },
      { name: 'Infestation', description: 'Summon insects to attack a creature within 30 feet, dealing poison damage.' },
      { name: 'Light', description: 'Make an object glow like a torch for 1 hour.' },
      { name: 'Lightning Lure', description: 'Pull a creature within 15 feet toward you with lightning.' },
      { name: 'Mage Hand', description: 'Create a spectral hand that can manipulate objects within 30 feet.' },
      { name: 'Message', description: 'Whisper a message to a creature within 120 feet that only they can hear.' },
      { name: 'Mind Sliver', description: 'Deal psychic damage and reduce the target\'s next saving throw.' },
      { name: 'Minor Illusion', description: 'Create a sound or image of an object within 30 feet.' },
      { name: 'Mold Earth', description: 'Move earth and stone within 30 feet to create difficult terrain or cover.' },
      { name: 'Prestidigitation', description: 'Perform minor magical tricks - clean, soil, chill, warm, flavor, or color objects.' },
      { name: 'Ray of Frost', description: 'A frigid beam that deals cold damage and reduces target\'s speed by 10 feet.' },
      { name: 'Shape Water', description: 'Move and reshape water within 30 feet, or freeze it into simple shapes.' },
      { name: 'Shocking Grasp', description: 'Lightning springs from your hand, dealing lightning damage and preventing reactions.' },
      { name: 'Sword Burst', description: 'Create a burst of spectral swords that damage all creatures within 5 feet.' },
      { name: 'Thunderclap', description: 'Create a burst of thunderous sound that damages all creatures within 5 feet.' },
      { name: 'True Strike', description: 'Gain advantage on your next attack against the target within 30 feet.' }
    ],
    'Sorcerer': [
      { name: 'Acid Splash', description: 'Throw acid at one or two creatures within 60 feet.' },
      { name: 'Blade Ward', description: 'Take the dodge action, gaining resistance to weapon damage.' },
      { name: 'Booming Blade', description: 'Make a melee attack that deals extra thunder damage if target moves.' },
      { name: 'Control Flames', description: 'Manipulate flames within 60 feet - double, halve, or change their color.' },
      { name: 'Create Bonfire', description: 'Create a bonfire that damages creatures who enter or start their turn in it.' },
      { name: 'Dancing Lights', description: 'Create up to four lights that you can move around within 60 feet.' },
      { name: 'Fire Bolt', description: 'Hurl a mote of fire at a target within 120 feet for 1d10 fire damage.' },
      { name: 'Friends', description: 'Gain advantage on Charisma checks against one creature for 1 minute.' },
      { name: 'Frostbite', description: 'Numb a creature within 60 feet, dealing cold damage and possibly giving disadvantage.' },
      { name: 'Green-Flame Blade', description: 'Make a melee attack that can also damage a second creature with fire.' },
      { name: 'Gust', description: 'Create a strong wind to push creatures or objects within 30 feet.' },
      { name: 'Infestation', description: 'Summon insects to attack a creature within 30 feet, dealing poison damage.' },
      { name: 'Light', description: 'Make an object glow like a torch for 1 hour.' },
      { name: 'Lightning Lure', description: 'Pull a creature within 15 feet toward you with lightning.' },
      { name: 'Mage Hand', description: 'Create a spectral hand that can manipulate objects within 30 feet.' },
      { name: 'Message', description: 'Whisper a message to a creature within 120 feet that only they can hear.' },
      { name: 'Mind Sliver', description: 'Deal psychic damage and reduce the target\'s next saving throw.' },
      { name: 'Minor Illusion', description: 'Create a sound or image of an object within 30 feet.' },
      { name: 'Mold Earth', description: 'Move earth and stone within 30 feet to create difficult terrain or cover.' },
      { name: 'Prestidigitation', description: 'Perform minor magical tricks - clean, soil, chill, warm, flavor, or color objects.' },
      { name: 'Ray of Frost', description: 'A frigid beam that deals cold damage and reduces target\'s speed by 10 feet.' },
      { name: 'Shape Water', description: 'Move and reshape water within 30 feet, or freeze it into simple shapes.' },
      { name: 'Shocking Grasp', description: 'Lightning springs from your hand, dealing lightning damage and preventing reactions.' },
      { name: 'Sword Burst', description: 'Create a burst of spectral swords that damage all creatures within 5 feet.' },
      { name: 'Thunderclap', description: 'Create a burst of thunderous sound that damages all creatures within 5 feet.' },
      { name: 'True Strike', description: 'Gain advantage on your next attack against the target within 30 feet.' }
    ],
    'Warlock': [
      { name: 'Blade Ward', description: 'Take the dodge action, gaining resistance to weapon damage.' },
      { name: 'Booming Blade', description: 'Make a melee attack that deals extra thunder damage if target moves.' },
      { name: 'Create Bonfire', description: 'Create a bonfire that damages creatures who enter or start their turn in it.' },
      { name: 'Eldritch Blast', description: 'A beam of crackling energy that deals force damage and can hit multiple targets.' },
      { name: 'Friends', description: 'Gain advantage on Charisma checks against one creature for 1 minute.' },
      { name: 'Frostbite', description: 'Numb a creature within 60 feet, dealing cold damage and possibly giving disadvantage.' },
      { name: 'Green-Flame Blade', description: 'Make a melee attack that can also damage a second creature with fire.' },
      { name: 'Lightning Lure', description: 'Pull a creature within 15 feet toward you with lightning.' },
      { name: 'Mind Sliver', description: 'Deal psychic damage and reduce the target\'s next saving throw.' },
      { name: 'Minor Illusion', description: 'Create a sound or image of an object within 30 feet.' },
      { name: 'Prestidigitation', description: 'Perform minor magical tricks - clean, soil, chill, warm, flavor, or color objects.' },
      { name: 'Sword Burst', description: 'Create a burst of spectral swords that damage all creatures within 5 feet.' },
      { name: 'Thunderclap', description: 'Create a burst of thunderous sound that damages all creatures within 5 feet.' },
      { name: 'True Strike', description: 'Gain advantage on your next attack against the target within 30 feet.' }
    ],
    'Cleric': [
      { name: 'Guidance', description: 'Touch a creature to give them +1d4 to their next ability check.' },
      { name: 'Light', description: 'Make an object glow like a torch for 1 hour.' },
      { name: 'Mending', description: 'Repair a single break or tear in an object you touch.' },
      { name: 'Resistance', description: 'Touch a creature to give them +1d4 to their next saving throw.' },
      { name: 'Sacred Flame', description: 'Flame-like radiance descends on a creature within 60 feet, dealing radiant damage.' },
      { name: 'Spare the Dying', description: 'Touch a dying creature to stabilize them at 0 hit points.' },
      { name: 'Thaumaturgy', description: 'Perform minor magical tricks - make your voice boom, cause tremors, or change eye color.' }
    ],
    'Druid': [
      { name: 'Control Flames', description: 'Manipulate flames within 60 feet - double, halve, or change their color.' },
      { name: 'Create Bonfire', description: 'Create a bonfire that damages creatures who enter or start their turn in it.' },
      { name: 'Druidcraft', description: 'Predict weather, make a flower bloom, or create a harmless sensory effect.' },
      { name: 'Frostbite', description: 'Numb a creature within 60 feet, dealing cold damage and possibly giving disadvantage.' },
      { name: 'Gust', description: 'Create a strong wind to push creatures or objects within 30 feet.' },
      { name: 'Infestation', description: 'Summon insects to attack a creature within 30 feet, dealing poison damage.' },
      { name: 'Light', description: 'Make an object glow like a torch for 1 hour.' },
      { name: 'Lightning Lure', description: 'Pull a creature within 15 feet toward you with lightning.' },
      { name: 'Mage Hand', description: 'Create a spectral hand that can manipulate objects within 30 feet.' },
      { name: 'Mold Earth', description: 'Move earth and stone within 30 feet to create difficult terrain or cover.' },
      { name: 'Primal Savagery', description: 'Transform your hand into a claw that deals acid damage to a creature you touch.' },
      { name: 'Produce Flame', description: 'Create a flickering flame in your hand that you can throw for fire damage.' },
      { name: 'Ray of Frost', description: 'A frigid beam that deals cold damage and reduces target\'s speed by 10 feet.' },
      { name: 'Shape Water', description: 'Move and reshape water within 30 feet, or freeze it into simple shapes.' },
      { name: 'Shillelagh', description: 'Transform a club or quarterstaff into a magical weapon that uses your spellcasting ability.' },
      { name: 'Thorn Whip', description: 'Create a vine-like whip that pulls a creature toward you and deals piercing damage.' },
      { name: 'Thunderclap', description: 'Create a burst of thunderous sound that damages all creatures within 5 feet.' }
    ],
    'Bard': [
      { name: 'Blade Ward', description: 'Take the dodge action, gaining resistance to weapon damage.' },
      { name: 'Dancing Lights', description: 'Create up to four lights that you can move around within 60 feet.' },
      { name: 'Friends', description: 'Gain advantage on Charisma checks against one creature for 1 minute.' },
      { name: 'Light', description: 'Make an object glow like a torch for 1 hour.' },
      { name: 'Mage Hand', description: 'Create a spectral hand that can manipulate objects within 30 feet.' },
      { name: 'Mending', description: 'Repair a single break or tear in an object you touch.' },
      { name: 'Message', description: 'Whisper a message to a creature within 120 feet that only they can hear.' },
      { name: 'Minor Illusion', description: 'Create a sound or image of an object within 30 feet.' },
      { name: 'Prestidigitation', description: 'Perform minor magical tricks - clean, soil, chill, warm, flavor, or color objects.' },
      { name: 'True Strike', description: 'Gain advantage on your next attack against the target within 30 feet.' },
      { name: 'Vicious Mockery', description: 'Insult a creature within 60 feet, dealing psychic damage and possibly giving disadvantage.' }
    ]
  };

  // Spell limits by class (cantrips at level 1)
  const spellLimits = {
    'Wizard': { cantrips: 3, spells: 6 },
    'Sorcerer': { cantrips: 4, spells: 2 },
    'Warlock': { cantrips: 2, spells: 2 },
    'Cleric': { cantrips: 3, spells: 2 },
    'Druid': { cantrips: 2, spells: 2 },
    'Bard': { cantrips: 2, spells: 4 }
  };

  // Default starting equipment by class
  const getStartingEquipment = (characterClass) => {
    const baseEquipment = {
      'Fighter': [
        'Chain mail armor',
        'Light crossbow and 20 bolts',
        'Dungeoneer\'s pack',
        '5 gp'
      ],
      'Wizard': [
        'Arcane focus',
        'Scholar\'s pack',
        'Component pouch',
        '5 gp'
      ],
      'Cleric': [
        'Chain mail armor',
        'Light crossbow and 20 bolts',
        'Priest\'s pack',
        'Shield',
        'Holy symbol',
        '5 gp'
      ],
      'Rogue': [
        'Leather armor',
        'Shortbow and 20 arrows',
        'Burglar\'s pack',
        'Thieves\' tools',
        '5 gp'
      ],
      'Ranger': [
        'Scale mail armor',
        'Longbow and 20 arrows',
        'Explorer\'s pack',
        '5 gp'
      ],
      'Paladin': [
        'Chain mail armor',
        'Javelins (5)',
        'Priest\'s pack',
        'Holy symbol',
        '5 gp'
      ],
      'Barbarian': [
        'Javelins (4)',
        'Explorer\'s pack',
        '5 gp'
      ],
      'Bard': [
        'Leather armor',
        'Diplomat\'s pack OR entertainer\'s pack',
        'Lute OR any other musical instrument',
        '5 gp'
      ],
      'Druid': [
        'Leather armor',
        'Druidic focus',
        'Explorer\'s pack',
        'Shield',
        '5 gp'
      ],
      'Monk': [
        'Dungeoneer\'s pack OR explorer\'s pack',
        '5 gp'
      ],
      'Sorcerer': [
        'Component pouch OR arcane focus',
        'Dungeoneer\'s pack',
        '5 gp'
      ],
      'Warlock': [
        'Component pouch OR arcane focus',
        'Scholar\'s pack',
        '5 gp'
      ]
    };

    const equipment = [...(baseEquipment[characterClass] || ['Adventurer\'s pack', 'Simple weapon', '5 gp'])];
    
    // Add weapon choices
    if (weaponChoices.weapon) {
      equipment.push(weaponChoices.weapon);
    }
    if (weaponChoices.shield) {
      equipment.push(weaponChoices.shield);
    }
    
    // Add spell choices
    if (spellChoices.length > 0) {
      equipment.push(`Spells: ${spellChoices.join(', ')}`);
    }
    
    return equipment;
  };

  // Roll 4d6, drop lowest (D&D 5e method)
  const rollAbilityScore = () => {
    const rolls = [];
    for (let i = 0; i < 4; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    rolls.sort((a, b) => b - a); // Sort descending
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
  };

  const rollAllAbilityScores = () => {
    const scores = [];
    for (let i = 0; i < 6; i++) {
      scores.push(rollAbilityScore());
    }
    scores.sort((a, b) => b - a); // Sort descending
    setRolledScores(scores);
    setUnassignedScores([...scores]);
    setAssignedScores({});
    setHasRolled(true);
    return scores;
  };

  const assignScoreToAbility = (score, ability) => {
    // Remove score from unassigned
    const newUnassigned = unassignedScores.filter(s => s !== score);
    setUnassignedScores(newUnassigned);
    
    // Add to assigned scores
    setAssignedScores(prev => ({
      ...prev,
      [ability]: score
    }));
    
    // Update character
    handleInputChange(ability, score);
  };

  const unassignScore = (ability) => {
    const score = assignedScores[ability];
    if (score) {
      // Add back to unassigned
      setUnassignedScores(prev => [...prev, score].sort((a, b) => b - a));
      
      // Remove from assigned
      const newAssigned = { ...assignedScores };
      delete newAssigned[ability];
      setAssignedScores(newAssigned);
      
      // Reset character ability to default
      handleInputChange(ability, 10);
    }
  };

  const applyStandardArray = () => {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const newCharacter = { ...character };
    
    standardArray.forEach((score, index) => {
      newCharacter[abilities[index]] = score;
    });
    
    setCharacter(newCharacter);
    setAssignedScores({});
    setUnassignedScores([]);
    setHasRolled(false);
  };

  const handleInputChange = (field, value) => {
    setCharacter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      console.error('You must be logged in to create a character');
      return;
    }

    if (!partyId) {
      console.error('Party ID is missing. Please try again or contact support.');
      return;
    }

    // Validate required fields
    const requiredFields = ['name', 'race', 'class'];
    const missingFields = requiredFields.filter(field => !character[field]);
    
    if (missingFields.length > 0) {
      console.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const characterData = {
        ...character,
        userId: user.uid,
        partyId: partyId,
        equipment: getStartingEquipment(character.class),
        weapons: weaponChoices,
        spells: spellChoices,
        createdAt: existingCharacter ? existingCharacter.createdAt : new Date(),
        updatedAt: new Date()
      };
      if (existingCharacter) {
        // Update existing character
        await updateCharacter(existingCharacter.id, characterData);
        console.log('Character updated successfully!');
      } else {
        // Create new character
        await saveCharacter(user.uid, partyId, characterData);
        console.log('Character created successfully!');
      }
      navigate(`/campaign-story/${partyId}`);
    } catch (error) {
      console.error('Character creation/update error:', error);
      console.error('Error creating/updating character:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Character Preset Management Functions
  const saveCurrentAsPreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a name for your preset');
      return;
    }

    if (!character.name || !character.race || !character.class) {
      alert('Please fill in at least the basic character information (name, race, class) before saving as preset');
      return;
    }

    try {
      console.log('Saving preset with data:', {
        userId: user.uid,
        presetName: presetName,
        characterData: character,
        weaponChoices,
        spellChoices
      });

      const presetData = {
        name: presetName,
        data: {
          ...character,
          weaponChoices,
          spellChoices,
          abilityScoreMethod,
          rolledScores,
          assignedScores
        }
      };

      console.log('Calling saveCharacterPreset with:', presetData);
      const result = await saveCharacterPreset(user.uid, presetData);
      console.log('Preset saved successfully:', result);
      
      setPresetName('');
      setShowPresetModal(false);
      await loadCharacterPresets(user.uid);
      alert('Character preset saved successfully!');
    } catch (error) {
      console.error('Error saving preset:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.message.includes('User profile not found')) {
        alert('User profile not found. Please try logging out and back in.');
      } else if (error.message.includes('permission')) {
        alert('Permission denied. Please check your account status.');
      } else {
        alert(`Failed to save preset: ${error.message}`);
      }
    }
  };

  const handlePresetKeyPress = (e) => {
    if (e.key === 'Enter' && presetName.trim()) {
      saveCurrentAsPreset();
    }
  };

  const loadPreset = (preset) => {
    const presetData = preset.data;
    setCharacter({
      ...presetData,
      // Reset party-specific fields
      name: presetData.name + ' (Copy)',
      equipment: [],
      spells: presetData.spells || [],
      proficiencies: presetData.proficiencies || []
    });
    
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
  };

  const deletePreset = async (presetId) => {
    if (confirm('Are you sure you want to delete this preset? This action cannot be undone.')) {
      try {
        await deleteCharacterPreset(user.uid, presetId);
        await loadCharacterPresets(user.uid);
        alert('Preset deleted successfully!');
      } catch (error) {
        console.error('Error deleting preset:', error);
        alert('Failed to delete preset. Please try again.');
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="fantasy-container py-8">
      <div className="fantasy-card">
        <h1 className="fantasy-title text-center">Create Your Character</h1>
        <p className="text-center text-gray-300 mb-6">
          Create your character to join the campaign. Once created, you'll be automatically ready to start the adventure!
        </p>
        
        {/* Character Preset Management */}
        <div className="mb-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Character Presets</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              onClick={() => setShowLoadPresetModal(true)}
              className="fantasy-button bg-amber-600 hover:bg-amber-700"
              disabled={characterPresets.length === 0}
            >
              📋 Load Preset ({characterPresets.length})
            </button>
            <button
              type="button"
              onClick={() => setShowPresetModal(true)}
              className="fantasy-button bg-emerald-600 hover:bg-emerald-700"
            >
              💾 Save as Preset
            </button>
          </div>
          {characterPresets.length > 0 && (
            <p className="text-sm text-gray-300">
              Save your current character configuration as a preset to easily recreate it for other parties.
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Character Name
              </label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="fantasy-input"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Race
              </label>
              <select
                value={character.race}
                onChange={(e) => handleInputChange('race', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Race</option>
                {races.map(race => (
                  <option key={race} value={race}>{race}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Class
              </label>
              <select
                value={character.class}
                onChange={(e) => handleInputChange('class', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Background
              </label>
              <select
                value={character.background}
                onChange={(e) => handleInputChange('background', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Background</option>
                {backgrounds.map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Alignment
              </label>
              <select
                value={character.alignment}
                onChange={(e) => handleInputChange('alignment', e.target.value)}
                className="fantasy-input"
                required
              >
                <option value="">Select Alignment</option>
                {alignments.map(align => (
                  <option key={align} value={align}>{align}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ability Scores */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Ability Scores</h2>
            
            {/* Ability Score Generation Method */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Ability Score Generation Method
              </label>
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="abilityMethod"
                    value="standard"
                    checked={abilityScoreMethod === 'standard'}
                    onChange={(e) => setAbilityScoreMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-gray-200">Standard Array (15, 14, 13, 12, 10, 8)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="abilityMethod"
                    value="roll"
                    checked={abilityScoreMethod === 'roll'}
                    onChange={(e) => setAbilityScoreMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-gray-200">Roll 4d6, Drop Lowest</span>
                </label>
              </div>
              
              {abilityScoreMethod === 'standard' && (
                <button
                  type="button"
                  onClick={applyStandardArray}
                  className="fantasy-button bg-gray-600 hover:bg-gray-700"
                >
                  Apply Standard Array
                </button>
              )}
              
              {abilityScoreMethod === 'roll' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={rollAllAbilityScores}
                    disabled={hasRolled}
                    className={`fantasy-button ${hasRolled ? 'bg-gray-500 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'}`}
                  >
                    {hasRolled ? 'Scores Already Rolled' : 'Roll Ability Scores'}
                  </button>
                  {hasRolled && (
                    <p className="text-sm text-gray-300">
                      You can only roll once, but you can reassign scores as many times as you like.
                    </p>
                  )}
                  {rolledScores.length > 0 && (
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-100 mb-2">Rolled Scores</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {unassignedScores.map((score, index) => (
                          <span
                            key={`${score}-${index}`}
                            className="bg-amber-900 text-amber-200 border border-amber-600 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {score}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-300">
                        Click on an ability score below to assign your rolled scores. You can reassign them as many times as you want.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Ability Score Assignment */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map(ability => {
                const assignedScore = assignedScores[ability];
                const currentValue = character[ability];
                
                return (
                  <div key={ability} className="border border-gray-600 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-200 mb-2 capitalize">
                      {ability}
                    </label>
                    
                    {assignedScore ? (
                      // Show assigned score
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-amber-400">{assignedScore}</div>
                        <button
                          type="button"
                          onClick={() => unassignScore(ability)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Unassign
                        </button>
                      </div>
                    ) : (
                      // Show assignment options
                      <div className="space-y-2">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={currentValue}
                          onChange={(e) => handleInputChange(ability, parseInt(e.target.value))}
                          className="fantasy-input"
                          required
                        />
                        {unassignedScores.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {unassignedScores.map((score, index) => (
                              <button
                                key={`${score}-${index}`}
                                type="button"
                                onClick={() => assignScoreToAbility(score, ability)}
                                className="bg-amber-900 hover:bg-amber-800 border border-amber-600 text-amber-200 px-2 py-1 rounded text-xs font-medium"
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-1">
                      Modifier: {Math.floor((currentValue - 10) / 2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physical Description */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Physical Description</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Age"
                value={character.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Height"
                value={character.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Weight"
                value={character.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Eye Color"
                value={character.eyes}
                onChange={(e) => handleInputChange('eyes', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Skin Color"
                value={character.skin}
                onChange={(e) => handleInputChange('skin', e.target.value)}
                className="fantasy-input"
              />
              <input
                type="text"
                placeholder="Hair Color"
                value={character.hair}
                onChange={(e) => handleInputChange('hair', e.target.value)}
                className="fantasy-input"
              />
            </div>
          </div>

          {/* Character Personality */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Personality</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Personality Traits
                </label>
                <textarea
                  value={character.personality}
                  onChange={(e) => handleInputChange('personality', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="Describe your character's personality..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Ideals
                </label>
                <textarea
                  value={character.ideals}
                  onChange={(e) => handleInputChange('ideals', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What does your character believe in?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Bonds
                </label>
                <textarea
                  value={character.bonds}
                  onChange={(e) => handleInputChange('bonds', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What connections does your character have?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Flaws
                </label>
                <textarea
                  value={character.flaws}
                  onChange={(e) => handleInputChange('flaws', e.target.value)}
                  className="fantasy-input"
                  rows="3"
                  placeholder="What are your character's weaknesses?"
                />
              </div>
            </div>
          </div>

          {/* Backstory */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Backstory</h2>
            <textarea
              value={character.backstory}
              onChange={(e) => handleInputChange('backstory', e.target.value)}
              className="fantasy-input"
              rows="6"
              placeholder="Tell the story of your character's life before the adventure..."
            />
          </div>

          {/* Equipment */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Starting Equipment</h2>
            
            {/* Weapon Selection */}
            {character.class && weaponOptions[character.class] && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Choose Your Weapons</h3>
                <div className="space-y-4">
                  {Object.entries(weaponOptions[character.class]).map(([category, weapons]) => (
                    <div key={category}>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        {category}
                      </label>
                      <select
                        value={weaponChoices[category.toLowerCase().replace(/\s+/g, '')] || ''}
                        onChange={(e) => setWeaponChoices(prev => ({
                          ...prev,
                          [category.toLowerCase().replace(/\s+/g, '')]: e.target.value
                        }))}
                        className="fantasy-input"
                      >
                        <option value="">Select {category}</option>
                        {weapons.map(weapon => (
                          <option key={weapon} value={weapon}>{weapon}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spell Selection */}
            {character.class && spellOptions[character.class] && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-3">Choose Your Cantrips</h3>
                <p className="text-sm text-gray-300 mb-3">
                  Select your starting cantrips (0-level spells). You can choose up to {spellLimits[character.class]?.cantrips || 0} cantrips.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-600 rounded-lg p-4">
                  {spellOptions[character.class].map(spell => {
                    const isSelected = spellChoices.includes(spell.name);
                    const isDisabled = !isSelected && spellChoices.length >= (spellLimits[character.class]?.cantrips || 0);
                    
                    return (
                      <div 
                        key={spell.name} 
                        className={`border rounded-lg p-3 ${isSelected ? 'border-amber-500 bg-amber-900/20' : 'border-gray-600'} ${isDisabled ? 'opacity-50' : 'hover:border-gray-500'}`}
                      >
                        <label className={`flex items-start space-x-3 cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSpellChoices(prev => [...prev, spell.name]);
                              } else {
                                setSpellChoices(prev => prev.filter(s => s !== spell.name));
                              }
                            }}
                            className="rounded mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-100">{spell.name}</div>
                            <div className="text-sm text-gray-300 mt-1">{spell.description}</div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-sm text-gray-400">
                    Selected: {spellChoices.length} / {spellLimits[character.class]?.cantrips || 0} cantrips
                  </p>
                  {spellChoices.length >= (spellLimits[character.class]?.cantrips || 0) && (
                    <p className="text-sm text-green-400 font-medium">
                      ✓ Cantrip selection complete
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Equipment Display */}
            {character.class ? (
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <h3 className="font-semibold text-gray-100 mb-3">
                  {character.class} Starting Equipment
                </h3>
                <ul className="space-y-1">
                  {getStartingEquipment(character.class).map((item, index) => (
                    <li key={index} className="text-gray-200 flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-300 mt-3">
                  This equipment will be automatically assigned to your character.
                </p>
              </div>
            ) : (
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <p className="text-gray-300">
                  Select a class to see your starting equipment.
                </p>
              </div>
            )}
          </div>

          {/* Character Portrait */}
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Character Portrait</h2>
            <div className="flex items-center space-x-4">
              <div className="w-32 h-32 bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">Portrait Placeholder</span>
              </div>
              <button
                type="button"
                className="fantasy-button"
                onClick={() => {/* TODO: Add image upload functionality */}}
              >
                Upload Image
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/campaign-story/${partyId}`)}
              className="fantasy-button bg-gray-600 hover:bg-gray-700"
              disabled={loading}
            >
              Back to Campaign
            </button>
            <button
              type="submit"
              className="fantasy-button"
              disabled={loading}
            >
              {loading ? 'Creating Character...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="fantasy-card max-w-md w-full mx-4">
            <h3 className="fantasy-title text-center mb-4">Save Character Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyPress={handlePresetKeyPress}
                  className="fantasy-input"
                  placeholder="Enter a name for your preset"
                  autoFocus
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPresetModal(false);
                    setPresetName('');
                  }}
                  className="fantasy-button bg-gray-600 hover:bg-gray-700 flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCurrentAsPreset}
                  className="fantasy-button bg-emerald-600 hover:bg-emerald-700 flex-1"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Load Preset Modal */}
      {showLoadPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="fantasy-card max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="fantasy-title text-center mb-4">Load Character Preset</h3>
            {characterPresets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300 mb-4">No character presets found.</p>
                <p className="text-sm text-gray-400">
                  Create a character and save it as a preset to see it here.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLoadPresetModal(false)}
                  className="fantasy-button mt-4"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4">
                  {characterPresets.map((preset) => (
                    <div key={preset.id} className="border border-gray-600 rounded-lg p-4 hover:border-gray-500">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-100">{preset.name}</h4>
                          <p className="text-sm text-gray-300">
                            {preset.data.race} {preset.data.class} • Level {preset.data.level}
                          </p>
                          {preset.data.background && (
                            <p className="text-sm text-gray-400">{preset.data.background}</p>
                          )}
                          {preset.createdAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Created: {new Date(preset.createdAt.toDate()).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deletePreset(preset.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Delete preset"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => loadPreset(preset)}
                          className="fantasy-button bg-amber-600 hover:bg-amber-700 flex-1"
                        >
                          Load Preset
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowLoadPresetModal(false)}
                    className="fantasy-button bg-gray-600 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 