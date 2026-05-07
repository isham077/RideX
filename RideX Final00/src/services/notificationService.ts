import { addDoc, collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";

export type NotificationType =
  | "booking_new"
  | "booking_confirmed"
  | "booking_rejected"
  | "ride_started"
  | "ride_completed"
  | "sos_alert"
  | "rating_received"
  | "ride_cancelled";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  rideId?: string;
  read: boolean;
  createdAt: string;
}

// --- CREATE NOTIFICATION ---
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  rideId?: string
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      title,
      message,
      rideId: rideId || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Notifications] Failed to create notification:", err);
  }
}

// --- BATCH NOTIFY MULTIPLE USERS ---
export async function notifyMultipleUsers(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  rideId?: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const userId of userIds) {
    const ref = doc(collection(db, "notifications"));
    batch.set(ref, {
      userId,
      type,
      title,
      message,
      rideId: rideId || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  try {
    await batch.commit();
  } catch (err) {
    console.error("[Notifications] Failed to batch notify:", err);
  }
}

// --- REAL-TIME SUBSCRIPTION ---
export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications: AppNotification[] = snapshot.docs.map((d) => ({
      ...(d.data() as Omit<AppNotification, "id">),
      id: d.id,
    }));
    onUpdate(notifications);
  }, (error) => {
    console.error("[Notifications] Subscription error:", error);
  });
  return unsubscribe;
}

// --- MARK READ ---
export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
  } catch (err) {
    console.error("[Notifications] Failed to mark read:", err);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("[Notifications] Failed to mark all read:", err);
  }
}

// --- TYPE META (icon, color) ---
export function getNotificationMeta(type: NotificationType): { icon: string; color: string; bgColor: string } {
  switch (type) {
    case "booking_new":      return { icon: "📋", color: "text-blue-400",    bgColor: "bg-blue-500/10" };
    case "booking_confirmed":return { icon: "✅", color: "text-emerald-400", bgColor: "bg-emerald-500/10" };
    case "booking_rejected": return { icon: "❌", color: "text-red-400",     bgColor: "bg-red-500/10" };
    case "ride_started":     return { icon: "🚗", color: "text-blue-400",    bgColor: "bg-blue-500/10" };
    case "ride_completed":   return { icon: "⭐", color: "text-yellow-400",  bgColor: "bg-yellow-500/10" };
    case "sos_alert":        return { icon: "🚨", color: "text-red-500",     bgColor: "bg-red-500/10" };
    case "rating_received":  return { icon: "⭐", color: "text-yellow-400",  bgColor: "bg-yellow-500/10" };
    case "ride_cancelled":   return { icon: "🗑️", color: "text-zinc-400",   bgColor: "bg-zinc-500/10" };
    default:                 return { icon: "🔔", color: "text-zinc-400",    bgColor: "bg-zinc-500/10" };
  }
}
