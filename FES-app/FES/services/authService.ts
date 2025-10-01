// Example migration to Firebase (or any backend API)
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Firebase config (replace with your config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

class AuthService {
  // Login with username/password
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      // First, find user by username to get their email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Username not found.' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Sign in with Firebase Auth using email/password
      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
      
      return {
        success: true,
        user: {
          id: userCredential.user.uid,
          username: userData.username,
          email: userData.email,
          name: userData.name,
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  // Signup with user data
  async signup(username: string, email: string, password: string, name: string): Promise<AuthResult> {
    try {
      // Check if username already exists
      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        return { success: false, error: 'Username already exists.' };
      }

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store additional user data in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username,
        email,
        name,
        createdAt: new Date().toISOString(),
      });

      return {
        success: true,
        user: {
          id: user.uid,
          username,
          email,
          name,
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Signup failed' 
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    await signOut(auth);
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: user.uid,
          username: userData.username,
          email: userData.email,
          name: userData.name,
        };
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    
    return null;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();
