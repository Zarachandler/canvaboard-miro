// BoardFilterBar.tsx
import React from 'react';

export interface BoardFilterBarProps {
  filterBy: string;
  setFilterBy: (value: string) => void;
  ownedBy: string;
  setOwnedBy: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}

export const BoardFilterBar: React.FC<BoardFilterBarProps> = ({ 
  filterBy, 
  setFilterBy, 
  ownedBy, 
  setOwnedBy, 
  sortBy, 
  setSortBy 
}) => {
  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Filter by:</label>
        <select 
          value={filterBy} 
          onChange={(e) => setFilterBy(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="starred">Starred</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Owned by:</label>
        <select 
          value={ownedBy} 
          onChange={(e) => setOwnedBy(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="anyone">Anyone</option>
          <option value="me">Me</option>
          <option value="others">Others</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Sort by:</label>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="last-opened">Last opened</option>
          <option value="last-modified">Last modified</option>
          <option value="created">Created</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
};