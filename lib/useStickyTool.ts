import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export function useBoardPresence(boardId: string, user: any) {
  const [presenceUsers, setPresenceUsers] = useState<any[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`presence:${boardId}`);
    channelRef.current = channel;

    channel.on('broadcast', { event: 'cursor' }, payload => {
      setPresenceUsers(prev => {
        const others = prev.filter(p => p.id !== payload.payload.id);
        return [...others, payload.payload];
      });
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [boardId, user?.id]);

  const updateCursor = (x: number, y: number) => {
    const presence = {
      id: user.id,
      name: user.name,
      x,
      y,
      color: getColorFromId(user.id),
    };

    setPresenceUsers(prev => {
      const others = prev.filter(p => p.id !== user.id);
      return [...others, presence];
    });

    channelRef.current?.broadcast('cursor', presence);
  };

  return { presenceUsers, updateCursor };
}

function getColorFromId(id: string) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return colors[sum % colors.length];
}