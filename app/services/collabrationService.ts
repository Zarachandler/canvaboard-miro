// services/collaborationService.ts
import { SupabaseCollaborationService } from './supabaseCollabrationService';
import type {
  CollaborationInvitation,
  Notification,
  BoardCollaborator
} from './supabaseCollabrationService';

class CollaborationService {
  private useSupabase = true;

  // Get all collaboration invitations
  async getCollaborationInvitations(): Promise<CollaborationInvitation[]> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getCollaborationInvitations();
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('collaborationInvitations') || '[]');
  }

  // Get invitations for a specific user
  async getUserCollaborationInvitations(userEmail: string): Promise<CollaborationInvitation[]> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getUserCollaborationInvitations(userEmail);
    }
    
    // Fallback to localStorage
    const invitations = await this.getCollaborationInvitations();
    return invitations.filter(
      invitation => 
        invitation.toUserEmail === userEmail && 
        invitation.status === 'pending' &&
        new Date(invitation.expiresAt) > new Date()
    );
  }

  // Create a new collaboration invitation
  async createCollaborationInvitation(
    boardId: string,
    boardName: string,
    fromUser: string,
    fromUserEmail: string,
    toUserEmail: string,
    accessLevel: 'view' | 'edit' = 'edit',
    boardData?: any
  ): Promise<string> {
    const invitation: CollaborationInvitation = {
      id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      boardId,
      boardName,
      fromUser,
      fromUserEmail,
      toUserEmail,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      boardData: boardData ? JSON.stringify(boardData) : undefined,
      accessLevel,
    };

    if (this.useSupabase) {
      return await SupabaseCollaborationService.createCollaborationInvitation(invitation);
    }

    // Fallback to localStorage
    const invitations = await this.getCollaborationInvitations();
    invitations.push(invitation);
    localStorage.setItem('collaborationInvitations', JSON.stringify(invitations));

    // Create notification
    await this.createNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'collaboration_invitation',
      title: 'Collaboration Invitation',
      message: `${fromUser} has invited you to collaborate on "${boardName}"`,
      read: false,
      createdAt: new Date().toISOString(),
      data: {
        invitationId: invitation.id,
        targetEmail: toUserEmail,
        boardId,
        boardName,
        fromUser,
        fromUserEmail,
      },
    });

    return invitation.id;
  }

  // Accept a collaboration invitation
  async acceptCollaborationInvitation(invitationId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.acceptCollaborationInvitation(invitationId);
    }

    // Fallback to localStorage implementation
    const invitations = await this.getCollaborationInvitations();
    const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
    
    if (invitationIndex === -1) return false;

    const invitation = invitations[invitationIndex];
    
    if (invitation.status !== 'pending' || new Date(invitation.expiresAt) <= new Date()) {
      return false;
    }

    invitations[invitationIndex].status = 'accepted';
    localStorage.setItem('collaborationInvitations', JSON.stringify(invitations));

    await this.addBoardCollaborator(
      invitation.boardId,
      invitation.toUserEmail,
      invitation.accessLevel
    );

    return true;
  }

  // Decline a collaboration invitation
  async declineCollaborationInvitation(invitationId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.declineCollaborationInvitation(invitationId);
    }

    // Fallback to localStorage
    const invitations = await this.getCollaborationInvitations();
    const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
    
    if (invitationIndex === -1) return false;

    invitations[invitationIndex].status = 'declined';
    localStorage.setItem('collaborationInvitations', JSON.stringify(invitations));
    return true;
  }

  // Add collaborator to board
  async addBoardCollaborator(boardId: string, userEmail: string, accessLevel: 'view' | 'edit'): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.addBoardCollaborator({
        boardId,
        userEmail,
        accessLevel,
        addedAt: new Date().toISOString()
      });
      return;
    }

    // Fallback to localStorage
    const collaborators = await this.getBoardCollaborators();
    const filteredCollaborators = collaborators.filter(
      collab => !(collab.boardId === boardId && collab.userEmail === userEmail)
    );

    const newCollaborator: BoardCollaborator = {
      boardId,
      userEmail,
      accessLevel,
      addedAt: new Date().toISOString(),
    };

    filteredCollaborators.push(newCollaborator);
    localStorage.setItem('boardCollaborators', JSON.stringify(filteredCollaborators));
  }

  // Get collaborators for a specific board
  async getBoardCollaborators(boardId?: string): Promise<BoardCollaborator[]> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getBoardCollaborators(boardId);
    }

    if (typeof window === 'undefined') return [];
    const collaborators = JSON.parse(localStorage.getItem('boardCollaborators') || '[]');
    
    if (boardId) {
      return collaborators.filter((collab: BoardCollaborator) => collab.boardId === boardId);
    }
    
    return collaborators;
  }

  // Remove collaborator from board
  async removeBoardCollaborator(boardId: string, userEmail: string): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.removeBoardCollaborator(boardId, userEmail);
      return;
    }

    const collaborators = await this.getBoardCollaborators();
    const filteredCollaborators = collaborators.filter(
      collab => !(collab.boardId === boardId && collab.userEmail === userEmail)
    );
    localStorage.setItem('boardCollaborators', JSON.stringify(filteredCollaborators));
  }

  // Check if user has access to board
  async hasBoardAccess(boardId: string, userEmail: string): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.hasBoardAccess(boardId, userEmail);
    }

    const collaborators = await this.getBoardCollaborators(boardId);
    return collaborators.some(collab => collab.userEmail === userEmail);
  }

  // Get user's access level for a board
  async getUserAccessLevel(boardId: string, userEmail: string): Promise<'view' | 'edit' | null> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getUserAccessLevel(boardId, userEmail);
    }

    const collaborators = await this.getBoardCollaborators(boardId);
    const collaboration = collaborators.find(collab => collab.userEmail === userEmail);
    return collaboration ? collaboration.accessLevel : null;
  }

  // Create notification
  async createNotification(notification: Notification): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.createNotification(notification);
      return;
    }

    const notifications = await this.getNotifications();
    notifications.push(notification);
    localStorage.setItem('userNotifications', JSON.stringify(notifications));
  }

  // Get notifications for a user
  async getNotifications(userEmail?: string): Promise<Notification[]> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getNotifications(userEmail);
    }

    if (typeof window === 'undefined') return [];
    const notifications = JSON.parse(localStorage.getItem('userNotifications') || '[]');
    
    if (userEmail) {
      return notifications.filter((notif: Notification) => 
        notif.data.targetEmail === userEmail
      );
    }
    
    return notifications;
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.markNotificationAsRead(notificationId);
      return;
    }

    const notifications = await this.getNotifications();
    const notificationIndex = notifications.findIndex(notif => notif.id === notificationId);
    
    if (notificationIndex !== -1) {
      notifications[notificationIndex].read = true;
      localStorage.setItem('userNotifications', JSON.stringify(notifications));
    }
  }

  // Clean up expired invitations
  async cleanupExpiredInvitations(): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.cleanupExpiredInvitations();
      return;
    }

    const invitations = await this.getCollaborationInvitations();
    const validInvitations = invitations.filter(
      inv => inv.status === 'pending' && new Date(inv.expiresAt) > new Date()
    );
    localStorage.setItem('collaborationInvitations', JSON.stringify(validInvitations));
  }

  // Additional methods that use Supabase
  async getInvitationById(invitationId: string): Promise<CollaborationInvitation | null> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getInvitationById(invitationId);
    }
    
    const invitations = await this.getCollaborationInvitations();
    return invitations.find(inv => inv.id === invitationId) || null;
  }

  async isValidInvitation(invitationId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.isValidInvitation(invitationId);
    }
    
    const invitation = await this.getInvitationById(invitationId);
    if (!invitation) return false;
    
    return invitation.status === 'pending' && new Date(invitation.expiresAt) > new Date();
  }

  async getUserCollaboratedBoards(userEmail: string): Promise<BoardCollaborator[]> {
    if (this.useSupabase) {
      return await SupabaseCollaborationService.getUserCollaboratedBoards(userEmail);
    }
    
    const collaborators = await this.getBoardCollaborators();
    return collaborators.filter(collab => collab.userEmail === userEmail);
  }

  async deleteNotification(notificationId: string): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.deleteNotification(notificationId);
      return;
    }

    const notifications = await this.getNotifications();
    const filteredNotifications = notifications.filter(notif => notif.id !== notificationId);
    localStorage.setItem('userNotifications', JSON.stringify(filteredNotifications));
  }

  async markAllNotificationsAsRead(userEmail: string): Promise<void> {
    if (this.useSupabase) {
      await SupabaseCollaborationService.markAllNotificationsAsRead(userEmail);
      return;
    }

    const notifications = await this.getNotifications(userEmail);
    const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
    localStorage.setItem('userNotifications', JSON.stringify(updatedNotifications));
  }
}

export const collaborationService = new CollaborationService();