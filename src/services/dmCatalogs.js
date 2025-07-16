import { npcs, getNPCById, searchNPCs, getRandomNPC } from './catalogs/npcs';
import { 
  manualSpells, 
  manualItems, 
  manualMonsters, 
  manualCombatService 
} from './manualCombat';

export class DMCatalogsService {
  constructor() {
    this.monsters = manualMonsters;
    this.items = manualItems;
    this.spells = manualSpells;
    this.npcs = npcs;
  }

  // Monster Catalog methods
  searchMonsters(query) {
    return manualCombatService.searchMonsters(query);
  }
  getMonsterById(id) {
    return manualCombatService.getMonsterById(id);
  }
  getRandomMonster() {
    return manualCombatService.getRandomMonster();
  }

  // Item Catalog methods
  searchItems(query) {
    return manualCombatService.searchItems(query);
  }
  getItemById(id) {
    return manualCombatService.getItemById(id);
  }
  getRandomItem() {
    return manualCombatService.getRandomItem();
  }

  // Spell Catalog methods
  searchSpells(query) {
    return manualCombatService.searchSpells(query);
  }
  getSpellById(id) {
    return manualCombatService.getSpellById(id);
  }
  getRandomSpell() {
    return manualCombatService.getRandomSpell();
  }
  initializeSpells() {
    return this.spells;
  }

  // NPC Catalog methods now use imported functions
  searchNPCs(query) {
    return searchNPCs(query);
  }
  getNPCById(id) {
    return getNPCById(id);
  }
  getRandomNPC() {
    return getRandomNPC();
  }
}

export const dmCatalogsService = new DMCatalogsService(); 