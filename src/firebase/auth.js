import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile, checkUsernameAvailability } from './database';

// Legacy auth functions (keeping for backward compatibility)
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const registerUser = async (email, password, username) => {
  try {
    // Check if username is available
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
      return { error: 'Username is already taken' };
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile
    await createUserProfile(user.uid, {
      username,
      email,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      emailVerified: false
    });

    // Send email verification
    await sendEmailVerification(user);

    return { user, success: true };
  } catch (error) {
    let errorMessage = 'Registration failed';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'An account with this email already exists';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password should be at least 6 characters long';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address';
    } else if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password accounts are not enabled. Please contact support.';
    }
    
    return { error: errorMessage };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      // Sign out the user since they're not verified
      await signOut(auth);
      return { 
        error: 'Please verify your email address before logging in. Check your inbox for a verification email.',
        needsVerification: true 
      };
    }
    
    return { user };
  } catch (error) {
    let errorMessage = 'Login failed';
    
    if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed login attempts. Please try again later';
    } else if (error.code === 'auth/email-not-verified') {
      errorMessage = 'Please verify your email address before logging in';
    }
    
    return { error: errorMessage };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
};

export const resendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'No user is currently signed in' };
    }
    
    if (user.emailVerified) {
      return { error: 'Email is already verified' };
    }
    
    await sendEmailVerification(user);
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    return { error: error.message };
  }
};

export const testFirebaseConnection = async () => {
  try {
    // Simple test to check if Firebase is properly configured
    await auth.app.options;
    return { success: true };
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { error: error.message };
  }
};

export const testEmailVerification = async (email, password) => {
  try {
    // Create a test user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Try to send verification email
    await sendEmailVerification(userCredential.user);
    
    // Delete the test user
    await userCredential.user.delete();
    
    return { success: true, message: 'Email verification test successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}; 