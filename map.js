// Replace with real coordinates and locations to match your map image!
const locations = [
  {
    name: "Bramblewood",
    x: 120, y: 300,
    description: "A quiet village at the edge of the Whispering Forest, currently troubled by disappearances."
  },
  {
    name: "Whispering Forest",
    x: 250, y: 170,
    description: "A dense, magical forest where sunlight barely penetrates. Home to ancient secrets and danger."
  },
  {
    name: "Stormkeep",
    x: 500, y: 100,
    description: "A ruined fortress atop the northern cliffs, said to be haunted by restless spirits."
  }
];

function createMarker(loc, i) {
  return `<button class="map-marker" style="left:${loc.x}px;top:${loc.y}px;" data-index="${i}" aria-label="${loc.name}"></button>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const markersDiv = document.getElementById('map-markers');
  markersDiv.innerHTML = locations.map(createMarker).join("");

  const tooltip = document.getElementById('map-tooltip');

  markersDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('map-marker')) {
      const idx = e.target.getAttribute('data-index');
      const loc = locations[idx];
      tooltip.innerHTML = `<strong>${loc.name}</strong><br>${loc.description}`;
      tooltip.style.left = (loc.x + 40) + "px";
      tooltip.style.top = (loc.y + 40) + "px";
      tooltip.hidden = false;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('map-marker')) {
      tooltip.hidden = true;
    }
  });
});