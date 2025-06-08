import { 
    auth,
    db
} from './firebase-config.js';

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

// Authentication state
let currentUser = null;

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateNavigation();
});

// User management functions
async function signup(email, password, username) {
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            username,
            email,
            role: 'player', // Default role
            createdAt: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error('Signup error:', error);
        throw new Error(error.message);
    }
}

async function login(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error('Invalid email or password');
    }
}

async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw new Error(error.message);
    }
}

// User data functions
async function getCurrentUser() {
    if (!currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    return userDoc.data();
}

async function isDungeonMaster() {
    const user = await getCurrentUser();
    return user?.role === 'dm';
}

// Character management functions
async function getCharacters(campaignId = null) {
    try {
        let charactersQuery;
        
        if (campaignId) {
            // Get characters for specific campaign
            charactersQuery = query(
                collection(db, 'characters'),
                where('campaignId', '==', campaignId)
            );
        } else if (await isDungeonMaster()) {
            // DM can see all characters
            charactersQuery = collection(db, 'characters');
        } else {
            // Players can only see their own characters
            charactersQuery = query(
                collection(db, 'characters'),
                where('userId', '==', currentUser.uid)
            );
        }

        const querySnapshot = await getDocs(charactersQuery);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting characters:', error);
        throw new Error('Failed to load characters');
    }
}

async function saveCharacter(characterData) {
    try {
        const characterRef = doc(collection(db, 'characters'));
        await setDoc(characterRef, {
            ...characterData,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return characterRef.id;
    } catch (error) {
        console.error('Error saving character:', error);
        throw new Error('Failed to save character');
    }
}

// Campaign management functions
async function getCampaigns() {
    try {
        let campaignsQuery;
        
        if (await isDungeonMaster()) {
            // DM can see all campaigns
            campaignsQuery = collection(db, 'campaigns');
        } else {
            // Players can only see campaigns they're part of
            campaignsQuery = query(
                collection(db, 'campaigns'),
                where('playerIds', 'array-contains', currentUser.uid)
            );
        }

        const querySnapshot = await getDocs(campaignsQuery);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting campaigns:', error);
        throw new Error('Failed to load campaigns');
    }
}

// Helper functions
function isLoggedIn() {
    return !!currentUser;
}

// Export functions
export {
    signup,
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    isDungeonMaster,
    getCharacters,
    saveCharacter,
    getCampaigns
};

// Simulated user database (replace with Firebase later)
const USERS_KEY = 'dnd_users';
const SESSION_KEY = 'dnd_session';

// Predefined users
const STATIC_USERS = [
    {
        username: 'dungeon_master',
        password: 'dm123456',
        role: 'dm',
        createdAt: new Date().toISOString()
    },
    {
        username: 'player1',
        password: 'player123',
        role: 'player',
        createdAt: new Date().toISOString()
    },
    {
        username: 'player2',
        password: 'player456',
        role: 'player',
        createdAt: new Date().toISOString()
    },
    {
        username: 'player3',
        password: 'player789',
        role: 'player',
        createdAt: new Date().toISOString()
    },
    {
        username: 'player4',
        password: 'player101',
        role: 'player',
        createdAt: new Date().toISOString()
    }
];

// Initialize users if not exists
if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(STATIC_USERS));
}

// User management functions
function getUsers() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    // If users array is empty, initialize with static users
    if (users.length === 0) {
        localStorage.setItem(USERS_KEY, JSON.stringify(STATIC_USERS));
        return STATIC_USERS;
    }
    return users;
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Authentication functions
function signup(username, password) {
    const users = getUsers();
    
    // Check if username already exists
    if (users.some(user => user.username === username)) {
        throw new Error('Username already exists');
    }
    
    // Add new user
    users.push({
        username,
        password, // In a real app, this would be hashed
        createdAt: new Date().toISOString()
    });
    
    saveUsers(users);
    return true;
}

function login(username, password) {
    const users = getUsers();
    console.log('Attempting login for username:', username);
    console.log('Available users:', users);
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        console.log('Login failed: Invalid username or password');
        throw new Error('Invalid username or password');
    }
    
    console.log('Login successful for user:', user);
    
    // Create session with role information
    const session = {
        username,
        role: user.role,
        loggedInAt: new Date().toISOString()
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
}

function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function isLoggedIn() {
    return !!getSession();
}

// Navigation guard
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function redirectIfLoggedIn() {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
        return true;
    }
    return false;
}

// Form handling
function handleLoginForm(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        login(username, password);
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
    }
}

function handleSignupForm(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    try {
        signup(username, password);
        login(username, password); // Automatically log in after signup
        window.location.href = 'dashboard.html';
    } catch (error) {
        alert(error.message);
    }
}

// Role-based authorization
function isDungeonMaster() {
    const session = getSession();
    return session && session.role === 'dm';
}

function requireDungeonMaster() {
    if (!isDungeonMaster()) {
        alert('This feature is only available to Dungeon Masters');
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// Update navigation based on auth state and role
function updateNavigation() {
    const session = getSession();
    const authLinks = document.querySelectorAll('.auth-link');
    const dmLinks = document.querySelectorAll('.dm-only');
    
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

    // Handle DM-only elements
    dmLinks.forEach(link => {
        link.style.display = isDungeonMaster() ? 'block' : 'none';
    });
    
    // Update username display if exists
    const usernameElement = document.getElementById('username-display');
    if (usernameElement && session) {
        usernameElement.textContent = `${session.username}${session.role === 'dm' ? ' (DM)' : ''}`;
    }
} 