'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Globe, UserPlus, X } from 'lucide-react';

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  color: string;
}

interface CollaboratorsPanelProps {
  collaborators: Collaborator[];
  owner?: { id: string; name: string };
  userEmail?: string | null;
  boardTitle?: string;
  canvasData?: any;
  boardId?: string;
  onCollaborationStart?: (emails: string[], accessLevel: string) => void;
}

const ACCESS_OPTIONS = [
  { value: 'no-access', label: 'No access' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'editor', label: 'Editor' },
];

// InviteEmailBar Component
function InviteEmailBar({ onAdd }: { onAdd: (email: string) => void }) {
  const [email, setEmail] = useState('');

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidEmail(email)) {
      onAdd(email);
      setEmail('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="Enter email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!isValidEmail(email)}
        title="Add user"
        className="p-2"
      >
        <UserPlus className="w-5 h-5" />
      </Button>
    </form>
  );
}

export default function CollaboratorsPanel({
  collaborators,
  owner,
  userEmail,
  boardTitle = 'My New Board',
  canvasData = { nodes: [], edges: [] },
  boardId = 'default-board',
  onCollaborationStart,
}: CollaboratorsPanelProps) {
  const [open, setOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState(ACCESS_OPTIONS[3].value); // Default to editor
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredCollaborators = owner
    ? collaborators.filter((c) => c.id !== owner.id)
    : collaborators;

  const userInitial = userEmail && userEmail.length > 0 ? userEmail[0].toUpperCase() : '?';

  const accessLabel =
    ACCESS_OPTIONS.find((option) => option.value === accessLevel)?.label || ACCESS_OPTIONS[0].label;

  const handleAddEmail = (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    // Prevent duplicates
    setInvitedEmails((prev) => 
      prev.includes(normalizedEmail) ? prev : [...prev, normalizedEmail]
    );
  };

  const removeInvitedEmail = (emailToRemove: string) => {
    setInvitedEmails((prev) => prev.filter((email) => email !== emailToRemove));
  };

  // Generate shareable link
  const getShareableLink = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/canvas?board=${boardId}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareableLink()).then(() => {
      // You can replace this with a toast notification
      alert('Link copied to clipboard!');
    });
  };

  // Direct collaboration function - grants direct access
  const handleStartCollaboration = async () => {
    if (invitedEmails.length === 0) return;

    // Filter out logged-in user's email to avoid redundant processing
    const filteredEmails = invitedEmails.filter(email => email !== userEmail);

    setIsLoading(true);

    try {
      // Call the callback if provided
      if (onCollaborationStart) {
        onCollaborationStart(filteredEmails, accessLevel);
      } else {
        // Fallback to your existing API call
        const response = await fetch('/api/canvas/collaborators/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails: filteredEmails,
            canvasId: boardId,
            boardTitle,
            canvasData,
            accessLevel,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Error starting collaboration:', result.error);
          throw new Error(result.error || 'Failed to start collaboration');
        }

        if (result.failed?.length > 0) {
          alert(`Collaboration partially started. ${result.successful.length} users granted access, ${result.failed.length} failed.`);
        } else {
          alert('Collaboration started successfully! Users have been granted direct access.');
        }
      }

      setOpen(false);
      setInvitedEmails([]);
    } catch (error) {
      console.error('Request failed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Collaborators Avatars */}
      <div 
        className="flex items-center -space-x-1 cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={() => setOpen(true)}
        title="Manage collaborators"
      >
        {filteredCollaborators.slice(0, 3).map((c) => {
          const initial =
            c.name?.trim()?.[0]?.toUpperCase() || (c.email?.[0]?.toUpperCase() || '?');
          return (
            <Avatar key={c.id} className="w-8 h-8 border-2 border-white shadow-sm">
              <AvatarFallback 
                className="text-xs font-medium text-white" 
                style={{ backgroundColor: c.color }}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {filteredCollaborators.length > 3 && (
          <div className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
            <span className="text-xs font-medium text-gray-600">
              +{filteredCollaborators.length - 3}
            </span>
          </div>
        )}
      </div>

      {/* Start Collaboration Button - Bottom Right */}
      <Button
        onClick={() => setOpen(true)}
        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full p-0 bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg border-2 border-white"
        size="icon"
        title="Add collaborators"
      >
        <Users className="w-4 h-4" />
      </Button>

      {/* Invite Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[480px] max-w-full rounded-lg p-6 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Add Collaborators
            </DialogTitle>
            <DialogDescription className="text-sm">
              Invite people to collaborate on this board
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invite Email Bar */}
            <div className="space-y-3">
              <Label htmlFor="invite-emails" className="text-sm font-medium">
                Add people by email
              </Label>
              <InviteEmailBar onAdd={handleAddEmail} />

              {/* Show added emails */}
              {invitedEmails.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Users to be added:</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {invitedEmails.map((email, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg border">
                        <span className="text-sm flex-1 truncate">{email}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeInvitedEmail(email)}
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shareable Link */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Shareable link</Label>
              <div className="flex items-center space-x-2">
                <Input
                  readOnly
                  value={getShareableLink()}
                  className="flex-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Access Control */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Board Access
              </div>

              {/* Current User */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">You</div>
                  <div className="text-xs text-gray-500">Board owner</div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  Owner
                </Badge>
              </div>

              {/* Anyone with link */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Anyone with the link</div>
                  <div className="text-xs text-gray-500">
                    {accessLevel === 'no-access' ? 'No access' : `${accessLabel} access`}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {accessLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {ACCESS_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setAccessLevel(option.value)}
                        className={`text-xs ${
                          accessLevel === option.value ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Current Collaborators */}
              {filteredCollaborators.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Current collaborators:</Label>
                  {filteredCollaborators.map((collaborator) => {
                    const initial =
                      collaborator.name?.trim()?.[0]?.toUpperCase() ||
                      (collaborator.email?.[0]?.toUpperCase() || '?');
                    return (
                      <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback
                            className="text-xs font-medium text-white"
                            style={{ backgroundColor: collaborator.color }}
                          >
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{collaborator.name}</div>
                          {collaborator.email && (
                            <div className="text-xs text-gray-500">{collaborator.email}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50">
                          Collaborator
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state message */}
              {filteredCollaborators.length === 0 && invitedEmails.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <div>No collaborators yet</div>
                  <div className="text-xs mt-1">Add people to start collaborating</div>
                </div>
              )}
            </div>
          </div>

          {/* Dialog Footer */}
          <DialogFooter className="flex gap-2 sm:gap-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setInvitedEmails([]);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              onClick={handleStartCollaboration}
              disabled={isLoading || invitedEmails.length === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed min-w-32"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Start Collaboration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}