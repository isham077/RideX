import React, { useState } from "react";
import { Star, X, Loader2, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../AuthContext";
import { User, Ride } from "../types";
import { cn } from "../lib/utils";
import { handleFirestoreError, OperationType } from "../services/firestoreUtils";
import { createNotification } from "../services/notificationService";

interface RatingModalProps {
  ride: Ride;
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ ride, targetUserId, targetUserName, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);

  const emojis = [
    { label: "Friendly", emoji: "😊" },
    { label: "Safe Driver", emoji: "🛡️" },
    { label: "Punctual", emoji: "⏰" },
    { label: "Clean Car", emoji: "🧼" },
    { label: "Good Music", emoji: "🎵" },
    { label: "Great Chat", emoji: "💬" },
    { label: "Polite", emoji: "👋" },
    { label: "Helpful", emoji: "🤝" }
  ];

  const toggleEmoji = (label: string) => {
    setSelectedEmojis(prev => 
      prev.includes(label) ? prev.filter(e => e !== label) : [...prev, label]
    );
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setIsSubmitting(true);

    try {
      // 1. Save Review
      const reviewPath = "reviews";
      try {
        await addDoc(collection(db, reviewPath), {
          rideId: ride.id,
          reviewerId: user.uid,
          revieweeId: targetUserId,
          rating,
          comment,
          feedbackTags: selectedEmojis,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, reviewPath);
      }

      // 2. Update Target User Profile
      const userRef = doc(db, "users", targetUserId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        
        let trustAdjustment = 0;
        if (rating >= 9) trustAdjustment = 3;
        else if (rating >= 7) trustAdjustment = 1;
        else if (rating <= 3) trustAdjustment = -5;
        else if (rating <= 5) trustAdjustment = -2;

        const currentRating = userData.rating || 0;
        const newRating = Number(((currentRating * 9 + rating) / 10).toFixed(1));
        const newTrustScore = Math.max(0, Math.min(100, (userData.trustScore || 50) + trustAdjustment));
        
        try {
          await updateDoc(userRef, {
            rating: newRating,
            trustScore: newTrustScore,
            completionRate: Math.min(100, (userData.completionRate || 0) + 2),
            reliability: Math.min(100, (userData.reliability || 0) + 1)
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
        }
      }

      // 3. Update Reviewer Reliability
      const reviewerRef = doc(db, "users", user.uid);
      const reviewerSnap = await getDoc(reviewerRef);
      if (reviewerSnap.exists()) {
        const revData = reviewerSnap.data() as User;
        try {
          await updateDoc(reviewerRef, {
            reliability: Math.min(100, (revData.reliability || 0) + 1)
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }

      // 4. Notify the rated user
      await createNotification(
        targetUserId,
        "rating_received",
        "New Rating Received ⭐",
        `${user.displayName || user.email} rated you ${rating}/10 for the ride from ${ride.source} to ${ride.destination}.`,
        ride.id
      );

      onSuccess();
    } catch (error) {
      console.error("Failed to submit rating:", error);
      alert("Error submitting rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500 border border-blue-500/20">
            <Star size={32} />
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Trust & Experience Rating</h3>
          <p className="text-zinc-500 text-sm mt-2 font-mono uppercase tracking-widest text-center">
            Rate {targetUserName} on a scale of 1 to 10
          </p>
        </div>

        <div className="space-y-10">
          {/* 1-10 Scale */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-mono text-zinc-600 uppercase">Poor</span>
              <span className="text-3xl font-black text-white">{rating || hoveredRating || "-"}</span>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">Excellent</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onMouseEnter={() => setHoveredRating(num)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(num)}
                  className={cn(
                    "aspect-square rounded-2xl text-sm font-black transition-all border-2 flex items-center justify-center",
                    (hoveredRating === num || rating === num) 
                      ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-[0_0_20px_rgba(37,99,235,0.4)] z-10" 
                      : (hoveredRating || rating) >= num
                        ? "bg-blue-900/40 border-blue-800 text-blue-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Emoji Feedback */}
          <div className="space-y-6">
            <div className="text-center">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1">Feedback Highlights</label>
              <p className="text-[9px] text-zinc-600 font-mono uppercase">Select tags that describe the experience</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {emojis.map((item) => (
                <button
                  key={item.label}
                  onClick={() => toggleEmoji(item.label)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                    selectedEmojis.includes(item.label)
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                  )}
                >
                  <span className="text-sm">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block text-center">Additional Comments (Optional)</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Any specific experiences or shoutouts..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] transition-colors"
            />
          </div>

          <div className="space-y-4">
            <button
              disabled={rating === 0 || isSubmitting}
              onClick={handleSubmit}
              className="w-full py-4 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="animate-spin text-black" size={20} /> : "Finalize Rating"}
            </button>
            <p className="text-center text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
              Ratings are anonymous and contribute to the member's aggregate trust score.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
