'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useNotificationStore } from '@/lib/store/notifications';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Bell, Archive, Mail, MailOpen, BellRing, ShoppingCart, UserPlus, Tag, Inbox, Clock } from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  'New Order': ShoppingCart,
  'New Customer': UserPlus,
  'Coupon Used': Tag,
  'Default': BellRing,
};

const NotificationsPage = () => {
  const { notifications, fetchNotifications, markAllAsRead, markAsRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'Unread') return notifications.filter(n => !n.read);
    if (activeTab === 'Read') return notifications.filter(n => n.read);
    return notifications;
  }, [notifications, activeTab]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce((acc, notification) => {
      const date = new Date(notification.createdAt);
      let group = 'Older';
      if (isToday(date)) group = 'Today';
      else if (isYesterday(date)) group = 'Yesterday';
      
      if (!acc[group]) acc[group] = [];
      acc[group].push(notification);
      return acc;
    }, {} as Record<string, typeof notifications>);
  }, [filteredNotifications]);

  const tabs = [
    { name: 'All', icon: Inbox, count: notifications.length },
    { name: 'Unread', icon: Mail, count: unreadCount },
    { name: 'Read', icon: MailOpen, count: readCount },
  ];

  return (
    <div className="flex h-full">
      <div className="w-1/4 max-w-xs p-4 border-r border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900 px-2 mb-6">Notifications</h1>
        <nav className="space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-normal transition-colors ${
                activeTab === tab.name
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} strokeWidth={1.5} />
              <span className="flex-1 text-left">{tab.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-normal transition-colors ${
                activeTab === tab.name
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>{tab.count}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{activeTab}</h2>
          {activeTab === 'Unread' && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </header>

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">It&apos;s all quiet in here</h3>
            <p className="mt-2 text-sm text-gray-500">
              {activeTab === 'All' && "You don&apos;t have any notifications yet."}
              {activeTab === 'Unread' && "You&apos;ve read all your notifications."}
              {activeTab === 'Read' && "You haven&apos;t received any notifications yet."}
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
            <div key={group} className="mb-8">
              <h3 className="text-base font-medium text-gray-700 mb-4">{group}</h3>
              <div className="bg-white rounded-xl border border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {groupNotifications.map(notification => {
                    const Icon = iconMap[notification.title] || iconMap['Default'];
                    return (
                      <li
                        key={notification.id}
                        className={`p-4 transition-colors duration-200 ${
                          !notification.read ? 'hover:bg-gray-50 cursor-pointer' : ''
                        }`}
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Icon size={20} className="text-gray-600" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm text-gray-700">{notification.title}</p>
                              <span className="flex items-center gap-1 text-xs text-gray-700">
                                <Clock size={14} className="inline-block" />
                                {format(new Date(notification.createdAt), 'p')}
                              </span>
                            </div>
                            <p className="font-thin text-xs text-gray-500 mt-1">{notification.message}</p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 