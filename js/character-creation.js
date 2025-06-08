import { 
    auth, 
    db 
} from './firebase-config.js';

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

import {
    getCurrentUser,
    saveCharacter
} from './auth.js';

// D&D Data
const RACES = [
    'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Tiefling'
];

const BACKGROUNDS = [
    'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Guild Artisan',
    'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin'
];

const ALIGNMENTS = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

const SKILLS = {
    'Strength': ['Athletics'],
    'Dexterity': ['Acrobatics', 'Sleight of Hand', 'Stealth'],
    'Intelligence': ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    'Wisdom': ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    'Charisma': ['Deception', 'Intimidation', 'Performance', 'Persuasion']
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Character Creation State
let currentStep = 1;
let characterData = {
    class: '', // Will be set from the previous page
    name: '',
    race: '',
    background: '',
    alignment: '',
    abilityScores: {},
    skills: [],
    tools: [],
    equipment: [],
    features: []
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Get the selected class from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    characterData.class = urlParams.get('class');
    
    if (!characterData.class) {
        window.location.href = 'characters.html';
        return;
    }

    // Require authentication
    if (!auth.currentUser) {
        window.location.href = 'login.html';
        return;
    }

    await initializeFormOptions();
    setupAbilityScores();
    await loadClassFeatures();
});

// Initialize form options
async function initializeFormOptions() {
    try {
        // Fetch data from Firestore
        const [racesDoc, backgroundsDoc, alignmentsDoc] = await Promise.all([
            getDoc(doc(db, 'gameData', 'races')),
            getDoc(doc(db, 'gameData', 'backgrounds')),
            getDoc(doc(db, 'gameData', 'alignments'))
        ]);

        const races = racesDoc.data().list;
        const backgrounds = backgroundsDoc.data().list;
        const alignments = alignmentsDoc.data().list;

        // Populate selects
        populateSelect('charRace', races);
        populateSelect('charBackground', backgrounds);
        populateSelect('charAlignment', alignments);
    } catch (error) {
        console.error('Error loading form options:', error);
        alert('Failed to load character options. Please try again.');
    }
}

function populateSelect(elementId, options) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">Select...</option>';
    
    options.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.id || option;
        optElement.textContent = option.name || option;
        select.appendChild(optElement);
    });
}

// Load class features
async function loadClassFeatures() {
    try {
        const classDoc = await getDoc(doc(db, 'classes', characterData.class.toLowerCase()));
        const classData = classDoc.data();
        
        // Store class features for later use
        characterData.features = classData.features;
        characterData.proficiencies = classData.proficiencies;
        characterData.equipment = classData.startingEquipment;
        
        // Update UI with class-specific information
        updateClassSpecificUI(classData);
    } catch (error) {
        console.error('Error loading class features:', error);
        alert('Failed to load class features. Please try again.');
    }
}

function updateClassSpecificUI(classData) {
    // Update skill choices
    const skillsList = document.getElementById('skillsList');
    if (skillsList) {
        skillsList.innerHTML = classData.skillChoices.map(skill => `
            <div class="skill-choice">
                <input type="checkbox" id="skill-${skill}" name="skills" value="${skill}">
                <label for="skill-${skill}">${skill}</label>
            </div>
        `).join('');
    }

    // Update equipment choices
    const equipmentList = document.getElementById('equipmentList');
    if (equipmentList) {
        equipmentList.innerHTML = classData.equipmentChoices.map(choice => `
            <div class="equipment-choice">
                <select name="equipment">
                    ${choice.options.map(option => `
                        <option value="${option}">${option}</option>
                    `).join('')}
                </select>
            </div>
        `).join('');
    }
}

// Setup ability scores section
function setupAbilityScores() {
    const container = document.querySelector('.ability-scores');
    container.innerHTML = ABILITIES.map(ability => `
        <div class="ability-score">
            <label>${ability}</label>
            <div class="dice-roll" id="${ability.toLowerCase()}Score">-</div>
            <button class="roll-button" onclick="rollAbility('${ability.toLowerCase()}')">Roll</button>
        </div>
    `).join('');
}

// Dice rolling functions
function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollAbilityScore() {
    const rolls = Array.from({ length: 4 }, () => rollDice(6));
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
}

function rollAbility(ability) {
    const score = rollAbilityScore();
    document.getElementById(`${ability}Score`).textContent = score;
    characterData.abilityScores[ability] = score;
}

function rollAllAbilities() {
    ABILITIES.forEach(ability => {
        rollAbility(ability.toLowerCase());
    });
}

function useStandardArray() {
    const scores = [...STANDARD_ARRAY];
    ABILITIES.forEach(ability => {
        const score = scores.shift();
        document.getElementById(`${ability.toLowerCase()}Score`).textContent = score;
        characterData.abilityScores[ability.toLowerCase()] = score;
    });
}

// Navigation functions
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 5) {
            document.querySelector(`.creation-step[data-step="${currentStep}"]`).classList.remove('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('completed');
            currentStep++;
            document.querySelector(`.creation-step[data-step="${currentStep}"]`).classList.add('active');
            document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.add('active');
            
            if (currentStep === 5) {
                document.getElementById('nextButton').textContent = 'Finish';
            }
            
            loadStepContent(currentStep);
        } else {
            saveCharacterToFirebase();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        document.querySelector(`.creation-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');
        currentStep--;
        document.querySelector(`.creation-step[data-step="${currentStep}"]`).classList.add('active');
        document.getElementById('nextButton').textContent = 'Next';
    }
}

// Validation functions
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateBasicInfo();
        case 2:
            return validateAbilityScores();
        case 3:
            return validateSkillsAndProficiencies();
        case 4:
            return validateEquipment();
        default:
            return true;
    }
}

function validateBasicInfo() {
    const name = document.getElementById('charName').value;
    const race = document.getElementById('charRace').value;
    const background = document.getElementById('charBackground').value;
    const alignment = document.getElementById('charAlignment').value;

    if (!name || !race || !background || !alignment) {
        alert('Please fill in all fields');
        return false;
    }

    characterData.name = name;
    characterData.race = race;
    characterData.background = background;
    characterData.alignment = alignment;
    return true;
}

function validateAbilityScores() {
    const hasAllScores = ABILITIES.every(ability => 
        characterData.abilityScores[ability.toLowerCase()] !== undefined
    );
    
    if (!hasAllScores) {
        alert('Please roll all ability scores or use the standard array');
        return false;
    }
    return true;
}

function validateSkillsAndProficiencies() {
    // We'll implement this when we add skill selection
    return true;
}

function validateEquipment() {
    // We'll implement this when we add equipment selection
    return true;
}

// Content loading functions
function loadStepContent(step) {
    switch (step) {
        case 3:
            loadSkillsAndProficiencies();
            break;
        case 4:
            loadEquipment();
            break;
        case 5:
            loadCharacterPreview();
            break;
    }
}

function loadSkillsAndProficiencies() {
    // Implementation will be added in the next iteration
}

function loadEquipment() {
    // Implementation will be added in the next iteration
}

function loadCharacterPreview() {
    const preview = document.getElementById('characterPreview');
    preview.innerHTML = `
        <h3>${characterData.name}</h3>
        <p>Level 1 ${characterData.race} ${characterData.class}</p>
        <p>${characterData.background} - ${characterData.alignment}</p>
        
        <h4>Ability Scores</h4>
        <div class="ability-scores">
            ${Object.entries(characterData.abilityScores).map(([ability, score]) => `
                <div class="ability-score">
                    <strong>${ability.charAt(0).toUpperCase() + ability.slice(1)}</strong>: ${score}
                    (${Math.floor((score - 10) / 2) >= 0 ? '+' : ''}${Math.floor((score - 10) / 2)})
                </div>
            `).join('')}
        </div>
    `;
}

// Save character
async function saveCharacterToFirebase() {
    try {
        const user = await getCurrentUser();
        const campaignId = await getCurrentCampaign();

        const characterId = await saveCharacter({
            ...characterData,
            campaignId,
            level: 1,
            experience: 0,
            hitPoints: {
                current: calculateStartingHP(),
                maximum: calculateStartingHP()
            }
        });

        alert('Character created successfully!');
        window.location.href = 'characters.html';
    } catch (error) {
        console.error('Error saving character:', error);
        alert('Failed to save character. Please try again.');
    }
}

// Helper functions
async function getCurrentCampaign() {
    // Get the user's current campaign
    // IMPLEMENT CAMPAIGN SELECTION OR MANAGEMENT SYSTEM
    return null;
}

function calculateStartingHP() {
    // Calculate starting HP based on class and Constitution
    const constitutionModifier = Math.floor((characterData.abilityScores.constitution - 10) / 2);
    const classHitDice = {
        // IMPLEMENT CLASS HIT DICE MAPPING
        barbarian: 12,
        fighter: 10,
        // ... add other classes
    };
    
    return classHitDice[characterData.class.toLowerCase()] + constitutionModifier;
} 