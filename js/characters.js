// D&D Character Classes Data
const characterClasses = [
    {
        name: 'Barbarian',
        icon: 'axe',
        description: 'A fierce warrior who can enter a battle rage',
        hitDie: 'd12',
        primaryAbility: 'Strength',
        savingThrows: ['Strength', 'Constitution'],
        armorProficiency: 'Light and medium armor, shields',
        weaponProficiency: 'Simple and martial weapons'
    },
    {
        name: 'Bard',
        icon: 'lute',
        description: 'An inspiring magician whose power echoes the music of creation',
        hitDie: 'd8',
        primaryAbility: 'Charisma',
        savingThrows: ['Dexterity', 'Charisma'],
        armorProficiency: 'Light armor',
        weaponProficiency: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords'
    },
    {
        name: 'Cleric',
        icon: 'holy-symbol',
        description: 'A priestly champion who wields divine magic in service of a higher power',
        hitDie: 'd8',
        primaryAbility: 'Wisdom',
        savingThrows: ['Wisdom', 'Charisma'],
        armorProficiency: 'Light and medium armor, shields',
        weaponProficiency: 'Simple weapons'
    },
    {
        name: 'Druid',
        icon: 'leaf',
        description: 'A priest of the Old Faith, wielding the powers of nature and adopting animal forms',
        hitDie: 'd8',
        primaryAbility: 'Wisdom',
        savingThrows: ['Intelligence', 'Wisdom'],
        armorProficiency: 'Light and medium armor, shields (nonmetal)',
        weaponProficiency: 'Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears'
    },
    {
        name: 'Fighter',
        icon: 'sword',
        description: 'A master of martial combat, skilled with a variety of weapons and armor',
        hitDie: 'd10',
        primaryAbility: 'Strength or Dexterity',
        savingThrows: ['Strength', 'Constitution'],
        armorProficiency: 'All armor, shields',
        weaponProficiency: 'Simple and martial weapons'
    },
    {
        name: 'Monk',
        icon: 'fist',
        description: 'A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection',
        hitDie: 'd8',
        primaryAbility: 'Dexterity & Wisdom',
        savingThrows: ['Strength', 'Dexterity'],
        armorProficiency: 'None',
        weaponProficiency: 'Simple weapons, shortswords'
    },
    {
        name: 'Paladin',
        icon: 'shield',
        description: 'A holy warrior bound to a sacred oath',
        hitDie: 'd10',
        primaryAbility: 'Strength & Charisma',
        savingThrows: ['Wisdom', 'Charisma'],
        armorProficiency: 'All armor, shields',
        weaponProficiency: 'Simple and martial weapons'
    },
    {
        name: 'Ranger',
        icon: 'bow',
        description: 'A warrior who combats threats on the edges of civilization',
        hitDie: 'd10',
        primaryAbility: 'Dexterity & Wisdom',
        savingThrows: ['Strength', 'Dexterity'],
        armorProficiency: 'Light and medium armor, shields',
        weaponProficiency: 'Simple and martial weapons'
    },
    {
        name: 'Rogue',
        icon: 'dagger',
        description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies',
        hitDie: 'd8',
        primaryAbility: 'Dexterity',
        savingThrows: ['Dexterity', 'Intelligence'],
        armorProficiency: 'Light armor',
        weaponProficiency: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords'
    },
    {
        name: 'Sorcerer',
        icon: 'crystal',
        description: 'A spellcaster who draws on inherent magic from a gift or bloodline',
        hitDie: 'd6',
        primaryAbility: 'Charisma',
        savingThrows: ['Constitution', 'Charisma'],
        armorProficiency: 'None',
        weaponProficiency: 'Daggers, darts, slings, quarterstaffs, light crossbows'
    },
    {
        name: 'Warlock',
        icon: 'eye',
        description: 'A wielder of magic that is derived from a bargain with an extraplanar entity',
        hitDie: 'd8',
        primaryAbility: 'Charisma',
        savingThrows: ['Wisdom', 'Charisma'],
        armorProficiency: 'Light armor',
        weaponProficiency: 'Simple weapons'
    },
    {
        name: 'Wizard',
        icon: 'book',
        description: 'A scholarly magic-user capable of manipulating the structures of reality',
        hitDie: 'd6',
        primaryAbility: 'Intelligence',
        savingThrows: ['Intelligence', 'Wisdom'],
        armorProficiency: 'None',
        weaponProficiency: 'Daggers, darts, slings, quarterstaffs, light crossbows'
    }
];

// Carousel State
let currentPage = 0;
const itemsPerPage = 4;
let selectedClass = null;

// DOM Elements
const carousel = document.getElementById('class-carousel');
const prevButton = document.querySelector('.carousel-button.prev');
const nextButton = document.querySelector('.carousel-button.next');
const createButton = document.querySelector('.create-character-btn');
const authMessage = document.querySelector('.auth-required-message');

// Initialize the page
function init() {
    const session = getSession();
    if (session) {
        const characters = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
        const userCharacter = characters.find(char => char.userId === session.username);
        
        if (userCharacter) {
            displayCharacter(userCharacter);
        } else {
            showClassSelection();
        }
    } else {
        showClassSelection();
    }
}

function displayCharacter(character) {
    const characterDisplay = document.getElementById('character-display');
    const classSelection = document.getElementById('class-selection');
    
    characterDisplay.style.display = 'block';
    classSelection.style.display = 'none';
    
    // Calculate ability modifiers
    const getModifier = (score) => Math.floor((score - 10) / 2);
    
    characterDisplay.innerHTML = `
        <div class="character-sheet">
            <div class="character-header">
                <h1 class="character-name">${character.name}</h1>
                <div class="character-subtitle">
                    Level 1 ${character.race} ${character.class}
                    <br>
                    ${character.background} - ${character.alignment}
                </div>
            </div>

            <div class="character-section">
                <h2 class="section-title">Ability Scores</h2>
                <div class="ability-scores">
                    ${Object.entries(character.abilityScores).map(([ability, score]) => `
                        <div class="ability-score">
                            <div class="score-name">${ability.toUpperCase()}</div>
                            <div class="score-value">${score}</div>
                            <div class="score-modifier">${getModifier(score) >= 0 ? '+' : ''}${getModifier(score)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="character-section">
                <h2 class="section-title">Skills & Proficiencies</h2>
                <div class="proficiency-list">
                    ${character.skills.map(skill => `
                        <div class="proficiency-item">${skill}</div>
                    `).join('')}
                </div>
            </div>

            <div class="character-section">
                <h2 class="section-title">Equipment</h2>
                <div class="proficiency-list">
                    ${character.equipment.map(item => `
                        <div class="proficiency-item">${item}</div>
                    `).join('')}
                </div>
            </div>

            <div class="character-section">
                <h2 class="section-title">Features</h2>
                <ul class="features-list">
                    ${character.features.map(feature => `
                        <li class="feature-item">
                            <div class="feature-name">${feature.name}</div>
                            <div class="feature-description">${feature.description}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function showClassSelection() {
    const characterDisplay = document.getElementById('character-display');
    const classSelection = document.getElementById('class-selection');
    
    characterDisplay.style.display = 'none';
    classSelection.style.display = 'block';
    
    updateCarousel();
    updateNavigationButtons();
    updateAuthElements();
}

// Update carousel display
function updateCarousel() {
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    const pageClasses = characterClasses.slice(start, end);
    
    carousel.innerHTML = pageClasses.map(characterClass => `
        <div class="class-card" data-class="${characterClass.name}">
            <div class="class-icon">
                <img src="images/icons/${characterClass.icon}.svg" alt="${characterClass.name} icon">
            </div>
            <h2 class="class-name">${characterClass.name}</h2>
            <p class="class-description">${characterClass.description}</p>
            <div class="class-stats">
                <div class="class-stat">
                    <strong>Hit Die:</strong> ${characterClass.hitDie}
                </div>
                <div class="class-stat">
                    <strong>Primary:</strong> ${characterClass.primaryAbility}
                </div>
            </div>
        </div>
    `).join('');

    // Add click handlers to cards
    document.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => selectClass(card.dataset.class));
    });
}

// Update navigation buttons
function updateNavigationButtons() {
    prevButton.disabled = currentPage === 0;
    nextButton.disabled = (currentPage + 1) * itemsPerPage >= characterClasses.length;
}

// Update auth-dependent elements
function updateAuthElements() {
    const isAuth = isLoggedIn();
    createButton.style.display = isAuth ? 'block' : 'none';
    authMessage.style.display = isAuth ? 'none' : 'block';
}

// Select a class
function selectClass(className) {
    selectedClass = className;
    document.querySelectorAll('.class-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.class === className);
    });
    if (isLoggedIn()) {
        createButton.textContent = `Create ${className} Character`;
    }
}

// Navigation handlers
prevButton.addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        updateCarousel();
        updateNavigationButtons();
    }
});

nextButton.addEventListener('click', () => {
    if ((currentPage + 1) * itemsPerPage < characterClasses.length) {
        currentPage++;
        updateCarousel();
        updateNavigationButtons();
    }
});

// Create character handler
createButton.addEventListener('click', () => {
    if (selectedClass) {
        window.location.href = `character-creation.html?class=${encodeURIComponent(selectedClass)}`;
    } else {
        alert('Please select a class first!');
    }
});

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 