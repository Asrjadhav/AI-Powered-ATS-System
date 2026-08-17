import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import axios from "axios";

// Dynamically fetch config from server to match the container's environment
let authInstance: any = null;

export async function getFirebaseAuth() {
  if (authInstance) return authInstance;

  try {
    const res = await axios.get("/api/firebase-config");
    const firebaseConfig = res.data;
    const app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error("Failed to load Firebase Config or initialize Auth:", error);
    return null;
  }
}

export async function googleSignIn() {
  const auth = await getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not initialized.");
  }

  const provider = new GoogleAuthProvider();
  // Request Google Calendar scope
  provider.addScope("https://www.googleapis.com/auth/calendar");
  provider.setCustomParameters({
    prompt: "consent"
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to capture Access Token from Google Auth result.");
    }

    const accessToken = credential.accessToken;
    const email = result.user.email || "";

    // Forward the OAuth token to the server so backend scheduling is fully enabled
    await axios.post("/api/auth/google/save-token", { accessToken, email });

    return { user: result.user, accessToken, email };
  } catch (error: any) {
    console.error("Google Auth SignIn Popup error:", error);
    throw error;
  }
}
