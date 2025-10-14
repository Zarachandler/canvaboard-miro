// types/collaboration.ts
export interface CollaborationInvitation {
  id: string;
  boardId: string;
  boardName: string;
  fromUser: string;
  fromUserEmail: string;
  toUserEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  sentAt: string;
  expiresAt: string;
  boardData?: string;
  accessLevel: 'view' | 'edit';
}

export interface Notification {
  id: string;
  type: 'collaboration_invitation' | 'board_access_granted' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data: {
    invitationId?: string;
    targetEmail?: string;
    boardId?: string;
    boardName?: string;
    fromUser?: string;
    fromUserEmail?: string;
  };
}

export interface BoardCollaborator {
  boardId: string;
  userEmail: string;
  accessLevel: 'view' | 'edit';
  addedAt: string;
}

// Supabase table interfaces
export interface SupabaseCollaborationInvitation {
  id: string;
  board_id: string;
  board_name: string;
  from_user: string;
  from_user_email: string;
  to_user_email: string;
  status: 'pending' | 'accepted' | 'declined';
  sent_at: string;
  expires_at: string;
  board_data?: string;
  access_level: 'view' | 'edit';
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseNotification {
  id: string;
  type: 'collaboration_invitation' | 'board_access_granted' | 'general';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data: any;
  target_email?: string;
}

export interface SupabaseBoardCollaborator {
  id?: string;
  board_id: string;
  user_email: string;
  access_level: 'view' | 'edit';
  added_at: string;
  created_at?: string;
}
