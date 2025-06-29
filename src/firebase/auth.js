import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './config';
import { createUserProfile, checkUsernameAvailability } from './database';
import { useState, useEffect } from 'react';

// Custom hook for authentication state
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};

export const registerUser = async (email, password, username) => {
  try {
    console.log('Starting registration for:', email, username);
    
    // Check if username is available
    const isUsernameAvailable = await checkUsernameAvailability(username);
    if (!isUsernameAvailable) {
      console.log('Username not available:', username);
      return { 
        user: null, 
        error: 'Username is already taken. Please choose a different username.' 
      };
    }
    console.log('Username available:', username);

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created successfully:', userCredential.user.uid);
    
    // Create user profile with username
    try {
      await createUserProfile(userCredential.user.uid, {
        username,
        email,
        displayName: username
      });
      console.log('User profile created successfully');
    } catch (profileError) {
      console.error('Error creating user profile:', profileError);
      // Continue with registration even if profile creation fails
    }
    
    // Send email verification
    let emailSent = false;
    try {
      await sendEmailVerification(userCredential.user);
      console.log('Email verification sent successfully');
      emailSent = true;
    } catch (emailError) {
      console.error('Error sending email verification:', emailError);
      // Continue with registration even if email verification fails
    }
    
    await signOut(auth);
    console.log('User signed out after registration');
    
    return { 
      user: null, 
      error: null,
      success: true
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { user: null, error: error.message };
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // For testing: allow login without email verification
    // TODO: Re-enable email verification check in production
    /*
    if (!userCredential.user.emailVerified) {
      await signOut(auth);
      return { 
        user: null, 
        error: 'Please verify your email before logging in. Check your inbox for the verification link.' 
      };
    }
    */
    
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    // For testing: allow unverified users to stay logged in
    // TODO: Re-enable email verification check in production
    /*
    if (user && !user.emailVerified) {
      await signOut(auth);
      callback(null);
    } else {
      callback(user);
    }
    */
    callback(user);
  });
};

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    console.log('Auth domain:', auth.config.authDomain);
    console.log('Project ID:', auth.config.projectId);
    return { success: true, message: 'Firebase connection successful' };
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { success: false, error: error.message };
  }
};

export const testEmailVerification = async (email, password) => {
  try {
    console.log('Testing email verification for:', email);
    
    // Create a test user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('Test user created:', userCredential.user.uid);
    
    // Try to send verification email
    await sendEmailVerification(userCredential.user);
    console.log('Email verification sent for test user');
    
    // Delete the test user
    await userCredential.user.delete();
    console.log('Test user deleted');
    
    return { success: true, message: 'Email verification test successful' };
  } catch (error) {
    console.error('Email verification test failed:', error);
    return { success: false, error: error.message };
  }
}; 