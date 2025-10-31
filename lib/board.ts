// lib/board.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Board Types
export interface Board {
  id: string;
  name: string;
  type: BoardType;
  created_at: string;
  updated_at: string;
  owner: string;
  owner_id: string;
  online_users: number;
  starred: boolean;
  thumbnail?: string;
}

export type BoardType =
  | 'blank'
  | 'flowchart'
  | 'mindmap'
  | 'kanban'
  | 'retrospective'
  | 'brainwriting'
  | 'collaboration';

// Collaboration interfaces - UPDATED for simple users table
export interface CollaborationUser {
  id: number;
  name: string | null;
  email: string;
  role: 'editor';
  board_id: string;
  added_at: string;
}

// Mapping function with proper type handling
export function mapDbBoardToBoard(dbBoard: any): Board {
  return {
    id: dbBoard.id,
    name: dbBoard.name,
    type: dbBoard.type,
    created_at: dbBoard.created_at,
    updated_at: dbBoard.updated_at,
    owner: dbBoard.owner,
    owner_id: dbBoard.owner_id,
    online_users: dbBoard.online_users || 0,
    starred: Boolean(dbBoard.starred),
    thumbnail: dbBoard.thumbnail
  };
}

// Convert CollaborationUser to Board format - UPDATED for simple users table
export function mapCollaborationToBoard(collab: CollaborationUser): Board {
  // For users table, we need to fetch the board details separately
  // This is a simplified version - you might want to enhance this
  return {
    id: collab.board_id,
    name: `Shared Board (${collab.board_id})`, // Placeholder - you'll need to get the actual name
    type: 'collaboration',
    created_at: collab.added_at,
    updated_at: collab.added_at,
    owner: 'Shared', // Placeholder
    owner_id: 'shared', // Placeholder
    online_users: 0,
    starred: false,
    thumbnail: undefined
  };
}

// ENHANCED: Convert CollaborationUser to Board with actual board data
export async function mapCollaborationToBoardWithData(collab: CollaborationUser): Promise<Board> {
  try {
    // Try to get board data from collaboration_boards first
    const { data: collabBoard } = await supabase
      .from('collaboration_boards')
      .select('*')
      .eq('id', collab.board_id)
      .single();

    if (collabBoard) {
      return {
        id: collabBoard.id,
        name: collabBoard.name,
        type: 'collaboration',
        created_at: collabBoard.created_at,
        updated_at: collabBoard.updated_at,
        owner: collabBoard.owner_id, // Using owner_id as owner name
        owner_id: collabBoard.owner_id,
        online_users: 0,
        starred: false,
        thumbnail: undefined
      };
    }

    // Fallback to regular board table
    const { data: regularBoard } = await supabase
      .from('board')
      .select('*')
      .eq('id', collab.board_id)
      .single();

    if (regularBoard) {
      return mapDbBoardToBoard(regularBoard);
    }

    // Final fallback
    return {
      id: collab.board_id,
      name: `Shared Board (${collab.board_id})`,
      type: 'collaboration',
      created_at: collab.added_at,
      updated_at: collab.added_at,
      owner: 'Shared',
      owner_id: 'shared',
      online_users: 0,
      starred: false,
      thumbnail: undefined
    };
  } catch (error) {
    console.error('Error mapping collaboration to board:', error);
    return mapCollaborationToBoard(collab);
  }
}

// Get current authenticated user
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Check if user has access to board (owner or collaborator)
export async function checkBoardAccess(userId: string, boardId: string): Promise<{ hasAccess: boolean; isOwner?: boolean }> {
  try {
    if (!userId || !boardId) {
      return { hasAccess: false };
    }

    // First check if user is owner (from board table)
    const { data: boardData, error: boardError } = await supabase
      .from('board')
      .select('owner_id')
      .eq('id', boardId)
      .single();

    if (!boardError && boardData && boardData.owner_id === userId) {
      return { hasAccess: true, isOwner: true };
    }

    // Check collaboration_boards owner
    const { data: collabBoardData, error: collabBoardError } = await supabase
      .from('collaboration_boards')
      .select('owner_id')
      .eq('id', boardId)
      .single();

    if (!collabBoardError && collabBoardData && collabBoardData.owner_id === userId) {
      return { hasAccess: true, isOwner: true };
    }

    // Then check if user is in users table as collaborator
    const { data: collaboratorData, error: collaboratorError } = await supabase
      .from('users')
      .select('id')
      .eq('board_id', boardId)
      .eq('email', userId)
      .single();

    if (collaboratorError && collaboratorError.code !== 'PGRST116') {
      console.error('Error checking collaborator access:', collaboratorError);
    }

    return { 
      hasAccess: !!collaboratorData, 
      isOwner: false 
    };
  } catch (error) {
    console.error('Error checking board access:', error);
    return { hasAccess: false };
  }
}

// Create board
export async function createBoard(
  board: Omit<Board, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Board; error?: string }> {
  try {
    console.log('🟡 [CREATE BOARD] Creating board with data:', {
      name: board.name,
      type: board.type,
      owner_id: board.owner_id,
      owner: board.owner
    });

    // Validate required fields
    if (!board.name || !board.type || !board.owner_id || !board.owner) {
      const errorMsg = 'Missing required board fields';
      console.error('🔴 [CREATE BOARD]', errorMsg);
      return { success: false, error: errorMsg };
    }

    const { data, error } = await supabase
      .from('board')
      .insert([
        {
          name: board.name,
          type: board.type,
          owner_id: board.owner_id,
          owner: board.owner,
          online_users: 0,
          starred: Boolean(board.starred),
          thumbnail: board.thumbnail || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('🔴 [CREATE BOARD] Database error:', error);
      return { success: false, error: error.message };
    }

    const newBoard = mapDbBoardToBoard(data);

    console.log('🟢 [CREATE BOARD] Board created successfully:', data.id);
    
    return { success: true, data: newBoard };
  } catch (error) {
    console.error('🔴 [CREATE BOARD] Error in createBoard:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Get user boards - Only boards where owner_id equals userId
export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
    console.log('🟡 [GET BOARDS] Getting boards for user:', userId);

    if (!userId) {
      console.log('🔴 [GET BOARDS] No user ID provided');
      return [];
    }

    // Get boards where user is owner (owner_id equals userId)
    const { data: boardData, error: boardError } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (boardError) {
      console.error('🔴 [GET BOARDS] Error fetching board data:', boardError);
      return [];
    }

    console.log('🟢 [GET BOARDS] Boards found:', boardData?.length);

    const boards = (boardData || []).map(mapDbBoardToBoard);
    console.log('🟢 [GET BOARDS] Final boards to return:', boards.length);
    
    return boards;
  } catch (error) {
    console.error('🔴 [GET BOARDS] Unexpected error:', error);
    return [];
  }
}

// Get all boards (for dashboard display)
export async function getAllBoards(): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all boards:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getAllBoards:', error);
    return [];
  }
}

// Get board by ID
export async function getBoardById(boardId: string): Promise<Board | null> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch board: ${error.message}`);
    }

    return mapDbBoardToBoard(data);
  } catch (error) {
    console.error('Error in getBoardById:', error);
    throw error;
  }
}

// Fetch online users - Return 1 for owner
export async function fetchOnlineUsers(boardId: string): Promise<number> {
  try {
    if (!boardId) return 0;
    return 1; // Owner is always considered online
  } catch (error) {
    return 0;
  }
}

// Update board online users count
export async function updateBoardOnlineUsers(boardId: string, count: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board')
      .update({ online_users: count })
      .eq('id', boardId);

    return !error;
  } catch (error) {
    return false;
  }
}

// Add user to board - Simplified
export async function addUserToBoard(userId: string, boardId: string, userName: string = ''): Promise<boolean> {
  try {
    const board = await getBoardById(boardId);
    if (!board) {
      return false;
    }

    // Just update online users count
    const onlineCount = await fetchOnlineUsers(boardId);
    await updateBoardOnlineUsers(boardId, onlineCount + 1);
    
    return true;
  } catch (error) {
    console.error('Error in addUserToBoard:', error);
    return false;
  }
}

// Helper function to create board with default values
export async function createBoardWithDefaults(
  name: string,
  type: BoardType,
  owner: string,
  ownerId: string
): Promise<Board> {
  const boardData = {
    name,
    type,
    owner,
    owner_id: ownerId,
    online_users: 0,
    starred: false,
    thumbnail: undefined
  };

  const result = await createBoard(boardData);
  if (result.success && result.data) {
    return result.data;
  }
  throw new Error(result.error || 'Failed to create board');
}

// Get board collaborators - From users table (SIMPLIFIED)
export async function getBoardCollaborators(boardId: string): Promise<CollaborationUser[]> {
  try {
    if (!boardId) {
      console.error('Board ID is required');
      return [];
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('board_id', boardId)
      .order('added_at', { ascending: true });

    if (error) {
      console.error('Error fetching board collaborators:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getBoardCollaborators:', error);
    return [];
  }
}

// Remove user from board - Simplified
export async function removeUserFromBoard(userId: string, boardId: string): Promise<boolean> {
  try {
    const onlineCount = await fetchOnlineUsers(boardId);
    await updateBoardOnlineUsers(boardId, Math.max(0, onlineCount - 1));
    return true;
  } catch (error) {
    console.error('Error in removeUserFromBoard:', error);
    return false;
  }
}

// Update board with proper boolean handling
export async function updateBoard(
  boardId: string,
  updates: Partial<Omit<Board, 'id' | 'created_at' | 'updated_at'>>
): Promise<Board> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.owner !== undefined) updateData.owner = updates.owner;
    if (updates.owner_id !== undefined) updateData.owner_id = updates.owner_id;
    if (updates.online_users !== undefined) updateData.online_users = updates.online_users;
    if (updates.starred !== undefined) updateData.starred = Boolean(updates.starred);
    if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;

    const { data, error } = await supabase
      .from('board')
      .update(updateData)
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update board: ${error.message}`);
    }

    return mapDbBoardToBoard(data);
  } catch (error) {
    console.error('Error in updateBoard:', error);
    throw error;
  }
}

// Toggle star with proper boolean handling
export async function toggleStar(boardId: string, currentStarred: boolean): Promise<Board> {
  try {
    const { data, error } = await supabase
      .from('board')
      .update({ 
        starred: !currentStarred
      })
      .eq('id', boardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle star: ${error.message}`);
    }

    return mapDbBoardToBoard(data);
  } catch (error) {
    console.error('Error in toggleStar:', error);
    throw error;
  }
}

// Delete board
export async function deleteBoard(boardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board')
      .delete()
      .eq('id', boardId);

    if (error) {
      throw new Error(`Failed to delete board: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error in deleteBoard:', error);
    throw error;
  }
}

// Search boards - Only user's boards
export async function searchBoards(query: string, userId: string): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .ilike('name', `%${query}%`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error searching boards:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in searchBoards:', error);
    return [];
  }
}

// Get recent boards - Only user's recent boards
export async function getRecentBoards(userId: string, limit: number = 5): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent boards:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getRecentBoards:', error);
    return [];
  }
}

// Get starred boards - Only user's starred boards
export async function getStarredBoards(userId: string): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .eq('starred', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching starred boards:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getStarredBoards:', error);
    return [];
  }
}

// Get owned boards only - owner_id equals userId
export async function getOwnedBoards(userId: string): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching owned boards:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getOwnedBoards:', error);
    return [];
  }
}

// Get boards by owner_id (explicit function)
export async function getBoardsByOwnerId(ownerId: string): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching boards by owner_id:', error);
      return [];
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getBoardsByOwnerId:', error);
    return [];
  }
}

// Collaboration functions

// SIMPLIFIED: Add collaborator to users table only
export async function addCollaborator(
  boardId: string, 
  userId: string, 
  userName: string = '',
  role: 'editor' = 'editor'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    if (!boardId || !userId) {
      return { success: false, error: 'Board ID and user ID are required' };
    }

    if (role !== 'editor') {
      return { success: false, error: 'Only editor role is supported' };
    }

    // Save collaborator info in USERS table (simple version)
    const { error } = await supabase
      .from('users')
      .insert([
        {
          name: userName || null,
          email: userId,
          role: role,
          board_id: boardId,
        }
      ])
      .select();

    if (error) {
      console.error('Error adding collaborator:', error);
      
      // Handle specific error cases
      if (error.code === '23505') {
        return { success: false, error: 'User is already a collaborator on this board' };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Remove collaborator from board - Remove from users table
export async function removeCollaborator(
  boardId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!boardId || !userId) {
      return { success: false, error: 'Board ID and user ID are required' };
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('board_id', boardId)
      .eq('email', userId);

    if (error) {
      console.error('Error removing collaborator:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeCollaborator:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Get ALL boards for user DIRECTLY from users table - ENHANCED VERSION
export async function getUserAllBoardsFromUsersTable(userId: string): Promise<Board[]> {
  try {
    console.log('🟡 [GET BOARDS FROM USERS TABLE] Getting boards for user ID:', userId);

    if (!userId) {
      console.log('🔴 No user ID provided');
      return [];
    }

    // Get ALL board data directly from users table
    const { data: userBoardsData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('🔴 Error fetching from users table:', error);
      return [];
    }

    console.log('🟢 Boards found in users table:', userBoardsData?.length);

    // Convert CollaborationUser to Board with actual board data
    const boards = await Promise.all(
      (userBoardsData || []).map(collab => mapCollaborationToBoardWithData(collab))
    );
    
    return boards;
  } catch (error) {
    console.error('🔴 Unexpected error:', error);
    return [];
  }
}

// Get ALL accessible boards (owned + collaborated) - MAIN FUNCTION FOR DASHBOARD
export async function getAllAccessibleBoards(userId: string): Promise<Board[]> {
  try {
    console.log('🟡 [GET ALL ACCESSIBLE BOARDS] Getting all boards for user ID:', userId);

    if (!userId) {
      console.error('🔴 No user ID provided');
      return [];
    }

    // Get owned boards (from board table)
    const ownedBoards = await getUserBoards(userId);
    
    // Get collaborated boards (from users table)
    const collaboratedBoards = await getUserAllBoardsFromUsersTable(userId);

    // Combine and remove duplicates based on board ID
    const allBoardsMap = new Map<string, Board>();
    
    [...ownedBoards, ...collaboratedBoards].forEach(board => {
      if (!allBoardsMap.has(board.id)) {
        allBoardsMap.set(board.id, board);
      }
    });

    const allBoards = Array.from(allBoardsMap.values());
    
    console.log('🟢 Total accessible boards:', allBoards.length);
    return allBoards;
  } catch (error) {
    console.error('🔴 Error getting all accessible boards:', error);
    return [];
  }
}

// NEW FUNCTION: Add collaborator from collaboration_boards to users table
export async function addCollaborationBoardToUsers(
  boardId: string,
  collaboratorEmail: string,
  boardName: string,
  ownerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🟡 [ADD COLLABORATION BOARD TO USERS] Adding to users table:', { boardId, collaboratorEmail });

    const { error } = await supabase
      .from('users')
      .insert({
        name: collaboratorEmail.split('@')[0],
        email: collaboratorEmail,
        role: 'editor',
        board_id: boardId,
      });

    if (error) {
      console.error('🔴 Error adding to users table:', error);
      return { success: false, error: error.message };
    }

    console.log('🟢 Successfully added to users table');
    return { success: true };
  } catch (error) {
    console.error('🔴 Error in addCollaborationBoardToUsers:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// NEW FUNCTION: Get collaboration board by ID
export async function getCollaborationBoardById(boardId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('collaboration_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      console.error('Error fetching collaboration board:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCollaborationBoardById:', error);
    return null;
  }
}

// Get boards directly from users table for logged-in user (Legacy function)
export async function getUserBoardsFromUserTable(userEmail: string) {
  try {
    // Step 1: Check if user exists in users table
    const { data: userExists, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', userEmail)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    console.log('User exists in users table:', !!userExists);

    // Step 2: Get all boards from users table for this email (whether user exists or not)
    const { data: userBoards, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail);

    if (error) throw error;

    // Transform the data to BoardMetadata format
    const boards = userBoards?.map(userBoard => ({
      id: userBoard.board_id,
      name: `Board - ${userBoard.board_id}`,
      owner: userBoard.name || 'User',
      ownerId: userBoard.email,
      lastOpened: userBoard.added_at,
      isStarred: false,
      templateType: 'collaboration',
      onlineUsers: 1,
      accessType: 'editor',
      collaboratorRole: userBoard.role
    })) || [];

    return boards;

  } catch (error) {
    console.error('Error fetching user boards from users table:', error);
    return [];
  }
}