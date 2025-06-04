const sessions = [
  {
    date: "2025-05-01",
    title: "Session 1: The Gathering Storm",
    notes: "Party meets in Bramblewood and accepts the mayor's quest."
  },
  {
    date: "2025-05-08",
    title: "Session 2: Into the Whispering Forest",
    notes: "Explored the forest, encountered enchanted beasts, found a rune."
  },
  {
    date: "2025-06-10",
    title: "Session 3: The Shrine Awakens",
    notes: "Upcoming session: Delving deeper into the mysterious shrine."
  }
];

function renderSchedule() {
  const container = document.getElementById("session-schedule");
  let html = `<table class="schedule-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Session</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${sessions.map(s => `
        <tr>
          <td>${s.date}</td>
          <td>${s.title}</td>
          <td>${s.notes}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>`;
  container.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", renderSchedule);