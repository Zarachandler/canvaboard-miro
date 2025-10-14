// services/supabaseCollaborationService.ts
import { supabase } from '../../lib/supabaseClient';

// Define the interfaces
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

export class SupabaseCollaborationService {
  
  // Convert between camelCase and snake_case formats
  private static toSupabaseInvitation(invitation: CollaborationInvitation): SupabaseCollaborationInvitation {
    return {
      id: invitation.id,
      board_id: invitation.boardId,
      board_name: invitation.boardName,
      from_user: invitation.fromUser,
      from_user_email: invitation.fromUserEmail,
      to_user_email: invitation.toUserEmail,
      status: invitation.status,
      sent_at: invitation.sentAt,
      expires_at: invitation.expiresAt,
      board_data: invitation.boardData,
      access_level: invitation.accessLevel
    };
  }

  private static fromSupabaseInvitation(invitation: SupabaseCollaborationInvitation): CollaborationInvitation {
    return {
      id: invitation.id,
      boardId: invitation.board_id,
      boardName: invitation.board_name,
      fromUser: invitation.from_user,
      fromUserEmail: invitation.from_user_email,
      toUserEmail: invitation.to_user_email,
      status: invitation.status,
      sentAt: invitation.sent_at,
      expiresAt: invitation.expires_at,
      boardData: invitation.board_data,
      accessLevel: invitation.access_level
    };
  }

  private static toSupabaseNotification(notification: Notification): SupabaseNotification {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      created_at: notification.createdAt,
      data: notification.data,
      target_email: notification.data.targetEmail
    };
  }

  private static fromSupabaseNotification(notification: SupabaseNotification): Notification {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: notification.created_at,
      data: notification.data
    };
  }

  private static toSupabaseCollaborator(collaborator: BoardCollaborator): SupabaseBoardCollaborator {
    return {
      board_id: collaborator.boardId,
      user_email: collaborator.userEmail,
      access_level: collaborator.accessLevel,
      added_at: collaborator.addedAt
    };
  }

  private static fromSupabaseCollaborator(collaborator: SupabaseBoardCollaborator): BoardCollaborator {
    return {
      boardId: collaborator.board_id,
      userEmail: collaborator.user_email,
      accessLevel: collaborator.access_level,
      addedAt: collaborator.added_at
    };
  }

  // Collaboration Invitations
  static async getCollaborationInvitations(): Promise<CollaborationInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('collaboration_invitations')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data?.map((inv: SupabaseCollaborationInvitation) => this.fromSupabaseInvitation(inv)) || [];
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
  }

  static async getUserCollaborationInvitations(userEmail: string): Promise<CollaborationInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('collaboration_invitations')
        .select('*')
        .eq('to_user_email', userEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data?.map((inv: SupabaseCollaborationInvitation) => this.fromSupabaseInvitation(inv)) || [];
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      return [];
    }
  }

  static async createCollaborationInvitation(invitation: CollaborationInvitation): Promise<string> {
    try {
      const invitationData = this.toSupabaseInvitation(invitation);

      const { data, error } = await supabase
        .from('collaboration_invitations')
        .insert([invitationData])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  static async acceptCollaborationInvitation(invitationId: string): Promise<boolean> {
    try {
      // Update invitation status
      const { error: updateError } = await supabase
        .from('collaboration_invitations')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Get the invitation to add collaborator
      const { data: invitation } = await supabase
        .from('collaboration_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (!invitation) return false;

      // Add collaborator
      await this.addBoardCollaborator({
        boardId: invitation.board_id,
        userEmail: invitation.to_user_email,
        accessLevel: invitation.access_level,
        addedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  }

  static async declineCollaborationInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('collaboration_invitations')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      return false;
    }
  }

  // Board Collaborators
  static async addBoardCollaborator(collaborator: BoardCollaborator): Promise<void> {
    try {
      const collaboratorData = this.toSupabaseCollaborator(collaborator);

      const { error } = await supabase
        .from('board_collaborators')
        .upsert([collaboratorData], {
          onConflict: 'board_id,user_email'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw error;
    }
  }

  static async getBoardCollaborators(boardId?: string): Promise<BoardCollaborator[]> {
    try {
      let query = supabase
        .from('board_collaborators')
        .select('*');

      if (boardId) {
        query = query.eq('board_id', boardId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.map((collab: SupabaseBoardCollaborator) => this.fromSupabaseCollaborator(collab)) || [];
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      return [];
    }
  }

  static async removeBoardCollaborator(boardId: string, userEmail: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('board_collaborators')
        .delete()
        .eq('board_id', boardId)
        .eq('user_email', userEmail);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  }

  static async hasBoardAccess(boardId: string, userEmail: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('board_collaborators')
        .select('id')
        .eq('board_id', boardId)
        .eq('user_email', userEmail)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return !!data;
    } catch (error) {
      console.error('Error checking board access:', error);
      return false;
    }
  }

  static async getUserAccessLevel(boardId: string, userEmail: string): Promise<'view' | 'edit' | null> {
    try {
      const { data, error } = await supabase
        .from('board_collaborators')
        .select('access_level')
        .eq('board_id', boardId)
        .eq('user_email', userEmail)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }

      return data.access_level;
    } catch (error) {
      console.error('Error getting access level:', error);
      return null;
    }
  }

  // Notifications
  static async createNotification(notification: Notification): Promise<void> {
    try {
      const notificationData = this.toSupabaseNotification(notification);

      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  static async getNotifications(userEmail?: string): Promise<Notification[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (userEmail) {
        query = query.eq('target_email', userEmail);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.map((notif: SupabaseNotification) => this.fromSupabaseNotification(notif)) || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async cleanupExpiredInvitations(): Promise<void> {
    try {
      const { error } = await supabase
        .from('collaboration_invitations')
        .update({ 
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'pending');

      if (error) throw error;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      throw error;
    }
  }

  // Get invitation by ID
  static async getInvitationById(invitationId: string): Promise<CollaborationInvitation | null> {
    try {
      const { data, error } = await supabase
        .from('collaboration_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error) throw error;
      return data ? this.fromSupabaseInvitation(data) : null;
    } catch (error) {
      console.error('Error fetching invitation by ID:', error);
      return null;
    }
  }

  // Check if invitation is valid and not expired
  static async isValidInvitation(invitationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('collaboration_invitations')
        .select('id, status, expires_at')
        .eq('id', invitationId)
        .single();

      if (error || !data) return false;

      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      return data.status === 'pending' && now < expiresAt;
    } catch (error) {
      return false;
    }
  }

  // Get user's collaborated boards
  static async getUserCollaboratedBoards(userEmail: string): Promise<BoardCollaborator[]> {
    try {
      const { data, error } = await supabase
        .from('board_collaborators')
        .select('*')
        .eq('user_email', userEmail)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data?.map((collab: SupabaseBoardCollaborator) => this.fromSupabaseCollaborator(collab)) || [];
    } catch (error) {
      console.error('Error fetching user collaborated boards:', error);
      return [];
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllNotificationsAsRead(userEmail: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('target_email', userEmail)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}