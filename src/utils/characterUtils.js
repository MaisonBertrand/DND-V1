// Character utility functions - consolidated from duplicate code across components

/**
 * Calculate ability modifier from ability score
 * @param {number} score - The ability score
 * @returns {number} The ability modifier
 */
export const getAbilityModifier = (score) => {
  return Math.floor((score - 10) / 2);
};

/**
 * Calculate proficiency bonus based on level
 * @param {number} level - Character level
 * @returns {number} Proficiency bonus
 */
export const getProficiencyBonus = (level) => {
  return Math.floor((level - 1) / 4) + 2;
};

/**
 * Get ability score color based on score value
 * @param {number} score - The ability score
 * @returns {string} CSS color class
 */
export const getAbilityScoreColor = (score) => {
  if (score >= 18) return 'text-purple-400';
  if (score >= 16) return 'text-blue-400';
  if (score >= 14) return 'text-green-400';
  if (score >= 12) return 'text-yellow-400';
  if (score >= 10) return 'text-orange-400';
  return 'text-red-400';
};

/**
 * Get rarity color for items
 * @param {string} rarity - Item rarity
 * @returns {string} CSS color class
 */
export const getRarityColor = (rarity) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return 'text-gray-300';
    case 'uncommon': return 'text-green-400';
    case 'rare': return 'text-blue-400';
    case 'very rare': return 'text-purple-400';
    case 'legendary': return 'text-orange-400';
    default: return 'text-gray-300';
  }
};

/**
 * Get character status color
 * @param {string} status - Character status
 * @returns {string} CSS color class
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'Ready': return 'text-green-400';
    case 'Injured': return 'text-yellow-400';
    case 'Dead': return 'text-red-400';
    case 'No Character': return 'text-red-400';
    default: return 'text-slate-400';
  }
};

/**
 * Get character status icon
 * @param {string} status - Character status
 * @returns {string} Emoji icon
 */
export const getStatusIcon = (status) => {
  switch (status) {
    case 'Ready': return '✅';
    case 'Injured': return '⚠️';
    case 'Dead': return '💀';
    case 'No Character': return '❌';
    default: return '❓';
  }
};

/**
 * Get difficulty description based on DC
 * @param {number} dc - Difficulty class
 * @returns {string} Difficulty description
 */
export const getDifficultyDescription = (dc) => {
  if (dc <= 5) return 'Very Easy';
  if (dc <= 10) return 'Easy';
  if (dc <= 15) return 'Medium';
  if (dc <= 20) return 'Hard';
  if (dc <= 25) return 'Very Hard';
  return 'Nearly Impossible';
};

/**
 * Calculate XP progress percentage
 * @param {number} currentXP - Current XP
 * @param {number} level - Current level
 * @returns {number} Progress percentage (0-100)
 */
export const calculateXPProgress = (currentXP, level) => {
  const xpForNextLevel = level * 100;
  const xpProgress = currentXP % 100;
  return (xpProgress / 100) * 100;
};

/**
 * Get character class color
 * @param {string} characterClass - Character class
 * @returns {string} CSS color class
 */
export const getClassColor = (characterClass) => {
  const classColors = {
    'fighter': 'text-red-400',
    'wizard': 'text-blue-400',
    'rogue': 'text-purple-400',
    'cleric': 'text-yellow-400',
    'ranger': 'text-green-400',
    'paladin': 'text-amber-400',
    'barbarian': 'text-orange-400',
    'bard': 'text-pink-400',
    'druid': 'text-emerald-400',
    'monk': 'text-indigo-400',
    'sorcerer': 'text-cyan-400',
    'warlock': 'text-violet-400'
  };
  return classColors[characterClass?.toLowerCase()] || 'text-gray-400';
};

/**
 * Get character race color
 * @param {string} race - Character race
 * @returns {string} CSS color class
 */
export const getRaceColor = (race) => {
  const raceColors = {
    'human': 'text-amber-400',
    'elf': 'text-green-400',
    'dwarf': 'text-orange-400',
    'halfling': 'text-yellow-400',
    'dragonborn': 'text-red-400',
    'tiefling': 'text-purple-400',
    'gnome': 'text-blue-400',
    'half-orc': 'text-gray-400',
    'half-elf': 'text-pink-400'
  };
  return raceColors[race?.toLowerCase()] || 'text-gray-400';
};

/**
 * Format ability modifier for display
 * @param {number} modifier - Ability modifier
 * @returns {string} Formatted modifier string
 */
export const formatAbilityModifier = (modifier) => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

/**
 * Calculate armor class
 * @param {Object} character - Character object
 * @returns {number} Armor class
 */
export const calculateArmorClass = (character) => {
  const baseAC = 10;
  const dexMod = getAbilityModifier(character.dexterity || 10);
  const armorBonus = character.armorClass || 0;
  return baseAC + dexMod + armorBonus;
};

/**
 * Calculate hit points
 * @param {Object} character - Character object
 * @returns {number} Hit points
 */
export const calculateHitPoints = (character) => {
  const conMod = getAbilityModifier(character.constitution || 10);
  const baseHP = character.level * 5; // Simplified calculation
  return baseHP + (conMod * character.level);
}; 