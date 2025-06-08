// Create and inject navigation into the page
function createNavigation() {
    const nav = document.createElement('nav');
    nav.innerHTML = `
        <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="story.html">Story</a></li>
            <li><a href="map.html">Map</a></li>
            <li><a href="characters.html">Character</a></li>
            <li id="inventory-nav" style="display: none;"><a href="inventory.html">Inventory</a></li>
            <li class="auth-link logged-out"><a href="login.html">Sign In</a></li>
            <li class="auth-link logged-in">
                <span>Welcome, <span id="username-display"></span>!</span>
            </li>
            <li class="auth-link logged-in">
                <a href="#" onclick="logout(); return false;">Sign Out</a>
            </li>
        </ul>
    `;
    
    // Insert navigation at the start of the body
    document.body.insertBefore(nav, document.body.firstChild);
    
    // Update navigation state based on authentication
    updateNavigation();
}

// Update navigation based on auth state and character existence
function updateNavigation() {
    const session = getSession();
    const authLinks = document.querySelectorAll('.auth-link');
    const inventoryNav = document.getElementById('inventory-nav');
    
    // Handle auth-based visibility
    authLinks.forEach(link => {
        if (session) {
            if (link.classList.contains('logged-out')) {
                link.style.display = 'none';
            } else {
                link.style.display = 'block';
            }
        } else {
            if (link.classList.contains('logged-out')) {
                link.style.display = 'block';
            } else {
                link.style.display = 'none';
            }
        }
    });
    
    // Update username display
    const usernameElement = document.getElementById('username-display');
    if (usernameElement && session) {
        usernameElement.textContent = session.username;
    }

    // Check if user has a character and update inventory visibility
    if (session) {
        const characters = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
        const userCharacter = characters.find(char => char.userId === session.username);
        if (inventoryNav) {
            inventoryNav.style.display = userCharacter ? 'block' : 'none';
        }
    }
}

// Initialize navigation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createNavigation();
}); 