// Example story data; you can edit this or load from JSON if desired
const sessions = [
  {
    title: "Session 1: The Gathering Storm",
    date: "2025-05-01",
    summary: "The party meets in Bramblewood, a village plagued by mysterious disappearances. They accept a quest from the mayor to investigate the Whispering Forest.",
    details: "After introductions at the Dancing Lantern Inn, the heroes discover tracks leading into the woods. They encounter strange lights and rescue a lost child, gaining the villagers' trust."
  },
  {
    title: "Session 2: Into the Whispering Forest",
    date: "2025-05-08",
    summary: "Venturing into the forest, the party faces enchanted beasts and finds clues about an ancient cult.",
    details: "Inside the forest, traps and illusions test the party's resolve. A hidden shrine contains runes linked to the Moonshadow cult. The heroes narrowly escape an ambush by forest spirits."
  }
  // Add more sessions as needed
];

function createSessionElement(session, i) {
  return `
    <div class="session">
      <button class="session-toggle" aria-expanded="false" aria-controls="session-details-${i}">
        <span class="session-title">${session.title}</span>
        <span class="session-date">${session.date}</span>
      </button>
      <div class="session-summary" id="session-details-${i}" hidden>
        <p>${session.summary}</p>
        <details>
          <summary>More details</summary>
          <p>${session.details}</p>
        </details>
      </div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const timeline = document.getElementById("story-timeline");
  timeline.innerHTML = sessions.map(createSessionElement).join("");

  document.querySelectorAll(".session-toggle").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      const details = document.getElementById(`session-details-${i}`);
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", !expanded);
      details.hidden = expanded;
    });
  });
});