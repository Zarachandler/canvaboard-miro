'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  color: string;
}

interface CollaboratorsPanelProps {
  collaborators: Collaborator[];
  owner?: { id: string; name: string };
}

export default function CollaboratorsPanel({ collaborators, owner }: CollaboratorsPanelProps) {
  const [showList, setShowList] = useState(false);
  // Filter out the owner from the collaborators list if present
  const filteredCollaborators = owner
    ? collaborators.filter(c => c.id !== owner.id)
    : collaborators;
  return (
    <div className="relative">
      <div className="flex items-center -space-x-1 cursor-pointer" onClick={() => setShowList((v) => !v)}>
        {filteredCollaborators.map(c => {
          const initial = c.name && c.name.trim().length > 0
            ? c.name.charAt(0).toUpperCase()
            : (c.email ? c.email.charAt(0).toUpperCase() : '?');
          return (
            <Avatar key={c.id} className="w-6 h-6 border border-white">
              <AvatarFallback style={{ backgroundColor: c.color }}>
                {initial}
              </AvatarFallback>
            </Avatar>
          );
        })}
        {owner && owner.name && (
          <Avatar key={owner.id} className="w-6 h-6 border-2 border-blue-400">
            <AvatarFallback className="bg-blue-500 text-white font-bold">
              {owner.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {showList && (
        <div className="absolute left-0 mt-2 z-50 bg-white border border-slate-200 rounded shadow-lg p-2 min-w-[140px]">
          <div className="font-semibold text-slate-700 mb-1">Collaborators</div>
          <ul>
            {owner && owner.name && (
              <li key={owner.id} className="text-blue-700 text-sm py-1 px-2 font-bold bg-blue-50 rounded mb-1">
                Owner: {owner.name}
              </li>
            )}
            {filteredCollaborators.map(c => (
              <li key={c.id} className="text-slate-800 text-sm py-1 px-2 hover:bg-slate-100 rounded">
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}