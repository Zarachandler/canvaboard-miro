// collaboration.ts - COMPLETED VERSION
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

class CollaborationService {
  private readonly INVITATIONS_KEY = 'collaborationInvitations';
  private readonly COLLABORATORS_KEY = 'boardCollaborators';
  private readonly NOTIFICATIONS_KEY = 'userNotifications';

  // Get all collaboration invitations
  getCollaborationInvitations(): CollaborationInvitation[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem(this.INVITATIONS_KEY) || '[]');
  }

  // Get invitations for a specific user
  getUserCollaborationInvitations(userEmail: string): CollaborationInvitation[] {
    const invitations = this.getCollaborationInvitations();
    return invitations.filter(
      invitation => 
        invitation.toUserEmail === userEmail && 
        invitation.status === 'pending' &&
        new Date(invitation.expiresAt) > new Date()
    );
  }

  // Create a new collaboration invitation
  createCollaborationInvitation(
    boardId: string,
    boardName: string,
    fromUser: string,
    fromUserEmail: string,
    toUserEmail: string,
    accessLevel: 'view' | 'edit' = 'edit',
    boardData?: any
  ): string {
    const invitation: CollaborationInvitation = {
      id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      boardId,
      boardName,
      fromUser,
      fromUserEmail,
      toUserEmail,
      status: 'pending',
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      boardData: boardData ? JSON.stringify(boardData) : undefined,
      accessLevel,
    };

    const invitations = this.getCollaborationInvitations();
    invitations.push(invitation);
    localStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(invitations));

    // Create notification for the invited user
    this.createNotification({
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
  acceptCollaborationInvitation(invitationId: string): boolean {
    const invitations = this.getCollaborationInvitations();
    const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
    
    if (invitationIndex === -1) return false;

    const invitation = invitations[invitationIndex];
    
    // Check if invitation is still valid
    if (invitation.status !== 'pending' || new Date(invitation.expiresAt) <= new Date()) {
      return false;
    }

    // Update invitation status
    invitations[invitationIndex].status = 'accepted';
    localStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(invitations));

    // Add user as collaborator
    this.addBoardCollaborator(
      invitation.boardId,
      invitation.toUserEmail,
      invitation.accessLevel
    );

    // Create notification for the inviter
    this.createNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'board_access_granted',
      title: 'Invitation Accepted',
      message: `${invitation.toUserEmail} has accepted your collaboration invitation for "${invitation.boardName}"`,
      read: false,
      createdAt: new Date().toISOString(),
      data: {
        targetEmail: invitation.fromUserEmail,
        boardId: invitation.boardId,
        boardName: invitation.boardName,
        fromUser: invitation.toUserEmail,
      },
    });

    return true;
  }

  // Decline a collaboration invitation
  declineCollaborationInvitation(invitationId: string): boolean {
    const invitations = this.getCollaborationInvitations();
    const invitationIndex = invitations.findIndex(inv => inv.id === invitationId);
    
    if (invitationIndex === -1) return false;

    invitations[invitationIndex].status = 'declined';
    localStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(invitations));

    return true;
  }

  // Add collaborator to board
  addBoardCollaborator(boardId: string, userEmail: string, accessLevel: 'view' | 'edit'): void {
    const collaborators = this.getBoardCollaborators();
    
    // Remove existing collaboration for this user on this board
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
    localStorage.setItem(this.COLLABORATORS_KEY, JSON.stringify(filteredCollaborators));
  }

  // Get collaborators for a specific board
  getBoardCollaborators(boardId?: string): BoardCollaborator[] {
    if (typeof window === 'undefined') return [];
    const collaborators = JSON.parse(localStorage.getItem(this.COLLABORATORS_KEY) || '[]');
    
    if (boardId) {
      return collaborators.filter((collab: BoardCollaborator) => collab.boardId === boardId);
    }
    
    return collaborators;
  }

  // Remove collaborator from board
  removeBoardCollaborator(boardId: string, userEmail: string): void {
    const collaborators = this.getBoardCollaborators();
    const filteredCollaborators = collaborators.filter(
      collab => !(collab.boardId === boardId && collab.userEmail === userEmail)
    );
    localStorage.setItem(this.COLLABORATORS_KEY, JSON.stringify(filteredCollaborators));
  }

  // Check if user has access to board
  hasBoardAccess(boardId: string, userEmail: string): boolean {
    const collaborators = this.getBoardCollaborators(boardId);
    return collaborators.some(collab => collab.userEmail === userEmail);
  }

  // Get user's access level for a board
  getUserAccessLevel(boardId: string, userEmail: string): 'view' | 'edit' | null {
    const collaborators = this.getBoardCollaborators(boardId);
    const collaboration = collaborators.find(collab => collab.userEmail === userEmail);
    return collaboration ? collaboration.accessLevel : null;
  }

  // Create notification
  createNotification(notification: Notification): void {
    const notifications = this.getNotifications();
    notifications.push(notification);
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  // Get notifications for a user
  getNotifications(userEmail?: string): Notification[] {
    if (typeof window === 'undefined') return [];
    const notifications = JSON.parse(localStorage.getItem(this.NOTIFICATIONS_KEY) || '[]');
    
    if (userEmail) {
      return notifications.filter((notif: Notification) => 
        notif.data.targetEmail === userEmail
      );
    }
    
    return notifications;
  }

  // Mark notification as read
  markNotificationAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notificationIndex = notifications.findIndex(notif => notif.id === notificationId);
    
    if (notificationIndex !== -1) {
      notifications[notificationIndex].read = true;
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
    }
  }

  // Clean up expired invitations
  cleanupExpiredInvitations(): void {
    const invitations = this.getCollaborationInvitations();
    const validInvitations = invitations.filter(
      inv => inv.status === 'pending' && new Date(inv.expiresAt) > new Date()
    );
    localStorage.setItem(this.INVITATIONS_KEY, JSON.stringify(validInvitations));
  }
}

export const collaborationService = new CollaborationService();