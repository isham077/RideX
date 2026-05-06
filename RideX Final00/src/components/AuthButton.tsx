import React from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../AuthContext";
import { LogIn, LogOut, ShieldCheck, Car, Users } from "lucide-react";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";

export const AuthButton: React.FC = () => {
  const { firebaseUser, user, loading } = useAuth();

  const handleLogin = async (role: "driver" | "passenger") => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Initial user setup
        const newUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || "User",
          role: role,
          trustScore: 50, // Starting middle trust
          rating: 0, // No rating yet
          completionRate: 0, // No rides completed
          reliability: 0, // No history
          isVerified: false,
          ecoImpact: 0,
        };
        await setDoc(userRef, newUser);
      } else {
        // Update role if they specifically chose a different one this time
        await updateDoc(userRef, { role });
      }
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return <div className="animate-pulse h-10 w-24 bg-zinc-800 rounded-lg" />;

  if (firebaseUser) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-zinc-100">{user?.displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
            {user?.role} {user?.isVerified && "• VERIFIED"}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-red-400"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleLogin("passenger")}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg font-medium transition-all"
      >
        <Users size={16} />
        <span className="hidden sm:inline">Passenger Login</span>
        <span className="sm:hidden">User</span>
      </button>
      <button
        onClick={() => handleLogin("driver")}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
      >
        <Car size={16} />
        <span className="hidden sm:inline">Driver Login</span>
        <span className="sm:hidden">Driver</span>
      </button>
    </div>
  );
};
