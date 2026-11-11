import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  Calendar,
  Check,
  Trash2,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';

interface NotificationsPageProps {
  onNavigate: (path: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppData();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time automated alerts for shifts, overtime approvals, and RazorpayX payout settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={markAllNotificationsRead}
              className="px-3 py-1.5 bg-white border border-slate-200 text-brand-600 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs max-w-xs text-xs font-semibold">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'all' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`flex-1 py-1.5 rounded-xl transition-all ${
            filter === 'unread' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No notifications to display in this view.
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                if (n.link) onNavigate(n.link);
              }}
              className={`p-4 flex items-start gap-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                !n.read ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  n.type === 'payment_success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : n.type === 'overtime_approved' || n.type === 'overtime_submitted'
                    ? 'bg-amber-100 text-amber-600'
                    : n.type === 'shift_assigned'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {n.type === 'payment_success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : n.type === 'overtime_approved' ? (
                  <Clock className="w-5 h-5" />
                ) : n.type === 'shift_assigned' ? (
                  <Calendar className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                {n.link && (
                  <span className="inline-block mt-2 text-[11px] font-semibold text-brand-600 hover:underline">
                    View Related Record →
                  </span>
                )}
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

