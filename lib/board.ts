import { supabase } from './supabaseClient';

export interface Board {
  id: string;
  name: string;
  type: BoardType;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  ownerId: string;
  onlineUsers: number;
  starred: boolean;
  thumbnail?: string;
}

export function mapDbBoardToBoard(dbBoard: any): Board {
  return {
    id: dbBoard.id,
    name: dbBoard.name,
    type: dbBoard.type,
    createdAt: new Date(dbBoard.created_at),
    updatedAt: new Date(dbBoard.updated_at),
    owner: dbBoard.owner,
    ownerId: dbBoard.owner_id,
    onlineUsers: dbBoard.online_users,
    starred: dbBoard.starred,
    thumbnail: dbBoard.thumbnail
  };
}
export interface BoardTemplate {
  id: string;
  name: string;
  type: BoardType;
}

export type BoardType = 'blank' | 'flowchart' | 'mindmap' | 'kanban' | 'retrospective' | 'brainwriting';

const BOARDS_STORAGE_KEY = 'miro_boards';

// --- Local storage helpers (optional, fallback) ---
export const boardStorage = {
  getBoards: (): Board[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (stored) {
        const boards = JSON.parse(stored);
        return boards.map((board: any) => ({
          ...board,
          createdAt: new Date(board.createdAt),
          updatedAt: new Date(board.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error reading boards from localStorage:', error);
    }
    return [];
  },

  saveBoards: (boards: Board[]): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
    } catch (error) {
      console.error('Error saving boards to localStorage:', error);
    }
  },

  createBoard: (
    name: string,
    type: BoardType,
    owner: string,
    ownerId: string
  ): Board => {
    const newBoard: Board = {
      id: crypto.randomUUID?.() || Date.now().toString(), // fallback if crypto not available
      name,
      type,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner,
      ownerId,
      onlineUsers: 1,
      starred: false
    };
    const boards = boardStorage.getBoards();
    boards.push(newBoard);
    boardStorage.saveBoards(boards);
    return newBoard;
  }
};

// --- Initialize sample boards for local storage ---
export const initializeSampleBoards = (userId: string, userName: string): void => {
  const existingBoards = boardStorage.getBoards();
  if (existingBoards.length === 0) {
    const sampleBoards: Board[] = [
      {
        id: 'sample-1',
        name: 'Untitled',
        type: 'blank',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        owner: userName,
        ownerId: userId,
        onlineUsers: 1,
        starred: false
      },
      {
        id: 'sample-2',
        name: 'Kanban Framework',
        type: 'kanban',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        owner: 'madhu',
        ownerId: 'madhu-id',
        onlineUsers: 2,
        starred: false
      }
    ];
    boardStorage.saveBoards(sampleBoards);
  }
};

// --- Supabase: Create board ---
export async function createBoard(board: Omit<Board, 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('boards')
    .insert([
      {
        ...board,
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating board:', error);
    return null;
  }

  return data;
}

// --- Supabase: Get user boards ---
export async function getUserBoards(userId: string) {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('owner_id', userId);

  if (error) {
    console.error('Error fetching boards:', error);
    return [];
  }

  return data;
}

// --- Supabase: Toggle star ---
export async function toggleStar(boardId: string, currentStarred: boolean) {
  const { data, error } = await supabase
    .from('boards')
    .update({ starred: !currentStarred, updated_at: new Date() })
    .eq('id', boardId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling star:', error);
    return null;
  }

  return data;
}

// --- Supabase: Delete board ---
export async function deleteBoard(boardId: string) {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId);

  if (error) {
    console.error('Error deleting board:', error);
    return false;
  }

  return true;
}

// --- Supabase: Add collaborator ---
export async function addCollaborator(boardId: string, userId: string, role: string = 'editor') {
  const { data, error } = await supabase
    .from('board_collaborators')
    .insert([
      {
        board_id: boardId,
        user_id: userId,
        role
      }
    ])
    .select();

  if (error) {
    console.error('Error adding collaborator:', error);
    return null;
  }

  return data;
}

// --- Supabase: Get collaborators ---
export async function getCollaborators(boardId: string) {
  const { data, error } = await supabase
    .from('board_collaborators')
    .select('*')
    .eq('board_id', boardId);

  if (error) {
    console.error('Error fetching collaborators:', error);
    return [];
  }

  return data;
}
export const boardTemplates: BoardTemplate[] = [
  {
    id: 'template-blank',
    name: 'Blank board',
    type: 'blank',
  },
  {
    id: 'template-kanban',
    name: 'Kanban',
    type: 'kanban',
  },
  {
    id: 'template-mindmap',
    name: 'Mindmap',
    type: 'mindmap',
  },
  {
    id: 'template-flowchart',
    name: 'Flowchart',
    type: 'flowchart',
  },
  {
    id: 'template-retrospective',
    name: 'Retrospective',
    type: 'retrospective',
  },
  {
    id: 'template-brainwriting',
    name: 'Brainwriting',
    type: 'brainwriting',
  }
];

export const mapDbBoardToClientBoard = mapDbBoardToBoard;