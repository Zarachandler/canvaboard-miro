// app/services/boardService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type CanvasData = {
  shapes: any[];
  textAreas: any[];
  freehandPaths: any[];
  comments: any[];
  boardName: string;
  boardId: string;
  lastUpdated: string;
};

export type CollaborationBoard = {
  id: string;
  name: string;
  owner_id: string;
  canvas_data: CanvasData;
  created_at: string;
  updated_at: string;
};

// Board operations
export const saveCollaborationBoard = async (
  boardId: string,
  canvasData: CanvasData,
  boardName: string,
  role: 'owner' | 'editor' | 'viewer' = 'owner'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('collaboration_boards')
      .insert({
        id: boardId,
        name: boardName,
        owner_id: user.id,
        canvas_data: canvasData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message };
    }

    // Add owner as collaborator
    await addCollaboratorToBoard(boardId, user.email!, 'owner');

    return { success: true };
  } catch (error: any) {
    console.error('Error saving board:', error);
    return { success: false, error: error.message };
  }
};

export const updateCollaborationBoard = async (
  boardId: string,
  canvasData: CanvasData,
  boardName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('collaboration_boards')
      .update({
        name: boardName,
        canvas_data: canvasData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating board:', error);
    return { success: false, error: error.message };
  }
};

export const getBoardById = async (
  boardId: string
): Promise<{ success: boolean; data?: CollaborationBoard; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('collaboration_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - board doesn't exist
        return { success: true, data: undefined };
      }
      throw error;
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching board:', error);
    return { success: false, error: error.message };
  }
};

// Collaborator operations
export const addCollaboratorToBoard = async (
  boardId: string, 
  collaboratorEmail: string, 
  role: 'owner' | 'editor' | 'viewer' = 'viewer'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('board_collaborators')
      .insert({
        board_id: boardId,
        email: collaboratorEmail,
        name: collaboratorEmail.split('@')[0],
        role: role,
        status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    return { success: false, error: error.message };
  }
};

export const getBoardCollaborators = async (
  boardId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('board_collaborators')
      .select('*')
      .eq('board_id', boardId)
      .order('invited_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    return { success: false, error: error.message };
  }
};

export const updateCollaboratorRole = async (
  boardId: string,
  collaboratorEmail: string,
  newRole: 'editor' | 'viewer'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('board_collaborators')
      .update({ role: newRole })
      .eq('board_id', boardId)
      .eq('email', collaboratorEmail);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating collaborator role:', error);
    return { success: false, error: error.message };
  }
};

export const removeCollaboratorFromBoard = async (
  boardId: string,
  collaboratorEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('board_collaborators')
      .delete()
      .eq('board_id', boardId)
      .eq('email', collaboratorEmail);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    return { success: false, error: error.message };
  }
}; 