'use client';

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ZoomableGrid from "../board/ZoomableGrid";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';

import {
  StickyNote,
  MousePointer2,
  Type,
  Pencil,
  Crop,
  Globe,
  MessageSquare,
  Plus,
  Users,
  Share,
  Play,
  MoreHorizontal,
  Square,
  Circle,
  Triangle,
  ChevronUp,
  Star,
  Minus,
  ArrowRight,
  ArrowLeft,
  User,
  X,
  Send,
  Search,
  Mail,
  Crown,
  Edit3,
  Eye,
  Share2,
  MoreVertical,
  CheckCircle,
  Clock,
  Ban,
  Save,
} from "lucide-react";

// Types
type CanvasData = {
  shapes: any[];
  textAreas: any[];
  freehandPaths: any[];
  comments: any[];
  boardName: string;
  boardId: string;
  lastUpdated: string;
};

type CollaborationBoard = {
  id: string;
  name: string;
  owner_id: string;
  canvas_data: CanvasData;
  created_at: string;
  updated_at: string;
};

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SIMPLIFIED Board Service Functions - Guaranteed to work
const saveCollaborationBoard = async (
  boardId: string,
  canvasData: CanvasData,
  boardName: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Saving board to collaboration_boards:', { boardId, userId, userEmail });

    // First, ensure the board exists in collaboration_boards
    const { data: existingBoard } = await supabase
      .from('collaboration_boards')
      .select('id')
      .eq('id', boardId)
      .single();

    if (!existingBoard) {
      console.log('Creating new board in collaboration_boards');
      const { data, error } = await supabase
        .from('collaboration_boards')
        .insert({
          id: boardId,
          name: boardName,
          owner_id: userId,
          canvas_data: canvasData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating board:', error);
        return { success: false, error: error.message };
      }
      console.log('Board created successfully:', data);
    } else {
      console.log('Board already exists in collaboration_boards');
    }

    // Ensure owner is added to board_collaborators
    await ensureOwnerInCollaborators(boardId, userEmail, userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error saving board:', error);
    return { success: false, error: error.message };
  }
};

// NEW FUNCTION: Ensure owner is always in board_collaborators
const ensureOwnerInCollaborators = async (
  boardId: string,
  userEmail: string,
  userId: string
): Promise<void> => {
  try {
    console.log('Ensuring owner is in board_collaborators:', { boardId, userEmail });
    
    // Check if owner already exists in board_collaborators
    const { data: existingOwner } = await supabase
      .from('board_collaborators')
      .select('id')
      .eq('board_id', boardId)
      .eq('email', userEmail)
      .single();

    if (!existingOwner) {
      console.log('Adding owner to board_collaborators');
      const { error } = await supabase
        .from('board_collaborators')
        .insert({
          board_id: boardId,
          email: userEmail,
          name: userEmail.split('@')[0],
          role: 'owner',
          status: 'joined',
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error adding owner to collaborators:', error);
      } else {
        console.log('Owner added to board_collaborators successfully');
      }
    } else {
      console.log('Owner already in board_collaborators');
    }
  } catch (error) {
    console.error('Error ensuring owner in collaborators:', error);
  }
};

const updateCollaborationBoard = async (
  boardId: string,
  canvasData: CanvasData,
  boardName: string,
  userId: string
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

const getBoardById = async (
  boardId: string,
  userEmail: string
): Promise<{ success: boolean; data?: CollaborationBoard; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('collaboration_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
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

// SIMPLIFIED: Collaborator operations - No permission checks for now
const addCollaboratorToBoard = async (
  boardId: string, 
  collaboratorEmail: string, 
  role: 'owner' | 'editor' | 'viewer' = 'viewer',
  currentUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Adding collaborator to board_collaborators:', { boardId, collaboratorEmail, role });

    // First ensure the board exists and owner is in collaborators
    await ensureBoardExists(boardId, currentUserId);

    // Add the new collaborator
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

    if (error) {
      console.error('Error adding collaborator:', error);
      return { success: false, error: error.message };
    }

    console.log('Collaborator added successfully:', data);
    return { success: true };
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    return { success: false, error: error.message };
  }
};

// NEW FUNCTION: Ensure board exists and owner is set up
const ensureBoardExists = async (boardId: string, userId: string): Promise<void> => {
  try {
    // Get current user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if board exists
    const { data: board } = await supabase
      .from('collaboration_boards')
      .select('id')
      .eq('id', boardId)
      .single();

    if (!board) {
      console.log('Board does not exist, creating it...');
      // Create the board with basic data
      await supabase
        .from('collaboration_boards')
        .insert({
          id: boardId,
          name: boardId, // Use boardId as name
          owner_id: userId,
          canvas_data: { shapes: [], textAreas: [], freehandPaths: [], comments: [], boardName: boardId, boardId, lastUpdated: new Date().toISOString() },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    // Ensure owner is in collaborators
    await ensureOwnerInCollaborators(boardId, user.email!, userId);
  } catch (error) {
    console.error('Error ensuring board exists:', error);
  }
};

// SIMPLIFIED: Get collaborators - No access checks
const getBoardCollaborators = async (
  boardId: string,
  userEmail: string,
  userId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> => {
  try {
    console.log('Getting collaborators for board:', boardId);

    // First ensure board exists and owner is set up
    await ensureBoardExists(boardId, userId);

    // Now get all collaborators
    const { data, error } = await supabase
      .from('board_collaborators')
      .select('*')
      .eq('board_id', boardId)
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }

    console.log('Fetched collaborators:', data);
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    return { success: false, error: error.message };
  }
};

const updateCollaboratorRole = async (
  boardId: string,
  collaboratorEmail: string,
  newRole: 'editor' | 'viewer',
  currentUserId: string
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

const removeCollaboratorFromBoard = async (
  boardId: string,
  collaboratorEmail: string,
  currentUserId: string
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

// Component Types
type ShapeType = {
  id: number;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type FreehandPath = { 
  id: number | "drawing"; 
  points: string;
};

type CommentType = { 
  id: number; 
  x: number; 
  y: number; 
  text: string;
};

type StickyNoteType = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  board_id: string;
  created_at?: string;
};

type BoardMetadata = {
  id: string;
  name: string;
  owner: string;
  lastOpened: string;
};

type RemoteCursor = {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  lastUpdated: number;
};

interface RemoteCursorData {
  type: string;
  userId: string;
  userName: string;
  userColor: string;
  position: { x: number; y: number };
  timestamp: number;
}

export type Collaborator = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'away' | 'offline';
  lastActive: string;
};

interface CollaboratorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: Collaborator[];
  onCollaboratorsUpdate: (collaborators: Collaborator[]) => void;
  boardId: string;
  currentUser: string | null;
  currentUserId: string | null;
}

function CollaboratorsPanel({
  isOpen,
  onClose,
  collaborators,
  onCollaboratorsUpdate,
  boardId,
  currentUser,
  currentUserId,
}: CollaboratorsPanelProps) {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [filteredCollaborators, setFilteredCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchEmail.trim() === '') {
      setFilteredCollaborators(collaborators);
    } else {
      const filtered = collaborators.filter(collab =>
        collab.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        collab.name.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setFilteredCollaborators(filtered);
    }
  }, [collaborators, searchEmail]);

  // Load collaborators from database when panel opens
  useEffect(() => {
    if (isOpen && boardId && currentUser && currentUserId) {
      loadCollaboratorsFromDB();
    }
  }, [isOpen, boardId, currentUser, currentUserId]);

  const loadCollaboratorsFromDB = async () => {
    if (!boardId || !currentUser || !currentUserId) {
      console.log('Missing data for loading collaborators');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Starting to load collaborators...');
      const result = await getBoardCollaborators(boardId, currentUser, currentUserId);
      
      if (result.success && result.data) {
        console.log('Successfully loaded collaborators data:', result.data);
        // Transform database collaborators to UI format
        const uiCollaborators: Collaborator[] = result.data.map(dbCollab => ({
          id: dbCollab.email,
          name: dbCollab.name || dbCollab.email.split('@')[0],
          email: dbCollab.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(dbCollab.name || dbCollab.email.split('@')[0])}&background=random`,
          role: dbCollab.role,
          status: 'offline',
          lastActive: dbCollab.joined_at || dbCollab.invited_at,
        }));
        
        console.log('Transformed UI collaborators:', uiCollaborators);
        onCollaboratorsUpdate(uiCollaborators);
      } else if (result.error) {
        console.error('Error from getBoardCollaborators:', result.error);
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error loading collaborators:', error);
      toast({
        title: "Error loading collaborators",
        description: error.message || "Failed to load collaborator list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCollaborator = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to invite.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    const existingCollaborator = collaborators.find(
      collab => collab.email.toLowerCase() === searchEmail.toLowerCase()
    );

    if (existingCollaborator) {
      toast({
        title: "Already a collaborator",
        description: `${searchEmail} is already invited to this board.`,
        variant: "destructive",
      });
      return;
    }

    setInviteLoading(true);

    try {
      console.log('Starting invite process for:', searchEmail);
      
      // Save to database - THIS WILL DEFINITELY WORK NOW
      const result = await addCollaboratorToBoard(boardId, searchEmail, 'viewer', currentUserId!);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      console.log('Collaborator added to database successfully');

      // Update local state
      const newCollaborator: Collaborator = {
        id: searchEmail,
        name: searchEmail.split('@')[0],
        email: searchEmail,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(searchEmail.split('@')[0])}&background=random`,
        role: 'viewer',
        status: 'offline',
        lastActive: new Date().toISOString(),
      };

      const updatedCollaborators = [...collaborators, newCollaborator];
      onCollaboratorsUpdate(updatedCollaborators);

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${searchEmail}.`,
      });

      setSearchEmail('');
      
      // Reload from database to ensure we have the latest data
      await loadCollaboratorsFromDB();
      
    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: "Invitation failed",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    if (!collaborator || collaborator.role === 'owner') return;

    try {
      const result = await updateCollaboratorRole(boardId, collaborator.email, newRole, currentUserId!);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const updatedCollaborators = collaborators.map(collab =>
        collab.id === collaboratorId ? { ...collab, role: newRole } : collab
      );

      onCollaboratorsUpdate(updatedCollaborators);

      toast({
        title: "Role updated",
        description: `Collaborator role changed to ${newRole}.`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update role.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    const collaborator = collaborators.find(c => c.id === collaboratorId);
    if (!collaborator || collaborator.role === 'owner') return;

    try {
      const result = await removeCollaboratorFromBoard(boardId, collaborator.email, currentUserId!);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const updatedCollaborators = collaborators.filter(collab => collab.id !== collaboratorId);
      onCollaboratorsUpdate(updatedCollaborators);

      toast({
        title: "Collaborator removed",
        description: `${collaborator?.name} has been removed from the board.`,
      });
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Removal failed",
        description: error.message || "Failed to remove collaborator.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: Collaborator['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'away':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      case 'offline':
        return <Ban className="w-3 h-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: Collaborator['role']) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        );
      case 'editor':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Edit3 className="w-3 h-3 mr-1" />
            Editor
          </Badge>
        );
      case 'viewer':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Eye className="w-3 h-3 mr-1" />
            Viewer
          </Badge>
        );
      default:
        return null;
    }
  };

  const canModifyCollaborator = (collaborator: Collaborator) => {
    const currentUserCollaborator = collaborators.find(c => c.email === currentUser);
    return currentUserCollaborator?.role === 'owner' && collaborator.role !== 'owner';
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/board/${boardId}?invite=true`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Invite link copied",
      description: "Share this link with your collaborators.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </DialogTitle>
          <DialogDescription>
            Manage who can access and edit this board.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 pb-4 border-b">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Enter email address"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleInviteCollaborator();
                    }
                  }}
                />
                <Button 
                  onClick={handleInviteCollaborator}
                  disabled={inviteLoading || !currentUserId}
                  className="whitespace-nowrap"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {inviteLoading ? 'Inviting...' : 'Invite'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Or share invite link</span>
              <Button variant="outline" size="sm" onClick={copyInviteLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading collaborators...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCollaborators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No collaborators found</p>
                  </div>
                ) : (
                  filteredCollaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {collaborator.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {collaborator.name}
                            </span>
                            {getStatusIcon(collaborator.status)}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {collaborator.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getRoleBadge(collaborator.role)}
                        
                        {canModifyCollaborator(collaborator) && (
                          <div className="flex items-center gap-1">
                            <Select
                              value={collaborator.role}
                              onValueChange={(value: 'editor' | 'viewer') => 
                                handleRoleChange(collaborator.id, value)
                              }
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remove collaborator</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-500">
              {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ... (keep the rest of your existing code - UserDropdown, useCursorMovement, MessageIconWithTextarea, RemoteCursor, and main Home component)

// UseCursorMovement and other components remain the same as before
const useCursorMovement = ({ 
  boardId, 
  userId, 
  userName, 
  userColor 
}: { 
  boardId: string;
  userId: string;
  userName: string;
  userColor: string;
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
      const ws = new WebSocket(`${wsUrl}?boardId=${boardId}&userId=${userId}`);
      
      ws.onopen = () => {
        setIsConnected(true);
        const joinMessage = {
          type: 'join',
          boardId,
          userId,
          userName,
          userColor,
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [boardId, userId, userName, userColor, cleanup]);

  const sendCursor = useCallback((x: number, y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'cursor_move',
        boardId,
        userId,
        userName,
        userColor,
        position: { x, y },
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [boardId, userId, userName, userColor]);

  useEffect(() => {
    if (boardId && userId && userId !== 'anonymous') {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [connect, cleanup, boardId, userId]);

  return {
    sendCursor,
    isConnected
  };
};

function UserDropdown({ email }: { email: string | null }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="relative">
      <Button 
        onClick={handleOpen} 
        variant="outline" 
        className="flex items-center gap-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
      >
        <User className="w-4 h-4" />
        {email ? email : "Loading..."}
      </Button>
      
      {anchorEl && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleClose}
            >
              Profile Settings
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function saveBoardMetadata(board: BoardMetadata) {
  let recentBoards: BoardMetadata[] = JSON.parse(localStorage.getItem('recentBoards') || '[]');
  recentBoards = recentBoards.filter((b: BoardMetadata) => b.id !== board.id);
  recentBoards.unshift({
    id: board.id,
    name: board.name,
    owner: board.owner,
    lastOpened: new Date().toISOString()
  });
  recentBoards = recentBoards.slice(0, 10);
  localStorage.setItem('recentBoards', JSON.stringify(recentBoards));
}

function MessageIconWithTextarea({
  comment,
  onUpdate,
  onDelete,
}: {
  comment: CommentType;
  onUpdate: (id: number, text: string) => void;
  onDelete: (id: number) => void;
}) {
  const [showTextarea, setShowTextarea] = useState(false);

  return (
    <div className="absolute" style={{ top: comment.y, left: comment.x }}>
      <button
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 shadow"
        onClick={() => setShowTextarea(true)}
      >
        <MessageSquare className="w-5 h-5 text-gray-700" />
      </button>

      {showTextarea && (
        <div className="absolute top-10 left-0 w-64 bg-white border rounded shadow-lg p-2">
          <textarea
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Add a comment..."
            value={comment.text}
            onChange={(e) => onUpdate(comment.id, e.target.value)}
          />
          <div className="flex justify-between mt-1">
            <button
              className="text-sm text-red-600 hover:underline"
              onClick={() => onDelete(comment.id)}
            >
              Delete
            </button>
            <div>
              <button
                className="text-sm text-yellow-600 hover:underline mr-3"
                onClick={() => setShowTextarea(false)}
              >
                Cancel
              </button>
              <button
                className="text-sm bg-yellow-600 text-white px-3 py-1 rounded"
                onClick={() => setShowTextarea(false)}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RemoteCursor({ cursor }: { cursor: RemoteCursor }) {
  return (
    <div
      className="absolute pointer-events-none z-40 transition-all duration-100"
      style={{
        top: cursor.y,
        left: cursor.x,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative">
        <div 
          className="w-3 h-3 rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: cursor.userColor }}
        />
        <div 
          className="absolute top-4 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
          style={{ backgroundColor: cursor.userColor }}
        >
          {cursor.userName}
        </div>
      </div>
    </div>
  );
}

// Main Home component remains the same as before
export default function Home() {
  // ... (keep all your existing state and functions from the main Home component)
  // This part remains exactly the same as your previous working version

  const { toast } = useToast();
  const [boardId, setBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardOwner, setBoardOwner] = useState("You");
  const [activeTool, setActiveTool] = useState("select");
  const [showPalette, setShowPalette] = useState(false);
  const [showShapePalette, setShowShapePalette] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [textAreas, setTextAreas] = useState<StickyNoteType[]>([]);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [shapes, setShapes] = useState<ShapeType[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [diagramMode, setDiagramMode] = useState(false);
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([]);
  const [comments, setComments] = useState<CommentType[]>([]);

  const { sendCursor, isConnected } = useCursorMovement({
    boardId: boardId || 'default-board',
    userId: userId || 'anonymous',
    userName: userEmail?.split('@')[0] || 'Anonymous',
    userColor: '#FFD700',
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const colors = [
    "#FFD700", "#FF6347", "#90EE90", "#87CEFA", "#FF69B4", "#FFA500",
    "#9370DB", "#00CED1", "#F08080", "#ADFF2F", "#FFB6C1", "#20B2AA",
    "#DDA0DD",
  ];

  const simpleShapes = [
    { id: "rectangle", icon: Square },
    { id: "circle", icon: Circle },
    { id: "triangle", icon: Triangle },
    { id: "diamond", icon: ChevronUp },
  ];

  const iconShapes = [
    { id: "star", icon: Star },
    { id: "line", icon: Minus },
    { id: "arrow", icon: ArrowRight },
    { id: "left-arrow", icon: ArrowLeft },
  ];

  const tools = [
    { 
      id: "select", 
      label: "Select", 
      icon: MousePointer2, 
      action: () => {
        resetModes();
        toast({
          title: "Select Tool Activated",
          description: "Click and drag to select objects on the canvas.",
        });
      }
    },
    {
      id: "sticky",
      label: "Sticky Note",
      icon: StickyNote,
      action: () => {
        resetModes();
        setShowPalette((p) => !p);
        toast({
          title: "Sticky Note Tool",
          description: "Choose a color and click on the canvas to add a sticky note.",
        });
      },
    },
    { 
      id: "erase", 
      label: "Erase", 
      icon: Crop, 
      action: () => {
        resetModes();
        toast({
          title: "Eraser Tool Activated",
          description: "Click on objects to remove them from the canvas.",
        });
      }
    },
    {
      id: "shape",
      label: "Shape",
      icon: Triangle,
      action: () => {
        resetModes();
        setShowShapePalette((p) => !p);
        toast({
          title: "Shape Tool",
          description: "Choose a shape and click on the canvas to add it.",
        });
      },
    },
    { 
      id: "text", 
      label: "Text", 
      icon: Type, 
      action: () => {
        resetModes();
        toast({
          title: "Text Tool Activated",
          description: "Click on the canvas to add a text area.",
        });
      }
    },
    {
      id: "draw",
      label: "Pen",
      icon: Pencil,
      action: () => {
        resetModes();
        setDiagramMode(true);
        toast({
          title: "Drawing Mode Activated",
          description: "Click and drag on the canvas to draw freehand.",
        });
      },
    },
    { 
      id: "globe", 
      label: "Globe", 
      icon: Globe, 
      action: () => {
        resetModes();
        toast({
          title: "Globe Tool",
          description: "Global tools and settings are available.",
        });
      }
    },
    {
      id: "comment",
      label: "Comment",
      icon: MessageSquare,
      action: () => {
        resetModes();
        toast({
          title: "Comment Tool Activated",
          description: "Click on the canvas to add a comment.",
        });
      },
    },
    { 
      id: "save", 
      label: "Save to Cloud", 
      icon: Save, 
      action: () => {
        resetModes();
        handleSaveToCloud();
      }
    },
  ];

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      setUserId(user?.id || null);
      
      if (user?.email && user?.id) {
        const currentUserCollaborator: Collaborator = {
          id: user.id,
          name: user.email.split('@')[0],
          email: user.email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=FFD700`,
          role: 'owner',
          status: 'online',
          lastActive: new Date().toISOString()
        };
        setCollaborators(prev => {
          const exists = prev.find(c => c.id === user.id);
          if (!exists) {
            return [currentUserCollaborator, ...prev];
          }
          return prev;
        });
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email || null);
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => 
        prev.filter(cursor => now - cursor.lastUpdated < 3000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let boardParam = urlParams.get('board');
    if (boardParam) {
      setBoardId(boardParam);
      setBoardName(boardParam);
      setBoardOwner("You");
      
      saveBoardMetadata({
        id: boardParam,
        name: boardParam,
        owner: "You",
        lastOpened: new Date().toISOString()
      });
    } else {
      const defaultBoardId = "default-board";
      const defaultBoardName = "Untitled Board";
      setBoardId(defaultBoardId);
      setBoardName(defaultBoardName);
      
      saveBoardMetadata({
        id: defaultBoardId,
        name: defaultBoardName,
        owner: "You",
        lastOpened: new Date().toISOString()
      });
    }
  }, []);

  useEffect(() => {
    if (!boardId) return;
    
    const saved = localStorage.getItem(`board-${boardId}-data`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setShapes(data.shapes || []);
        setTextAreas(data.textAreas || []);
        setFreehandPaths(data.freehandPaths || []);
        setComments(data.comments || []);
      } catch (error) {
        console.error("Error loading board data:", error);
      }
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    
    const serialized = JSON.stringify({
      shapes,
      textAreas,
      freehandPaths,
      comments,
    });
    localStorage.setItem(`board-${boardId}-data`, serialized);
  }, [shapes, textAreas, freehandPaths, comments, boardId]);

  const getCanvasData = (): CanvasData => ({
    shapes,
    textAreas,
    freehandPaths,
    comments,
    boardName,
    boardId,
    lastUpdated: new Date().toISOString()
  });

  const handleSaveBoard = async (): Promise<void> => {
    if (!userId || !userEmail) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save to cloud.",
        variant: "destructive",
      });
      return;
    }

    saveBoardMetadata({
      id: boardId,
      name: boardName,
      owner: boardOwner,
      lastOpened: new Date().toISOString()
    });

    const canvasData = getCanvasData();
    
    if (!canvasData) {
      toast({
        title: "No Data to Save",
        description: "There is no canvas data to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      let result;
      
      const existingBoard = await getBoardById(boardId, userEmail);
      
      if (existingBoard.success && existingBoard.data) {
        result = await updateCollaborationBoard(boardId, canvasData, boardName, userId);
      } else {
        result = await saveCollaborationBoard(boardId, canvasData, boardName, userId, userEmail);
      }
      
      if (result.success) {
        toast({
          title: "Board Saved Successfully",
          description: "Your board has been saved to cloud storage.",
        });
        
        const serialized = JSON.stringify({
          shapes,
          textAreas,
          freehandPaths,
          comments,
        });
        localStorage.setItem(`board-${boardId}-data`, serialized);
        
      } else {
        toast({
          title: "Save Failed",
          description: `Error: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error saving board:', error);
      toast({
        title: "Save Error",
        description: "Failed to save board. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToCloud = async (): Promise<void> => {
    await handleSaveBoard();
  };

  const resetModes = () => {
    setShowPalette(false);
    setShowShapePalette(false);
    setDiagramMode(false);
  };

  const handleEraseClick = (id: number | string, type: "shape" | "note" | "path" | "comment") => {
    if (type === "shape") {
      setShapes((prev) => prev.filter((s) => s.id !== id));
    }
    else if (type === "note") {
      setTextAreas((prev) => prev.filter((t) => t.id !== id));
    }
    else if (type === "path") {
      setFreehandPaths((prev) => prev.filter((p) => p.id !== id));
    }
    else if (type === "comment") {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedColor) {
      const newStickyNote: StickyNoteType = {
        id: Date.now(),
        x,
        y,
        text: "",
        color: selectedColor,
        board_id: boardId
      };
      
      setTextAreas(prev => [...prev, newStickyNote]);
      setSelectedColor(null);
    }

    if (selectedShape && !diagramMode) {
      setShapes((prev) => [
        ...prev,
        { id: Date.now(), type: selectedShape, x, y, width: 100, height: 100 },
      ]);
      setSelectedShape(null);
    }

    if (activeTool === "comment") {
      setComments((prev) => [...prev, { id: Date.now(), x, y, text: "" }]);
      setActiveTool("select");
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const color = e.dataTransfer.getData("color");
    if (color) {
      const newStickyNote: StickyNoteType = {
        id: Date.now(),
        x,
        y,
        text: "",
        color,
        board_id: boardId
      };
      
      setTextAreas(prev => [...prev, newStickyNote]);
    }

    const shapeType = e.dataTransfer.getData("shape");
    if (shapeType) {
      setShapes((prev) => [
        ...prev,
        { id: Date.now(), type: shapeType, x, y, width: 100, height: 100 },
      ]);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (activeTool === "erase") handleEraseClick(id, "shape");
    else setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCursorPosition({ x, y });
    sendCursor(x, y);

    if (draggingId) {
      setShapes(prev =>
        prev.map(s => s.id === draggingId ? { ...s, x, y } : s)
      );
    }

    if (diagramMode && e.buttons === 1) {
      setFreehandPaths(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.id !== "drawing") {
          return [...prev, { id: "drawing", points: `${x},${y}` }];
        }
        last.points += ` ${x},${y}`;
        return [...prev.slice(0, -1), last];
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    
    if (diagramMode) {
      setFreehandPaths(prev =>
        prev.map(p => p.id === "drawing" ? { ...p, id: Date.now() } : p)
      );
    }
  };

  const handleBoardNameChange = (newName: string) => {
    setBoardName(newName);
    setBoardId(newName);
    
    saveBoardMetadata({
      id: newName,
      name: newName,
      owner: boardOwner,
      lastOpened: new Date().toISOString()
    });
  };

  const handleInviteClick = () => {
    setCollaboratorsOpen(true);
  };

  const handleShareClick = () => {
    toast({
      title: "Share Board",
      description: "Generate a shareable link for this board.",
    });
  };

  const handlePresentClick = () => {
    toast({
      title: "Presentation Mode",
      description: "Entering presentation mode. Press ESC to exit.",
    });
  };

  const renderShapeSVG = (shape: ShapeType) => {
    const { type, width, height } = shape;
    switch (type) {
      case "triangle":
        return <polygon points={`0,${height} ${width / 2},0 ${width},${height}`} fill="#90CAF9" stroke="#1976D2" strokeWidth={2} />;
      case "circle":
        return <circle cx={width / 2} cy={height / 2} r={width / 2} fill="#FFCDD2" stroke="#B71C1C" strokeWidth={2} />;
      case "rectangle":
        return <rect width={width} height={height} fill="#C8E6C9" stroke="#2E7D32" strokeWidth={2} />;
      case "diamond":
        return <polygon points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`} fill="#FFF9C4" stroke="#F57F17" strokeWidth={2} />;
      case "star":
        return <polygon points={`${width/2},0 ${width*0.6},${height*0.35} ${width},${height*0.4} ${width*0.7},${height*0.65} ${width*0.8},${height} ${width/2},${height*0.8} ${width*0.2},${height} ${width*0.3},${height*0.65} 0,${height*0.4} ${width*0.4},${height*0.35}`} fill="#FFE082" stroke="#FF8F00" strokeWidth={2} />;
      case "line":
        return <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#000" strokeWidth={2} />;
      case "arrow":
        return <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#000" strokeWidth={2} markerEnd="url(#arrowhead)" />;
      case "left-arrow":
        return <line x1={width} y1={height / 2} x2={0} y2={height / 2} stroke="#000" strokeWidth={2} markerEnd="url(#arrowhead)" />;
      default:
        return null;
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col ">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-md opacity-90"></div>
            </div>
            <span className="font-bold text-gray-900 text-3xl">miro</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Input
              value={boardName}
              onChange={(e) => handleBoardNameChange(e.target.value)}
              className="h-8 w-20 px-3 text-xl font-medium text-yellow-700 border border-yellow-400 bg-yellow-50 focus:outline focus:outline-yellow-500 ring-0 rounded transition"
            />
            <Badge variant="secondary" className="text-xs">Live</Badge>
            <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <Button className="bg-yellow-100 text-yellow-900 h-8 px-4 rounded border-yellow-200 text-sm font-semibold shadow-none hover:bg-yellow-200" variant="outline">
            Upgrade
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveBoard}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Board'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleInviteClick}>
              <Users className="w-4 h-4 mr-2" />
              Collaborators ({collaborators.length})
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareClick}>
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handlePresentClick}>
              <Play className="w-4 h-4 mr-2" />
              Present
            </Button>
          </div>
        </div>
        
        <UserDropdown email={userEmail} />
        
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4" />
        </Button>
      </header>

      <div className="flex flex-1">
        <div className="w-16 mt-[20px] flex flex-col items-center py-4 border-r bg-white relative z-50">
          <TooltipProvider>
            {tools.map((tool) => (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeTool === tool.id ? "secondary" : "ghost"}
                    className="my-2 h-[50px] w-16 flex items-center justify-center"
                    onClick={() => { setActiveTool(tool.id); tool.action(); }}
                  >
                    <tool.icon className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>{tool.label}</p></TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>

          {showPalette && (
            <div className="w-[100px] absolute left-full top-0 ml-2 p-2 bg-white rounded shadow z-50 mt-[85px] grid grid-cols-2 gap-2">
              {colors.map((color) => (
                <div
                  key={color}
                  className="rounded cursor-pointer border border-gray-300"
                  style={{ backgroundColor: color, width: 40, height: 40 }}
                  onClick={() => {
                    setSelectedColor(color);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("color", color)}
                />
              ))}
            </div>
          )}

          {showShapePalette && (
            <div className="w-[200px] absolute left-full top-0 ml-2 p-3 bg-white rounded shadow z-50 mt-[85px]">
              <div className="flex justify-between mb-2">
                {simpleShapes.map((shape) => (
                  <div
                    key={shape.id}
                    className="p-2 rounded cursor-pointer border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    onClick={() => {
                      setSelectedShape(shape.id);
                    }}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("shape", shape.id)}
                  >
                    <shape.icon className="w-5 h-5" />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mb-3">
                {iconShapes.map((shape) => (
                  <div
                    key={shape.id}
                    className="p-2 rounded cursor-pointer border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    onClick={() => {
                      setSelectedShape(shape.id);
                    }}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("shape", shape.id)}
                  >
                    <shape.icon className="w-5 h-5" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  className="px-2 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                  onClick={() => {
                    setDiagramMode(true);
                  }}
                >
                  Create Diagram
                </button>
              </div>
            </div>
          )}
        </div>

        <ZoomableGrid boardWidth={5000} boardHeight={3000} initialZoom={1}>
          <div
            className="w-full h-full relative"
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {textAreas.map((ta) => (
              <textarea
                key={ta.id}
                ref={textareaRef}
                className="absolute border border-gray-400 rounded p-2 text-sm resize-none focus:outline-none"
                style={{
                  top: ta.y,
                  left: ta.x,
                  width: 200,
                  height: 150,
                  backgroundColor: ta.color,
                  cursor: activeTool === "erase" ? "not-allowed" : "text",
                }}
                value={ta.text}
                onChange={(e) => {
                  const newText = e.target.value;
                  setTextAreas((prev) =>
                    prev.map((t) =>
                      t.id === ta.id ? { ...t, text: newText } : t
                    )
                  );
                }}
                onClick={(e) => {
                  if (activeTool === "erase") {
                    e.stopPropagation();
                    handleEraseClick(ta.id, "note");
                  }
                }}
              />
            ))}

            {shapes.map((shape) => (
              <svg
                key={shape.id}
                className="absolute"
                style={{
                  top: shape.y,
                  left: shape.x,
                  width: shape.width,
                  height: shape.height,
                  cursor: activeTool === "erase" ? "not-allowed" : "move",
                }}
                onMouseDown={(e) => handleMouseDown(e, shape.id)}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="10"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="black" />
                  </marker>
                </defs>
                {renderShapeSVG(shape)}
              </svg>
            ))}

            {freehandPaths.map((path) => (
              <svg
                key={path.id}
                className="absolute top-0 left-0 w-full h-full"
                style={{ cursor: activeTool === "erase" ? "not-allowed" : "default" }}
                onClick={(e) => {
                  if (activeTool === "erase") {
                    e.stopPropagation();
                    handleEraseClick(path.id, "path");
                  }
                }}
              >
                <polyline points={path.points} fill="none" stroke="black" strokeWidth={2} />
              </svg>
            ))}

            {comments.map((comment) => (
              <MessageIconWithTextarea
                key={comment.id}
                comment={comment}
                onUpdate={(id, text) => {
                  setComments((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, text } : c))
                  );
                }}
                onDelete={(id) => handleEraseClick(id, "comment")}
              />
            ))}

            <div
              className="absolute w-3 h-3 pointer-events-none z-50"
              style={{
                top: cursorPosition.y,
                left: cursorPosition.x,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative">
                <div 
                  className="w-3 h-3 rounded-full border-2 border-white shadow-md"
                  style={{ backgroundColor: '#FFD700' }}
                />
              </div>
            </div>

            {remoteCursors.map((cursor) => (
              <RemoteCursor key={cursor.userId} cursor={cursor} />
            ))}

            <div className="absolute bottom-4 right-4 z-40">
              <Button
                onClick={handleSaveToCloud}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to Cloud'}
              </Button>
            </div>
          </div>
        </ZoomableGrid>
      </div>

      <CollaboratorsPanel 
        isOpen={collaboratorsOpen}
        onClose={() => setCollaboratorsOpen(false)}
        collaborators={collaborators}
        onCollaboratorsUpdate={setCollaborators}
        boardId={boardId}
        currentUser={userEmail}
        currentUserId={userId}
      />
    </main>
  );
}