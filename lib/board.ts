import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Board Types - MATCHING YOUR DATABASE SCHEMA
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
  | 'brainwriting';

// Mapping function - MATCHING YOUR EXACT DATABASE SCHEMA
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
    starred: dbBoard.starred || false,
    thumbnail: dbBoard.thumbnail
  };
}

// --- Supabase: Create board ---
export async function createBoard(
  board: Omit<Board, 'id' | 'created_at' | 'updated_at'>
): Promise<Board> {
  try {
    console.log('Creating board in database:', board);

    const { data, error } = await supabase
      .from('board')
      .insert([
        {
          name: board.name,
          type: board.type,
          owner_id: board.owner_id,
          owner: board.owner,
          online_users: board.online_users || 0,
          starred: board.starred || false,
          thumbnail: board.thumbnail
          // id, created_at, updated_at are handled by database defaults
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating board:', error);
      throw new Error(`Failed to create board: ${error.message}`);
    }

    console.log('Board created successfully:', data);
    return mapDbBoardToBoard(data);
  } catch (error) {
    console.error('Error in createBoard:', error);
    throw error;
  }
}

// --- Supabase: Get user boards ---
export async function getUserBoards(userId: string): Promise<Board[]> {
  try {
    console.log('Fetching boards for user:', userId);

    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching boards:', error);
      throw new Error(`Failed to fetch boards: ${error.message}`);
    }

    const boards = (data || []).map(mapDbBoardToBoard);
    console.log(`Found ${boards.length} boards for user ${userId}`);
    return boards;
  } catch (error) {
    console.error('Error in getUserBoards:', error);
    throw error;
  }
}

// --- Supabase: Get board by ID ---
export async function getBoardById(boardId: string): Promise<Board | null> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
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

// --- Supabase: Update board ---
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
    if (updates.starred !== undefined) updateData.starred = updates.starred;
    if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;

    // updated_at is automatically handled by the database trigger

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

// --- Supabase: Toggle star ---
export async function toggleStar(boardId: string, currentStarred: boolean): Promise<Board> {
  try {
    const { data, error } = await supabase
      .from('board')
      .update({ 
        starred: !currentStarred
        // updated_at is automatically handled by the database trigger
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

// --- Supabase: Delete board ---
export async function deleteBoard(boardId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board')
      .delete()
      .eq('id', boardId);

    if (error) {
      throw new Error(`Failed to delete board: ${error.message}`);
    }

    console.log(`Board ${boardId} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error in deleteBoard:', error);
    throw error;
  }
}

// --- Supabase: Get all boards (for admin purposes) ---
export async function getAllBoards(): Promise<Board[]> {
  try {
    const { data, error } = await supabase
      .from('board')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch all boards: ${error.message}`);
    }

    return (data || []).map(mapDbBoardToBoard);
  } catch (error) {
    console.error('Error in getAllBoards:', error);
    throw error;
  }
}

// Function to fetch online users for a board
export async function fetchOnlineUsers(boardId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_board', boardId)
      .eq('role', 'editor');

    if (error) {
      console.error('Error fetching online users:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in fetchOnlineUsers:', error);
    return 0;
  }
}

// Add user to board collaboration
export async function addUserToBoard(userEmail: string, boardId: string, userName: string = ''): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .insert([
        {
          email: userEmail,
          name: userName,
          role: 'editor',
          user_board: boardId,
          added_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error adding user to board:', error);
      return false;
    }

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
    online_users: 0, // Start with 0 online users
    starred: false,
    thumbnail: undefined
  };

  return await createBoard(boardData);
}

// Check if user has access to board
export async function checkBoardAccess(userId: string, boardId: string): Promise<boolean> {
  try {
    // Check if user is owner
    const { data: boardData, error: boardError } = await supabase
      .from('board')
      .select('owner_id')
      .eq('id', boardId)
      .single();

    if (!boardError && boardData && boardData.owner_id === userId) {
      return true;
    }

    // Check if user is collaborator in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('user_board', boardId)
      .eq('email', userId)
      .single();

    if (!userError && userData) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking board access:', error);
    return false;
  }
}