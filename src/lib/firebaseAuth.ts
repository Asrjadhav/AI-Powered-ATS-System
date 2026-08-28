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

/**
 * Direct Google OAuth 2.0 Web Popup Flow
 * Connects directly using your GOOGLE_CLIENT_ID without requiring Firebase Auth Console setup.
 */
export async function directGoogleOAuthSignIn() {
  const configRes = await axios.get("/api/firebase-config");
  const clientId = configRes.data?.oAuthClientId || "937529520946-82ri0sk3p7lebugrb3t4j6l5ipkirr3m.apps.googleusercontent.com";
  
  const redirectUri = window.location.origin; // http://localhost:3000
  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy email profile");
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=consent`;

  return new Promise<{ user?: any; accessToken: string; email: string }>((resolve, reject) => {
    const width = 520;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      "GoogleOAuthConnect",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error("Popup blocked by browser. Please allow popups for http://localhost:3000 in your browser settings."));
      return;
    }

    let resolved = false;

    const checkPopup = setInterval(() => {
      if (resolved) return;
      try {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          if (!resolved) {
            reject(new Error("Google sign-in popup was closed before completion."));
          }
          return;
        }

        const href = popup.location.href;
        if (href && (href.includes("access_token=") || href.includes("#access_token="))) {
          resolved = true;
          clearInterval(checkPopup);
          
          const hashIndex = href.indexOf("#");
          const hashStr = hashIndex !== -1 ? href.substring(hashIndex + 1) : href.substring(href.indexOf("?") + 1);
          const params = new URLSearchParams(hashStr);
          const accessToken = params.get("access_token");

          popup.close();

          if (accessToken) {
            // Fetch Google user profile email
            axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` }
            }).then(userRes => {
              const email = userRes.data?.email || "user@encureit.com";
              axios.post("/api/auth/google/save-token", { accessToken, email })
                .then(() => resolve({ accessToken, email }))
                .catch(err => reject(err));
            }).catch(() => {
              const email = "user@encureit.com";
              axios.post("/api/auth/google/save-token", { accessToken, email })
                .then(() => resolve({ accessToken, email }))
                .catch(err => reject(err));
            });
          } else {
            reject(new Error("No access token returned from Google."));
          }
        }
      } catch (e) {
        // Ignore cross-origin errors while redirected to Google domains
      }
    }, 400);

    // Timeout safety after 3 minutes
    setTimeout(() => {
      if (!resolved) {
        clearInterval(checkPopup);
        if (popup && !popup.closed) popup.close();
        reject(new Error("Google sign-in timed out. Please try again."));
      }
    }, 180000);
  });
}

/**
 * Universal googleSignIn handler:
 * Tries direct Google OAuth 2.0 flow first, and falls back to Firebase signInWithPopup.
 */
export async function googleSignIn() {
  try {
    return await directGoogleOAuthSignIn();
  } catch (directErr: any) {
    console.warn("Direct Google OAuth failed or popup closed, attempting Firebase auth fallback:", directErr);
    
    // Firebase Auth Fallback
    const auth = await getFirebaseAuth();
    if (!auth) {
      throw directErr || new Error("Firebase Auth is not initialized.");
    }

    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/calendar");
    provider.addScope("https://www.googleapis.com/auth/calendar.events");
    provider.addScope("https://www.googleapis.com/auth/calendar.freebusy");
    provider.setCustomParameters({ prompt: "consent" });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to capture Access Token from Google Auth result.");
    }

    const accessToken = credential.accessToken;
    const email = result.user.email || "";
    await axios.post("/api/auth/google/save-token", { accessToken, email });
    return { user: result.user, accessToken, email };
  }
}
