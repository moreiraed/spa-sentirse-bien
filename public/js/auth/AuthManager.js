import { supabase } from "../core/supabase.js";
import { loadUserProfile, createUserProfile } from "./auth-profile.js";
import { updateAuthUI, showAuthLoader } from "./auth-UI.js";
import { getErrorMessage, showToast } from "./auth-utils.js";

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.authListeners = [];
    this.isInitialCheck = true; // Flag para evitar toast en carga inicial
    this.initAuthListeners();
  }

  onAuthInitialized(callback) {
    if (this.isInitialized) {
      callback(this.currentUser);
    } else {
      this.authListeners.push(callback);
    }
  }

  initAuthListeners() {
    supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(event, session);
    });
  }

  async handleAuthChange(event, session) {
    const handlers = {
      SIGNED_IN: () => this.handleSignedIn(session),
      SIGNED_OUT: () => this.handleSignedOut(),
      TOKEN_REFRESHED: () => this.handleTokenRefreshed(session),
      USER_UPDATED: () => this.handleUserUpdated(session),
    };

    if (handlers[event]) {
      await handlers[event]();
    }
  }

  async handleSignedIn(session) {
    if (session?.user) {
      try {
        await loadUserProfile(this, session.user.id);
        this.notifyInitialized();
        updateAuthUI(this);
      } catch (error) {
        console.error("Error in handleSignedIn:", error);
        this.currentUser = {
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name || "Usuario",
          rol: "user",
        };
        window.currentUser = this.currentUser;
        this.notifyInitialized();
        updateAuthUI(this);
      }
    }
  }

  handleSignedOut() {
    this.currentUser = null;
    window.currentUser = null;
    this.notifyInitialized();
    updateAuthUI(this);

    // Si estamos en una página protegida, redirigir
    const currentPage = window.location.hash.replace("#", "") || "home";
    if (this.isProtectedPage(currentPage)) {
      setTimeout(() => {
        window.history.replaceState(null, "", "#home");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 100);
    }
  }

  notifyInitialized() {
    this.isInitialized = true;
    this.authListeners.forEach((callback) => callback(this.currentUser));
    this.authListeners = [];
    this.isInitialCheck = false; // Ya no es la carga inicial
  }

  async handleTokenRefreshed(session) {
    if (session?.user) {
      await loadUserProfile(this, session.user.id);
    }
  }

  async handleUserUpdated(session) {
    if (session?.user) {
      await loadUserProfile(this, session.user.id);
      updateAuthUI(this);
    }
  }

  async checkAuthState() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;

      if (session?.user) {
        await this.handleSignedIn(session);
      } else {
        this.handleSignedOut();

        // Si estamos en una página protegida, redirigir
        const currentPage = window.location.hash.replace("#", "") || "home";
        if (this.isProtectedPage(currentPage)) {
          window.history.replaceState(null, "", "#home");
        }
      }
    } catch (error) {
      console.error("Error in checkAuthState:", error);
    }
  }

  isProtectedPage(page) {
    const protectedPages = ["perfil", "reservas", "admin", "ventas"];
    return protectedPages.includes(page);
  }

  async login(email, password) {
    try {
      showAuthLoader("login", true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    } finally {
      showAuthLoader("login", false);
    }
  }

  async register(displayName, email, password) {
    try {
      showAuthLoader("register", true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: displayName.trim(),
            name: displayName.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await createUserProfile(authData.user.id, authData.user.email);
      }

      return {
        success: true,
        data: authData,
        message: "Usuario registrado exitosamente.",
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    } finally {
      showAuthLoader("register", false);
    }
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      window.currentUser = null;
      updateAuthUI(this);

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}
