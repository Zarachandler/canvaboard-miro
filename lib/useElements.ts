'use client';

import { useEffect, Dispatch, SetStateAction } from 'react';
import { supabase } from '@/lib/supabaseClient';

type CanvasElementData = {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  color?: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
};

export function useBoardElements(
  boardId: string,
  setElements: Dispatch<SetStateAction<CanvasElementData[]>>
) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:board_elements:${boardId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'board_elements',
        filter: `board_id=eq.${boardId}`
      }, payload => {
        const { eventType, new: newEl, old: oldEl } = payload;

        setElements(prev => {
          switch (eventType) {
            case 'INSERT':
              return [...prev, transform(newEl)];
            case 'UPDATE':
              return prev.map(el => el.id === newEl.id ? transform(newEl) : el);
            case 'DELETE':
              return prev.filter(el => el.id !== oldEl.id);
            default:
              return prev;
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, setElements]);
}

function transform(el: any): CanvasElementData {
  return {
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width ?? 100,
    height: el.height ?? 100,
    content: el.content ?? '',
    color: el.color ?? '#000000',
    strokeWidth: el.stroke_width ?? 1,
    points: el.points ? JSON.parse(el.points) : undefined
  };
}