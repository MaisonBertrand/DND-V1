const characters = [
  {
    name: "Seraphine Dawnbringer",
    class: "Cleric (Light Domain)",
    image: "seraphine.jpg",
    stats: {
      "Level": 4,
      "HP": 34,
      "AC": 17,
      "STR": 12,
      "DEX": 14,
      "CON": 14,
      "INT": 11,
      "WIS": 18,
      "CHA": 16
    },
    backstory: "A devoted cleric from the Sunspire Monastery, Seraphine seeks to bring hope to the darkness spreading across Eldoria."
  },
  {
    name: "Thorn Underleaf",
    class: "Rogue (Arcane Trickster)",
    image: "thorn.jpg",
    stats: {
      "Level": 4,
      "HP": 28,
      "AC": 15,
      "STR": 10,
      "DEX": 18,
      "CON": 13,
      "INT": 15,
      "WIS": 12,
      "CHA": 14
    },
    backstory: "A halfling with a knack for mischief and magic, Thorn is determined to uncover the secrets of his mysterious lineage."
  }
  // More characters can be added here
];

function createStatBlock(stats) {
  return `<ul class="stat-block">` +
    Object.entries(stats).map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("") +
    `</ul>`;
}

function createCharacterCard(char) {
  return `
    <div class="character-card">
      <img src="${char.image}" alt="${char.name}" class="character-img">
      <div class="character-info">
        <h2>${char.name}</h2>
        <h3>${char.class}</h3>
        ${createStatBlock(char.stats)}
        <p class="character-backstory">${char.backstory}</p>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("character-list");
  list.innerHTML = characters.map(createCharacterCard).join("");
});