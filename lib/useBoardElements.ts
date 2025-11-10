// 'use client';

// import { useEffect, Dispatch, SetStateAction } from 'react';
// import { supabase } from '@/lib/supabaseClient';

// type CanvasElementData = {
//   id: string;
//   type: string;
//   x: number;
//   y: number;
//   width?: number;
//   height?: number;
//   content?: string;
//   color?: string;
//   strokeWidth?: number;
//   points?: { x: number; y: number }[];
// };

// export function useBoardElements(
//   boardId: string,
//   setElements: Dispatch<SetStateAction<CanvasElementData[]>>
// ) {
//   useEffect(() => {
//     const channel = supabase
//       .channel(`realtime:board_elements:${boardId}`)
//       .on('postgres_changes', {
//         event: '*',
//         schema: 'public',
//         table: 'board_elements',
//         filter: `board_id=eq.${boardId}`
//       }, payload => {
//         const { eventType, new: newEl, old: oldEl } = payload;

//         setElements(prev => {
//           switch (eventType) {
//             case 'INSERT':
//               return [...prev, transform(newEl)];
//             case 'UPDATE':
//               return prev.map(el => el.id === newEl.id ? transform(newEl) : el);
//             case 'DELETE':
//               return prev.filter(el => el.id !== oldEl.id);
//             default:
//               return prev;
//           }
//         });
//       })
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [boardId, setElements]);
// }

// function transform(el: any): CanvasElementData {
//   return {
//     id: el.id,
//     type: el.type,
//     x: el.x,
//     y: el.y,
//     width: el.width ?? 100,
//     height: el.height ?? 100,
//     content: el.content ?? '',
//     color: el.color ?? '#000000',
//     strokeWidth: el.stroke_width ?? 1,
//     points: el.points ? JSON.parse(el.points) : undefined
//   };
// }




'use client';

import { useEffect, Dispatch, SetStateAction } from 'react';
import { supabase } from './supabaseClient';

export type CanvasElementData = {
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

// Define proper types for Supabase real-time payloads
type BoardElementRow = {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  content: string | null;
  color: string | null;
  stroke_width: number;
  points: string | null;
  created_at: string;
  updated_at: string;
};

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: BoardElementRow | null;
  old: BoardElementRow | null;
};

// Function to save a single element to the database
export const saveElementToDB = async (boardId: string, element: Omit<CanvasElementData, 'id'>): Promise<{ success: boolean; data?: CanvasElementData; error?: string }> => {
  try {
    console.log('🟡 Saving element to DB:', { boardId, element });
    
    const elementData = {
      board_id: boardId,
      type: element.type,
      x: Math.round(element.x),
      y: Math.round(element.y),
      width: element.width ? Math.round(element.width) : null,
      height: element.height ? Math.round(element.height) : null,
      content: element.content || null,
      color: element.color || null,
      stroke_width: element.strokeWidth || 1,
      points: element.points ? JSON.stringify(element.points) : null,
    };

    console.log('🟡 Inserting element data:', elementData);

    const { data, error } = await supabase
      .from('board_elements')
      .insert(elementData)
      .select()
      .single();

    if (error) {
      console.error('🔴 Error saving element:', error);
      return { success: false, error: error.message };
    }

    console.log('🟢 Element saved successfully:', data);
    return { success: true, data: transformRowToElement(data) };
  } catch (error: any) {
    console.error('🔴 Error saving element to DB:', error);
    return { success: false, error: error.message };
  }
};

// Function to update an existing element
export const updateElementInDB = async (elementId: string, updates: Partial<CanvasElementData>): Promise<{ success: boolean; error?: string }> => {
  try {
    const updateData: any = {};
    
    if (updates.x !== undefined) updateData.x = Math.round(updates.x);
    if (updates.y !== undefined) updateData.y = Math.round(updates.y);
    if (updates.width !== undefined) updateData.width = updates.width ? Math.round(updates.width) : null;
    if (updates.height !== undefined) updateData.height = updates.height ? Math.round(updates.height) : null;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.strokeWidth !== undefined) updateData.stroke_width = updates.strokeWidth;
    if (updates.points !== undefined) updateData.points = updates.points ? JSON.stringify(updates.points) : null;

    console.log('🟡 Updating element:', { elementId, updates: updateData });

    const { error } = await supabase
      .from('board_elements')
      .update(updateData)
      .eq('id', elementId);

    if (error) {
      console.error('🔴 Error updating element:', error);
      return { success: false, error: error.message };
    }

    console.log('🟢 Element updated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('🔴 Error updating element in DB:', error);
    return { success: false, error: error.message };
  }
};

// Function to delete an element from the database
export const deleteElementFromDB = async (elementId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🟡 Deleting element:', elementId);

    const { error } = await supabase
      .from('board_elements')
      .delete()
      .eq('id', elementId);

    if (error) {
      console.error('🔴 Error deleting element:', error);
      return { success: false, error: error.message };
    }

    console.log('🟢 Element deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('🔴 Error deleting element from DB:', error);
    return { success: false, error: error.message };
  }
};

// Function to get all elements for a board
export const getBoardElements = async (boardId: string): Promise<{ success: boolean; data?: CanvasElementData[]; error?: string }> => {
  try {
    console.log('🟡 Fetching elements for board:', boardId);

    const { data, error } = await supabase
      .from('board_elements')
      .select('*')
      .eq('board_id', boardId)
      .order('created_at');

    if (error) {
      console.error('🔴 Error fetching elements:', error);
      return { success: false, error: error.message };
    }

    console.log('🟢 Fetched elements:', data?.length || 0);
    return { 
      success: true, 
      data: data ? data.map(transformRowToElement) : [] 
    };
  } catch (error: any) {
    console.error('🔴 Error fetching board elements:', error);
    return { success: false, error: error.message };
  }
};

// Function to clear all elements for a board
export const clearBoardElements = async (boardId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('board_elements')
      .delete()
      .eq('board_id', boardId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing board elements:', error);
    return { success: false, error: error.message };
  }
};

// Initialize board elements
export const initializeBoardElements = async (boardId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🟡 Initializing board elements for:', boardId);
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('board_elements')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('🔴 Database connection test failed:', testError);
      return { success: false, error: testError.message };
    }

    console.log('🟢 Database connection successful');
    return { success: true };
  } catch (error: any) {
    console.error('Error initializing board elements:', error);
    return { success: false, error: error.message };
  }
};

export function useBoardElements(
  boardId: string,
  setElements: Dispatch<SetStateAction<CanvasElementData[]>>
) {
  useEffect(() => {
    if (!boardId) {
      console.log('🟡 No boardId provided, skipping element fetch');
      return;
    }

    const fetchElements = async () => {
      console.log('🟡 Starting to fetch elements for board:', boardId);
      const result = await getBoardElements(boardId);
      if (result.success && result.data) {
        console.log('🟢 Setting elements:', result.data.length);
        setElements(result.data);
      } else if (result.error) {
        console.error('🔴 Failed to fetch elements:', result.error);
      }
    };

    fetchElements();

    // Set up real-time subscription
    try {
      console.log('🟡 Setting up real-time subscription for board:', boardId);
      
      const channel = supabase
        .channel(`board-elements-${boardId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'board_elements',
            filter: `board_id=eq.${boardId}`
          },
          (payload: any) => {
            const { eventType, new: newRow, old: oldRow } = payload as RealtimePayload;
            
            console.log('🟡 Real-time update:', eventType, newRow?.id || oldRow?.id);

            setElements(prev => {
              switch (eventType) {
                case 'INSERT':
                  if (newRow) {
                    console.log('🟢 INSERT event:', newRow.type, newRow.id);
                    return [...prev, transformRowToElement(newRow)];
                  }
                  return prev;
                  
                case 'UPDATE':
                  if (newRow) {
                    console.log('🟡 UPDATE event:', newRow.type, newRow.id);
                    return prev.map(el => el.id === newRow.id ? transformRowToElement(newRow) : el);
                  }
                  return prev;
                  
                case 'DELETE':
                  if (oldRow) {
                    console.log('🔴 DELETE event:', oldRow.id);
                    return prev.filter(el => el.id !== oldRow.id);
                  }
                  return prev;
                  
                default:
                  return prev;
              }
            });
          }
        )
        .subscribe((status) => {
          console.log('🟡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('🟢 Real-time subscription established');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('🔴 Real-time subscription error');
          }
        });

      return () => {
        console.log('🟡 Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('🔴 Error setting up real-time subscription:', error);
    }
  }, [boardId, setElements]);
}

// Helper function to transform database row to CanvasElementData
function transformRowToElement(row: BoardElementRow): CanvasElementData {
  let points: { x: number; y: number }[] | undefined;
  
  try {
    if (row.points) {
      points = JSON.parse(row.points);
      // Ensure points is always an array of {x, y} objects
      if (Array.isArray(points)) {
        points = points.map(p => ({
          x: typeof p.x === 'number' ? p.x : 0,
          y: typeof p.y === 'number' ? p.y : 0
        }));
      }
    }
  } catch (error) {
    console.error('Error parsing points:', error);
    points = undefined;
  }

  return {
    id: row.id,
    type: row.type,
    x: row.x,
    y: row.y,
    width: row.width || undefined,
    height: row.height || undefined,
    content: row.content || '',
    color: row.color || undefined,
    strokeWidth: row.stroke_width || 1,
    points: points
  };
}
