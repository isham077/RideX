import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import {
  AppNotification,
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationMeta,
} from "../services/notificationService";
import { cn } from "../lib/utils";

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newToast, setNewToast] = useState<AppNotification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      const unreadCount = newNotifications.filter((n) => !n.read).length;
      if (unreadCount > prevCountRef.current && newNotifications.length > 0) {
        const latest = newNotifications[0];
        if (!latest.read) {
          setNewToast(latest);
          setTimeout(() => setNewToast(null), 5000);
        }
      }
      prevCountRef.current = unreadCount;
    });
    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read) await markNotificationRead(notification.id);
    if (notification.rideId) {
      navigate(`/ride/${notification.rideId}`);
      setIsOpen(false);
    }
  };

  const timeAgo = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={panelRef}>
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>

        {/* Dropdown Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 md:w-96 max-h-[480px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => user?.uid && markAllNotificationsRead(user.uid)}
                    className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck size={12} /> Mark all
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {notifications.length > 0 ? (
                  notifications.map((n) => {
                    const meta = getNotificationMeta(n.type);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "w-full text-left px-5 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors flex items-start gap-3",
                          !n.read && "bg-emerald-500/[0.03]"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm mt-0.5", meta.bgColor)}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={cn("text-xs font-bold truncate", n.read ? "text-zinc-400" : "text-white")}>
                              {n.title}
                            </h4>
                            {!n.read && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1 block">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-16 text-center">
                    <Bell size={32} className="mx-auto text-zinc-800 mb-3" />
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">No notifications yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Toast */}
      <AnimatePresence>
        {newToast && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className="fixed top-20 right-4 z-[100] w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm", getNotificationMeta(newToast.type).bgColor)}>
                {getNotificationMeta(newToast.type).icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{newToast.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5 line-clamp-2">{newToast.message}</p>
              </div>
              <button onClick={() => setNewToast(null)} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                <X size={14} />
              </button>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-0.5 bg-emerald-500"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
