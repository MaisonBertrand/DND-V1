export const npcs = [
  // ... (copy all NPCs from initializeNPCs in dmCatalogs.js) ...
];

export const getNPCById = (id) => {
  return npcs.find(npc => npc.id === id);
};

export const searchNPCs = (query) => {
  const searchTerm = query.toLowerCase();
  return npcs.filter(npc =>
    npc.name.toLowerCase().includes(searchTerm) ||
    npc.type.toLowerCase().includes(searchTerm) ||
    (npc.description && npc.description.toLowerCase().includes(searchTerm))
  );
};

export const getRandomNPC = () => {
  return npcs[Math.floor(Math.random() * npcs.length)];
}; 