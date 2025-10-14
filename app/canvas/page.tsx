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
import ZoomableGrid from "../board/ZoomableGrid";
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';
import { Collaborator } from "./CollaboratorsPanel";
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
} from "lucide-react";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- TYPES ----------
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

// ---------- useCursorMovement HOOK ----------
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
      console.log('Connecting to WebSocket:', `${wsUrl}?boardId=${boardId}&userId=${userId}`);
      
      const ws = new WebSocket(`${wsUrl}?boardId=${boardId}&userId=${userId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
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
          console.log('Received WebSocket message:', message.type);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      // ws.onerror = (error) => {
      //   console.error('WebSocket connection error:', error);
      //   setIsConnected(false);
      // };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Retrying WebSocket connection after error...');
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
    } else {
      console.log('WebSocket not connected, cannot send cursor position');
    }
  }, [boardId, userId, userName, userColor]);

  useEffect(() => {
    if (boardId && userId && userId !== 'anonymous') {
      console.log('Initializing WebSocket connection...');
      connect();
    } else {
      console.log('Skipping WebSocket connection - missing boardId or userId');
    }

    return () => {
      console.log('Cleaning up WebSocket connection...');
      cleanup();
    };
  }, [connect, cleanup, boardId, userId]);

  return {
    sendCursor,
    isConnected
  };
};

// ---------- USER DROPDOWN COMPONENT ----------
function UserDropdown({ email }: { email: string | null }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [collaborationOpen, setCollaborationOpen] = useState(false);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const startCollaboration = () => {
    setCollaborationOpen(true);
    setAnchorEl(null);
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
              className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100 cursor-pointer"
              onClick={startCollaboration}
            >
              Start Share the Collaboration
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

      <Dialog open={collaborationOpen} onOpenChange={setCollaborationOpen}>
        <DialogContent className="w-[480px] max-w-full rounded-lg p-6">
          <DialogHeader>
            <DialogTitle>Start Collaboration</DialogTitle>
            <DialogDescription className="mb-4">
              Invite people to collaborate on this project
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="collab-emails" className="mb-2">Invite people</Label>
              <Input
                id="collab-emails"
                type="text"
                placeholder="Enter email addresses"
                className="mb-2"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value="https://your-app.com/collaboration-link"
                className="flex-1 text-xs"
              />
              <Button size="sm" onClick={() => {
                navigator.clipboard.writeText("https://your-app.com/collaboration-link");
              }}>
                Copy link
              </Button>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setCollaborationOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                alert('Collaboration started!');
                setCollaborationOpen(false);
              }}>
                Start Collaboration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- UTILITY FUNCTIONS ----------
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

function getRecentBoards(): BoardMetadata[] {
  return JSON.parse(localStorage.getItem('recentBoards') || '[]');
}

// ---------- COMMENT ICON COMPONENT ----------
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

// ---------- USER CHECK MODAL ----------
function UserCheckModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unknown error');
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Check User</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email to check"
              required
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          {result && (
            <div className="text-green-600 text-sm">
              User found: {result.email}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Check User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- REMOTE CURSOR COMPONENT ----------
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

// ---------- MAIN PAGE COMPONENT ----------
export default function Home() {
  const { toast } = useToast();
  const [boardId, setBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [boardOwner, setBoardOwner] = useState("You");
  const [activeTool, setActiveTool] = useState("select");
  const [showPalette, setShowPalette] = useState(false);
  const [showShapePalette, setShowShapePalette] = useState(false);
  const [showUserCheck, setShowUserCheck] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  
  // Cursor movement states
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [textAreas, setTextAreas] = useState<StickyNoteType[]>([]);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [shapes, setShapes] = useState<ShapeType[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [diagramMode, setDiagramMode] = useState(false);
  const [freehandPaths, setFreehandPaths] = useState<FreehandPath[]>([]);
  const [comments, setComments] = useState<CommentType[]>([]);

  // Initialize cursor movement hook
  const { sendCursor, isConnected } = useCursorMovement({
    boardId: boardId || 'default-board',
    userId: userEmail || 'anonymous',
    userName: userEmail?.split('@')[0] || 'Anonymous',
    userColor: '#FFD700',
  });

  // Mock collaborators data
  const [collaborators] = useState<Collaborator[]>([]);
  const owner = { id: "0", name: "You" };

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
      id: "more", 
      label: "More", 
      icon: Plus, 
      action: () => {
        resetModes();
        toast({
          title: "More Tools",
          description: "Additional tools and features are available.",
        });
      }
    },
  ];

  // ---------- AUTHENTICATION ----------
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ========== WEBSOCKET FOR RECEIVING CURSOR MOVEMENTS ==========
  useEffect(() => {
    if (!boardId || !userEmail) {
      console.log('Skipping WebSocket - missing boardId or userEmail');
      return;
    }

    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        console.log('Connecting to cursor WebSocket...');
        
        const ws = new WebSocket(`${wsUrl}?boardId=${boardId}&userId=${userEmail}`);
        
        ws.onopen = () => {
          console.log('✅ Connected to cursor WebSocket');
        };

        ws.onmessage = (event) => {
          try {
            const data: RemoteCursorData = JSON.parse(event.data);
            console.log('📨 Received cursor data from:', data.userName);
            
            if (data.type === 'cursor_move') {
              setRemoteCursors(prev => {
                const existing = prev.find(c => c.userId === data.userId);
                if (existing) {
                  return prev.map(c => 
                    c.userId === data.userId 
                      ? { ...c, x: data.position.x, y: data.position.y, lastUpdated: data.timestamp }
                      : c
                  );
                } else {
                  return [
                    ...prev,
                    {
                      userId: data.userId,
                      userName: data.userName,
                      userColor: data.userColor,
                      x: data.position.x,
                      y: data.position.y,
                      lastUpdated: data.timestamp
                    }
                  ];
                }
              });
            }
          } catch (error) {
            console.error('❌ Error parsing cursor message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 Cursor WebSocket disconnected:', event.code);
          setTimeout(connectWebSocket, 3000);
        };

        // ws.onerror = (error) => {
        //   console.error('❌ Cursor WebSocket error:', error);
        // };

        wsRef.current = ws;
      } catch (error) {
        console.error('❌ Failed to connect to cursor WebSocket:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [boardId, userEmail]);

  // ---------- REMOTE CURSORS CLEANUP ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => 
        prev.filter(cursor => now - cursor.lastUpdated < 3000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ---------- BOARD ID/NAME MANAGEMENT ----------
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
      
      toast({
        title: "Board Loaded",
        description: `Opened board: ${boardParam}`,
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
  }, [toast]);

  // Autosave name: when changed, update recentBoards and localStorage
  useEffect(() => {
    if (!boardId) return;
    
    let boards = JSON.parse(localStorage.getItem("recentBoards") || "[]");
    const idx = boards.findIndex((b: BoardMetadata) => b.id === boardId);
    if (idx !== -1) {
      boards[idx].name = boardName;
      boards[idx].lastOpened = new Date().toISOString();
      localStorage.setItem('recentBoards', JSON.stringify(boards));
    }
  }, [boardName, boardId]);

  // ---------- LOAD BOARD DATA FROM LOCALSTORAGE ----------
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
        toast({
          title: "Board Data Loaded",
          description: "Your board content has been restored.",
        });
      } catch (error) {
        console.error("Error loading board data:", error);
        toast({
          title: "Error Loading Board",
          description: "Could not load saved board data.",
          variant: "destructive",
        });
      }
    } else {
      setShapes([]);
      setTextAreas([]);
      setFreehandPaths([]);
      setComments([]);
    }
  }, [boardId, toast]);

  // ---------- SAVE BOARD DATA TO LOCALSTORAGE ----------
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

  // ---------- EVENT HANDLERS ----------
  const resetModes = () => {
    setShowPalette(false);
    setShowShapePalette(false);
    setDiagramMode(false);
  };

  const handleEraseClick = (id: number | string, type: "shape" | "note" | "path" | "comment") => {
    if (type === "shape") {
      setShapes((prev) => prev.filter((s) => s.id !== id));
      toast({
        title: "Shape Removed",
        description: "The shape has been deleted from the canvas.",
      });
    }
    else if (type === "note") {
      setTextAreas((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Sticky Note Removed",
        description: "The sticky note has been deleted.",
      });
    }
    else if (type === "path") {
      setFreehandPaths((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Drawing Removed",
        description: "The freehand drawing has been erased.",
      });
    }
    else if (type === "comment") {
      setComments((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Comment Removed",
        description: "The comment has been deleted.",
      });
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
      
      toast({
        title: "Sticky Note Added",
        description: "A new sticky note has been placed on the canvas.",
      });
    }

    if (selectedShape && !diagramMode) {
      setShapes((prev) => [
        ...prev,
        { id: Date.now(), type: selectedShape, x, y, width: 100, height: 100 },
      ]);
      setSelectedShape(null);
      toast({
        title: "Shape Added",
        description: `A new ${selectedShape} shape has been placed on the canvas.`,
      });
    }

    if (activeTool === "comment") {
      setComments((prev) => [...prev, { id: Date.now(), x, y, text: "" }]);
      setActiveTool("select");
      toast({
        title: "Comment Added",
        description: "Click on the comment icon to add your message.",
      });
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
      toast({
        title: "Sticky Note Dropped",
        description: "A sticky note has been placed on the canvas via drag and drop.",
      });
    }

    const shapeType = e.dataTransfer.getData("shape");
    if (shapeType) {
      setShapes((prev) => [
        ...prev,
        { id: Date.now(), type: shapeType, x, y, width: 100, height: 100 },
      ]);
      toast({
        title: "Shape Dropped",
        description: `A ${shapeType} shape has been placed on the canvas via drag and drop.`,
      });
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
    
    // Send cursor position to WebSocket
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
    if (draggingId) {
      toast({
        title: "Shape Moved",
        description: "The shape has been repositioned on the canvas.",
      });
    }
    setDraggingId(null);
    
    if (diagramMode) {
      setFreehandPaths(prev =>
        prev.map(p => p.id === "drawing" ? { ...p, id: Date.now() } : p)
      );
      toast({
        title: "Drawing Completed",
        description: "Your freehand drawing has been saved.",
      });
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
    
    toast({
      title: "Board Name Updated",
      description: `Board name changed to "${newName}".`,
    });
  };

  const handleInviteClick = () => {
    toast({
      title: "Invite Collaborators",
      description: "Share this board with your team members.",
    });
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

  const handleUserCheckClick = () => {
    setShowUserCheck(true);
    toast({
      title: "User Check",
      description: "Check if a user exists in the system.",
    });
  };

  const handleSaveBoard = () => {
    saveBoardMetadata({
      id: boardId,
      name: boardName,
      owner: boardOwner,
      lastOpened: new Date().toISOString()
    });
    
    toast({
      title: "Board Saved",
      description: "Board metadata has been saved to recent boards.",
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

  // ---------- RENDER ----------
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
            <Button variant="outline" size="sm" onClick={handleSaveBoard}>
              Save Board
            </Button>
            <Button variant="outline" size="sm" onClick={handleInviteClick}>
              <Users className="w-4 h-4 mr-2" />
              Invite
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
        
        {/* User Dropdown */}
        <UserDropdown email={userEmail} />
        
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4" />
        </Button>
      </header>

      <div className="flex flex-1">
        {/* Toolbar */}
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

          {/* Sticky Palette */}
          {showPalette && (
            <div className="w-[100px] absolute left-full top-0 ml-2 p-2 bg-white rounded shadow z-50 mt-[85px] grid grid-cols-2 gap-2">
              {colors.map((color) => (
                <div
                  key={color}
                  className="rounded cursor-pointer border border-gray-300"
                  style={{ backgroundColor: color, width: 40, height: 40 }}
                  onClick={() => {
                    setSelectedColor(color);
                    toast({
                      title: "Color Selected",
                      description: `Sticky note color set to ${color}. Click on canvas to place.`,
                    });
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("color", color)}
                />
              ))}
            </div>
          )}

          {/* Shape Palette */}
          {showShapePalette && (
            <div className="w-[200px] absolute left-full top-0 ml-2 p-3 bg-white rounded shadow z-50 mt-[85px]">
              <div className="flex justify-between mb-2">
                {simpleShapes.map((shape) => (
                  <div
                    key={shape.id}
                    className="p-2 rounded cursor-pointer border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                    onClick={() => {
                      setSelectedShape(shape.id);
                      toast({
                        title: "Shape Selected",
                        description: `${shape.id} shape ready. Click on canvas to place.`,
                      });
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
                      toast({
                        title: "Shape Selected",
                        description: `${shape.id} shape ready. Click on canvas to place.`,
                      });
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
                    toast({
                      title: "Diagram Mode Activated",
                      description: "Start drawing your diagram on the canvas.",
                    });
                  }}
                >
                  Create Diagram
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
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

            {/* Visual cursor indicator */}
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
                <div 
                  className="absolute top-1/2 left-1/2 w-6 h-6 border-2 border-yellow-400 rounded-full animate-ping"
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
              </div>
            </div>

            {/* Remote cursors */}
            {remoteCursors.map((cursor) => (
              <RemoteCursor key={cursor.userId} cursor={cursor} />
            ))}
          </div>
        </ZoomableGrid>
      </div>

      {/* User Check Modal */}
      <UserCheckModal 
        isOpen={showUserCheck} 
        onClose={() => setShowUserCheck(false)} 
      />
    </main>
  );
}