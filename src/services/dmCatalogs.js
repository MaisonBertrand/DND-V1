export class DMCatalogsService {
  constructor() {
    this.monsters = this.initializeMonsters();
    this.items = this.initializeItems();
    this.spells = this.initializeSpells();
    this.npcs = this.initializeNPCs();
  }

  // Monster Catalog
  initializeMonsters() {
    return [
      {
        id: 'goblin',
        name: 'Goblin',
        type: 'Humanoid',
        cr: '1/4',
        hp: '7 (2d6)',
        ac: 15,
        speed: '30 ft.',
        stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
        actions: [
          { name: 'Scimitar', type: 'Melee Weapon Attack', attack: '+4', damage: '1d6+2 slashing' },
          { name: 'Shortbow', type: 'Ranged Weapon Attack', attack: '+4', damage: '1d6+2 piercing', range: '80/320 ft.' }
        ],
        description: 'Small, green-skinned humanoids that live in caves and ruins.'
      },
      {
        id: 'orc',
        name: 'Orc',
        type: 'Humanoid',
        cr: '1/2',
        hp: '15 (2d8+6)',
        ac: 13,
        speed: '30 ft.',
        stats: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
        actions: [
          { name: 'Greataxe', type: 'Melee Weapon Attack', attack: '+5', damage: '1d12+3 slashing' },
          { name: 'Javelin', type: 'Ranged Weapon Attack', attack: '+5', damage: '1d6+3 piercing', range: '30/120 ft.' }
        ],
        description: 'Large, muscular humanoids with tusks and greenish skin.'
      },
      {
        id: 'dragon',
        name: 'Young Red Dragon',
        type: 'Dragon',
        cr: '10',
        hp: '178 (17d10+85)',
        ac: 18,
        speed: '40 ft., fly 80 ft.',
        stats: { str: 23, dex: 14, con: 21, int: 14, wis: 11, cha: 19 },
        actions: [
          { name: 'Bite', type: 'Melee Weapon Attack', attack: '+10', damage: '2d10+6 piercing' },
          { name: 'Claw', type: 'Melee Weapon Attack', attack: '+10', damage: '2d6+6 slashing' },
          { name: 'Fire Breath', type: 'Cone', damage: '7d6 fire', save: 'DC 17 Dex' }
        ],
        description: 'A young red dragon with scales the color of molten rock.'
      }
    ];
  }

  // Item Catalog
  initializeItems() {
    return [
      {
        id: 'sword',
        name: 'Longsword',
        type: 'Weapon',
        rarity: 'Common',
        damage: '1d8 slashing',
        properties: ['Versatile (1d10)'],
        description: 'A well-crafted steel longsword.'
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'Armor',
        rarity: 'Common',
        ac: '+2',
        description: 'A wooden shield reinforced with metal.'
      },
      {
        id: 'potion_healing',
        name: 'Potion of Healing',
        type: 'Potion',
        rarity: 'Common',
        effect: 'Restores 2d4+2 hit points',
        description: 'A red liquid that glows with magical energy.'
      },
      {
        id: 'ring_protection',
        name: 'Ring of Protection',
        type: 'Ring',
        rarity: 'Rare',
        effect: '+1 to AC and saving throws',
        description: 'A simple ring that provides magical protection.'
      }
    ];
  }

  // Spell Catalog
  initializeSpells() {
    return [
      {
        id: 'fireball',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.',
        damage: '8d6 fire',
        save: 'DC 15 Dex'
      },
      {
        id: 'magic_missile',
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: '120 feet',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'You create three glowing darts of magical force.',
        damage: '1d4+1 force per missile'
      },
      {
        id: 'cure_wounds',
        name: 'Cure Wounds',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: 'Touch',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
        healing: '1d8 + modifier'
      }
    ];
  }

  // NPC Catalog
  initializeNPCs() {
    return [
      {
        id: 'merchant',
        name: 'Merchant',
        type: 'Commoner',
        occupation: 'Trader',
        personality: 'Friendly and eager to make a sale',
        description: 'A well-dressed merchant with a cart full of goods.',
        inventory: ['Various trade goods', 'Basic weapons', 'Simple tools']
      },
      {
        id: 'guard',
        name: 'City Guard',
        type: 'Guard',
        occupation: 'Law Enforcement',
        personality: 'Vigilant and duty-bound',
        description: 'A stern-looking guard in chain mail with a spear.',
        equipment: ['Chain mail', 'Spear', 'Shield']
      },
      {
        id: 'sage',
        name: 'Wise Sage',
        type: 'Scholar',
        occupation: 'Lore Keeper',
        personality: 'Knowledgeable but sometimes absent-minded',
        description: 'An elderly scholar surrounded by books and scrolls.',
        knowledge: ['Ancient history', 'Arcane lore', 'Local legends']
      }
    ];
  }

  // Search functions
  searchMonsters(query) {
    return this.monsters.filter(monster => 
      monster.name.toLowerCase().includes(query.toLowerCase()) ||
      monster.type.toLowerCase().includes(query.toLowerCase()) ||
      monster.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchItems(query) {
    return this.items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchSpells(query) {
    return this.spells.filter(spell => 
      spell.name.toLowerCase().includes(query.toLowerCase()) ||
      spell.school.toLowerCase().includes(query.toLowerCase()) ||
      spell.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchNPCs(query) {
    return this.npcs.filter(npc => 
      npc.name.toLowerCase().includes(query.toLowerCase()) ||
      npc.occupation.toLowerCase().includes(query.toLowerCase()) ||
      npc.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get by ID
  getMonsterById(id) {
    return this.monsters.find(monster => monster.id === id);
  }

  getItemById(id) {
    return this.items.find(item => item.id === id);
  }

  getSpellById(id) {
    return this.spells.find(spell => spell.id === id);
  }

  getNPCById(id) {
    return this.npcs.find(npc => npc.id === id);
  }

  // Random selection
  getRandomMonster() {
    return this.monsters[Math.floor(Math.random() * this.monsters.length)];
  }

  getRandomItem() {
    return this.items[Math.floor(Math.random() * this.items.length)];
  }

  getRandomSpell() {
    return this.spells[Math.floor(Math.random() * this.spells.length)];
  }

  getRandomNPC() {
    return this.npcs[Math.floor(Math.random() * this.npcs.length)];
  }
}

export const dmCatalogsService = new DMCatalogsService(); 