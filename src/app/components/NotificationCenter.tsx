'use client';

import { useState, useEffect } from 'react';
import { Bell, X, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'positive' | 'neutral';
    timestamp: number;
    read: boolean;
}

// Simple event bus for adding notifications from anywhere
export const NOTIFICATION_EVENT = 'lv_notification_add';

export function triggerNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent(NOTIFICATION_EVENT, { detail: notification });
        window.dispatchEvent(event);
    }
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Listen for new notifications
        const handleNewNotification = (e: any) => {
            const data = e.detail;
            const newNotif: Notification = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                read: false,
                ...data
            };
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        };

        window.addEventListener(NOTIFICATION_EVENT, handleNewNotification);
        return () => window.removeEventListener(NOTIFICATION_EVENT, handleNewNotification);
    }, []);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Mark all as read when opening? Or maybe just clear badge
            // setUnreadCount(0); 
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
    };

    return (
        <div className="relative z-50">
            <button
                onClick={toggleOpen}
                className="relative p-2.5 bg-white border-2 border-sumi-black rounded hover:bg-sumi-black/5 transition-colors group"
            >
                <Bell className={cn("w-5 h-5 text-sumi-black", unreadCount > 0 ? "animate-tada" : "")} />
                {unreadCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-intl-orange border border-white flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{unreadCount}</span>
                    </div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-80 bg-white border-2 border-sumi-black shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-lg overflow-hidden"
                    >
                        <div className="p-3 border-b-2 border-sumi-black bg-sumi-black text-white flex justify-between items-center">
                            <span className="font-bold uppercase text-xs tracking-wider">Notifications</span>
                            <div className="flex gap-2">
                                <button onClick={clearAll} className="text-[10px] hover:underline opacity-80">Clear</button>
                                <button onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto bg-paper-white p-2 space-y-2">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-sumi-black/40 font-mono italic">
                                    No new alerts.
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={cn(
                                            "p-3 rounded border-2 transition-all cursor-pointer",
                                            n.read ? "bg-white border-sumi-black/10 opacity-60" : "bg-white border-sumi-black shadow-sm"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                                                n.type === 'warning' ? "bg-intl-orange/10 border-intl-orange text-intl-orange" :
                                                    n.type === 'positive' ? "bg-matchbox-green/10 border-matchbox-green text-matchbox-green" :
                                                        "bg-sumi-black/5 border-sumi-black text-sumi-black"
                                            )}>
                                                {n.type === 'warning' ? <TrendingDown className="w-4 h-4" /> :
                                                    n.type === 'positive' ? <TrendingUp className="w-4 h-4" /> :
                                                        <AlertTriangle className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-xs text-sumi-black leading-tight">{n.title}</h4>
                                                <p className="text-[10px] text-sumi-black/70 mt-1 leading-snug">{n.message}</p>
                                                <div className="text-[9px] text-sumi-black/40 font-mono mt-1">
                                                    {new Date(n.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
