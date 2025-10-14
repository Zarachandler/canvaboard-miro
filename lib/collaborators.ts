import { supabase } from "@/lib/supabaseClient";

// Add a collaborator to a board
export async function addCollaborator(boardId: string, userId: string, role: "editor" | "viewer" | "admin" = "editor") {
  const { data, error } = await supabase
    .from("board_collaborators")
    .insert([{ board_id: boardId, user_id: userId, role }]);

  if (error) {
    console.error("Error adding collaborator:", error);
    throw error;
  }

  return data;
}

// Remove a collaborator
export async function removeCollaborator(boardId: string, userId: string) {
  const { data, error } = await supabase
    .from("board_collaborators")
    .delete()
    .match({ board_id: boardId, user_id: userId });

  if (error) {
    console.error("Error removing collaborator:", error);
    throw error;
  }

  return data;
}

// Fetch all collaborators for a board
export async function fetchCollaborators(boardId: string) {
  const { data, error } = await supabase
    .from("board_collaborators")
    .select("user_id, role, users:users(id, name, email)")
    .eq("board_id", boardId);

  if (error) {
    console.error("Error fetching collaborators:", error);
    throw error;
  }

  return data;
}

// Update collaborator role
export async function updateCollaboratorRole(boardId: string, userId: string, role: "editor" | "viewer" | "admin") {
  const { data, error } = await supabase
    .from("board_collaborators")
    .update({ role })
    .match({ board_id: boardId, user_id: userId });

  if (error) {
    console.error("Error updating collaborator role:", error);
    throw error;
  }

  return data;
}