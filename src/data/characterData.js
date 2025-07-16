// Character creation data arrays and options

export const races = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Tiefling', 'Half-Elf', 'Half-Orc', 'Gnome'
];

export const classes = [
  'Fighter', 'Wizard', 'Cleric', 'Rogue', 'Ranger', 'Paladin', 'Bard', 'Barbarian', 'Druid', 'Monk', 'Sorcerer', 'Warlock'
];

export const alignments = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

export const backgrounds = [
  'Acolyte', 'Criminal', 'Folk Hero', 'Noble', 'Sage', 'Soldier',
  'Charlatan', 'Entertainer', 'Guild Artisan', 'Hermit', 'Outlander', 'Urchin'
];

export const standardArray = [15, 14, 13, 12, 10, 8];

export const weaponOptions = {
  'Fighter': {
    'Martial Weapon': ['Longsword', 'Battleaxe', 'Warhammer', 'Greatsword', 'Greataxe', 'Halberd'],
    'Simple Weapon': ['Shortsword', 'Mace', 'Handaxe', 'Spear', 'Crossbow, light']
  },
  'Wizard': {
    'Simple Weapon': ['Quarterstaff', 'Dagger', 'Crossbow, light']
  },
  'Cleric': {
    'Simple Weapon': ['Mace', 'Warhammer', 'Crossbow, light', 'Light crossbow']
  },
  'Rogue': {
    'Simple Weapon': ['Shortsword', 'Shortbow', 'Rapier', 'Hand crossbow']
  },
  'Ranger': {
    'Martial Weapon': ['Longsword', 'Shortsword', 'Longbow', 'Shortbow'],
    'Simple Weapon': ['Handaxe', 'Light hammer', 'Spear']
  },
  'Paladin': {
    'Martial Weapon': ['Longsword', 'Warhammer', 'Battleaxe', 'Greataxe'],
    'Simple Weapon': ['Mace', 'Handaxe', 'Spear']
  },
  'Bard': {
    'Simple Weapon': ['Rapier', 'Longsword', 'Shortsword', 'Crossbow, light']
  },
  'Barbarian': {
    'Martial Weapon': ['Greataxe', 'Greatsword', 'Battleaxe', 'Warhammer'],
    'Simple Weapon': ['Handaxe', 'Spear', 'Light hammer']
  },
  'Druid': {
    'Simple Weapon': ['Quarterstaff', 'Spear', 'Dagger', 'Sling']
  },
  'Monk': {
    'Simple Weapon': ['Shortsword', 'Quarterstaff', 'Spear', 'Dagger']
  },
  'Sorcerer': {
    'Simple Weapon': ['Quarterstaff', 'Dagger', 'Crossbow, light']
  },
  'Warlock': {
    'Simple Weapon': ['Quarterstaff', 'Dagger', 'Crossbow, light']
  }
};

export const spellOptions = {
  'Wizard': [
    { name: 'Acid Splash', description: 'Hurl a bubble of acid at one or two creatures within range.' },
    { name: 'Blade Ward', description: 'Extend your hand and trace a sigil of warding in the air.' },
    { name: 'Booming Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Control Flames', description: 'You choose nonmagical flame that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Create Bonfire', description: 'You create a bonfire on ground that you can see within range.' },
    { name: 'Dancing Lights', description: 'You create up to four torch-sized lights within range.' },
    { name: 'Fire Bolt', description: 'You hurl a mote of fire at a creature or object within range.' },
    { name: 'Friends', description: 'For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn\'t hostile toward you.' },
    { name: 'Frostbite', description: 'You cause numbing frost to form on one creature that you can see within range.' },
    { name: 'Green-Flame Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Gust', description: 'You seize the air and compel it to create one of the following effects at a point you can see within range.' },
    { name: 'Light', description: 'You touch one object that is no larger than 10 feet in any dimension.' },
    { name: 'Lightning Lure', description: 'You create a lash of lightning energy that strikes at one creature of your choice that you can see within range.' },
    { name: 'Mage Hand', description: 'A spectral, floating hand appears at a point you choose within range.' },
    { name: 'Message', description: 'You point your finger toward a creature within range and whisper a message.' },
    { name: 'Mind Sliver', description: 'You drive a disorienting spike of psychic energy into the mind of one creature you can see within range.' },
    { name: 'Minor Illusion', description: 'You create a sound or an image of an object within range that lasts for the duration.' },
    { name: 'Mold Earth', description: 'You choose a portion of dirt or stone that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Prestidigitation', description: 'This spell is a minor magical trick that novice spellcasters use for practice.' },
    { name: 'Ray of Frost', description: 'A frigid beam of blue-white light streaks toward a creature within range.' },
    { name: 'Shape Water', description: 'You choose an area of water that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Shocking Grasp', description: 'Lightning springs from your hand to deliver a shock to a creature you try to touch.' },
    { name: 'Sword Burst', description: 'You create a momentary circle of spectral blades that sweep around you.' },
    { name: 'Thunderclap', description: 'You create a burst of thunderous sound that can be heard up to 100 feet away.' },
    { name: 'True Strike', description: 'Your next attack roll against the target has advantage if you make it before the end of your next turn.' }
  ],
  'Cleric': [
    { name: 'Guidance', description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.' },
    { name: 'Light', description: 'You touch one object that is no larger than 10 feet in any dimension.' },
    { name: 'Mending', description: 'This spell repairs a single break or tear in an object you touch.' },
    { name: 'Resistance', description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one saving throw of its choice.' },
    { name: 'Sacred Flame', description: 'Flame-like radiance descends on a creature that you can see within range.' },
    { name: 'Spare the Dying', description: 'You touch a living creature that has 0 hit points. The creature becomes stable.' },
    { name: 'Thaumaturgy', description: 'You manifest a minor wonder, a sign of supernatural power, within range.' }
  ],
  'Druid': [
    { name: 'Control Flames', description: 'You choose nonmagical flame that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Create Bonfire', description: 'You create a bonfire on ground that you can see within range.' },
    { name: 'Druidcraft', description: 'Whispering to the spirits of nature, you create one of the following effects within range.' },
    { name: 'Frostbite', description: 'You cause numbing frost to form on one creature that you can see within range.' },
    { name: 'Gust', description: 'You seize the air and compel it to create one of the following effects at a point you can see within range.' },
    { name: 'Infestation', description: 'You cause a cloud of mites, fleas, and other parasites to appear momentarily on one creature you can see within range.' },
    { name: 'Magic Stone', description: 'You touch one to three pebbles and imbue them with magic.' },
    { name: 'Mold Earth', description: 'You choose a portion of dirt or stone that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Primal Savagery', description: 'You channel primal magic to cause your teeth or fingernails to sharpen, ready to deliver a corrosive attack.' },
    { name: 'Produce Flame', description: 'A flickering flame appears in your hand.' },
    { name: 'Shape Water', description: 'You choose an area of water that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Shillelagh', description: 'The wood of a club or quarterstaff you are holding is imbued with nature\'s power.' },
    { name: 'Thorn Whip', description: 'You create a long, vine-like whip covered in thorns that lashes out at your command toward a creature in range.' },
    { name: 'Thunderclap', description: 'You create a burst of thunderous sound that can be heard up to 100 feet away.' }
  ],
  'Sorcerer': [
    { name: 'Acid Splash', description: 'Hurl a bubble of acid at one or two creatures within range.' },
    { name: 'Blade Ward', description: 'Extend your hand and trace a sigil of warding in the air.' },
    { name: 'Booming Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Control Flames', description: 'You choose nonmagical flame that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Create Bonfire', description: 'You create a bonfire on ground that you can see within range.' },
    { name: 'Dancing Lights', description: 'You create up to four torch-sized lights within range.' },
    { name: 'Fire Bolt', description: 'You hurl a mote of fire at a creature or object within range.' },
    { name: 'Friends', description: 'For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn\'t hostile toward you.' },
    { name: 'Frostbite', description: 'You cause numbing frost to form on one creature that you can see within range.' },
    { name: 'Green-Flame Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Gust', description: 'You seize the air and compel it to create one of the following effects at a point you can see within range.' },
    { name: 'Light', description: 'You touch one object that is no larger than 10 feet in any dimension.' },
    { name: 'Lightning Lure', description: 'You create a lash of lightning energy that strikes at one creature of your choice that you can see within range.' },
    { name: 'Mage Hand', description: 'A spectral, floating hand appears at a point you choose within range.' },
    { name: 'Message', description: 'You point your finger toward a creature within range and whisper a message.' },
    { name: 'Mind Sliver', description: 'You drive a disorienting spike of psychic energy into the mind of one creature you can see within range.' },
    { name: 'Minor Illusion', description: 'You create a sound or an image of an object within range that lasts for the duration.' },
    { name: 'Mold Earth', description: 'You choose a portion of dirt or stone that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Prestidigitation', description: 'This spell is a minor magical trick that novice spellcasters use for practice.' },
    { name: 'Ray of Frost', description: 'A frigid beam of blue-white light streaks toward a creature within range.' },
    { name: 'Shape Water', description: 'You choose an area of water that you can see within range and that fits within a 5-foot cube.' },
    { name: 'Shocking Grasp', description: 'Lightning springs from your hand to deliver a shock to a creature you try to touch.' },
    { name: 'Sword Burst', description: 'You create a momentary circle of spectral blades that sweep around you.' },
    { name: 'Thunderclap', description: 'You create a burst of thunderous sound that can be heard up to 100 feet away.' },
    { name: 'True Strike', description: 'Your next attack roll against the target has advantage if you make it before the end of your next turn.' }
  ],
  'Warlock': [
    { name: 'Blade Ward', description: 'Extend your hand and trace a sigil of warding in the air.' },
    { name: 'Booming Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Create Bonfire', description: 'You create a bonfire on ground that you can see within range.' },
    { name: 'Eldritch Blast', description: 'A beam of crackling energy streaks toward a creature within range.' },
    { name: 'Friends', description: 'For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn\'t hostile toward you.' },
    { name: 'Frostbite', description: 'You cause numbing frost to form on one creature that you can see within range.' },
    { name: 'Green-Flame Blade', description: 'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within the spell\'s range.' },
    { name: 'Lightning Lure', description: 'You create a lash of lightning energy that strikes at one creature of your choice that you can see within range.' },
    { name: 'Magic Stone', description: 'You touch one to three pebbles and imbue them with magic.' },
    { name: 'Mind Sliver', description: 'You drive a disorienting spike of psychic energy into the mind of one creature you can see within range.' },
    { name: 'Minor Illusion', description: 'You create a sound or an image of an object within range that lasts for the duration.' },
    { name: 'Prestidigitation', description: 'This spell is a minor magical trick that novice spellcasters use for practice.' },
    { name: 'Sword Burst', description: 'You create a momentary circle of spectral blades that sweep around you.' },
    { name: 'Thunderclap', description: 'You create a burst of thunderous sound that can be heard up to 100 feet away.' },
    { name: 'True Strike', description: 'Your next attack roll against the target has advantage if you make it before the end of your next turn.' }
  ]
};

export const spellLimits = {
  'Wizard': { cantrips: 3 },
  'Cleric': { cantrips: 3 },
  'Druid': { cantrips: 2 },
  'Sorcerer': { cantrips: 4 },
  'Warlock': { cantrips: 2 }
};

export const baseEquipment = {
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