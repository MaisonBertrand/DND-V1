// Combat data constants and configurations

export const actionTypes = {
  attack: { 
    name: 'Attack', 
    cooldown: 0, 
    priority: 'normal',
    description: 'A basic physical attack',
    narrativeTemplate: '{character} {action} with {weapon}!'
  },
  spell: { 
    name: 'Cast Spell', 
    cooldown: 1, 
    priority: 'normal',
    description: 'Cast a magical spell',
    narrativeTemplate: '{character} channels arcane energy into {spell}!'
  },
  special: { 
    name: 'Special Ability', 
    cooldown: 2, 
    priority: 'high',
    description: 'Use a special class ability',
    narrativeTemplate: '{character} unleashes their {ability}!'
  },
  item: { 
    name: 'Use Item', 
    cooldown: 0, 
    priority: 'low',
    description: 'Use an item or consumable',
    narrativeTemplate: '{character} uses {item}!'
  },
  defend: { 
    name: 'Defend', 
    cooldown: 0, 
    priority: 'high',
    description: 'Take a defensive stance',
    narrativeTemplate: '{character} takes a defensive stance!'
  },
  environmental: {
    name: 'Environmental Action',
    cooldown: 1,
    priority: 'normal',
    description: 'Use the environment to your advantage',
    narrativeTemplate: '{character} uses the {environment} to their advantage!'
  },
  teamUp: {
    name: 'Team Up',
    cooldown: 3,
    priority: 'high',
    description: 'Coordinate with another party member',
    narrativeTemplate: '{character} coordinates with {ally} for a powerful combination!'
  }
};

export const statusEffects = {
  poisoned: {
    name: 'Poisoned',
    duration: 3,
    effect: 'lose 1 HP per turn',
    narrative: 'is suffering from poison'
  },
  burned: {
    name: 'Burned',
    duration: 2,
    effect: 'lose 2 HP per turn',
    narrative: 'is burning with magical flames'
  },
  frozen: {
    name: 'Frozen',
    duration: 1,
    effect: 'skip next turn',
    narrative: 'is frozen solid'
  },
  paralyzed: {
    name: 'Paralyzed',
    duration: 2,
    effect: '50% chance to skip turn',
    narrative: 'is paralyzed and can barely move'
  },
  confused: {
    name: 'Confused',
    duration: 2,
    effect: 'may attack randomly',
    narrative: 'is confused and disoriented'
  },
  blessed: {
    name: 'Blessed',
    duration: 3,
    effect: '+2 to attack rolls',
    narrative: 'is blessed with divine favor'
  },
  hasted: {
    name: 'Hasted',
    duration: 2,
    effect: 'extra action per turn',
    narrative: 'is moving with supernatural speed'
  }
};

export const classAbilities = {
  fighter: {
    name: 'Second Wind',
    description: 'Recover some HP',
    effect: 'heal 1d6+2 HP',
    cooldown: 3
  },
  wizard: {
    name: 'Arcane Surge',
    description: 'Enhance next spell',
    effect: '+2 to spell damage',
    cooldown: 2
  },
  rogue: {
    name: 'Sneak Attack',
    description: 'Deal extra damage from stealth',
    effect: '+1d6 damage if target is unaware',
    cooldown: 1
  },
  cleric: {
    name: 'Divine Favor',
    description: 'Bless an ally',
    effect: 'target gets +1 to all rolls',
    cooldown: 2
  }
};

export const enemyTypes = {
  priest: {
    primaryAttribute: 'wisdom',
    specialAttacks: ['Divine Healing', 'Divine Smite'],
    spellTypes: ['healing', 'divine']
  },
  wizard: {
    primaryAttribute: 'intelligence',
    specialAttacks: ['Fireball', 'Lightning', 'Ice', 'Arcane'],
    spellTypes: ['fireball', 'lightning', 'ice', 'arcane']
  },
  boss: {
    primaryAttribute: 'strength',
    specialAttacks: ['Devastating Strike'],
    spellTypes: []
  },
  dragon: {
    primaryAttribute: 'strength',
    specialAttacks: ['Devastating Strike'],
    spellTypes: []
  },
  undead: {
    primaryAttribute: 'constitution',
    specialAttacks: ['Death Touch'],
    spellTypes: ['necrotic']
  },
  skeleton: {
    primaryAttribute: 'constitution',
    specialAttacks: ['Death Touch'],
    spellTypes: ['necrotic']
  },
  zombie: {
    primaryAttribute: 'constitution',
    specialAttacks: ['Death Touch'],
    spellTypes: ['necrotic']
  }
}; 