// import { supabase } from "@/lib/supabaseClient";

// export type CollaboratorRole = "editor" | "viewer" | "admin";

// export interface Collaborator {
//   user_id: string;
//   role: CollaboratorRole;
//   users: {
//     id: string;
//     name: string;
//     email: string;
//   };
// }

// // Add a collaborator to a board
// export async function addCollaborator(
//   boardId: string, 
//   userId: string, 
//   role: CollaboratorRole = "editor"
// ) {
//   const { data, error } = await supabase
//     .from("board_collaborators")
//     .insert([{ board_id: boardId, user_id: userId, role }])
//     .select(`
//       user_id,
//       role,
//       users:user_id (id, name, email)
//     `)
//     .single();

//   if (error) {
//     console.error("Error adding collaborator:", error);
//     throw error;
//   }

//   return data;
// }

// // Remove a collaborator
// export async function removeCollaborator(boardId: string, userId: string) {
//   const { data, error } = await supabase
//     .from("board_collaborators")
//     .delete()
//     .match({ board_id: boardId, user_id: userId });

//   if (error) {
//     console.error("Error removing collaborator:", error);
//     throw error;
//   }

//   return data;
// }

// // Fetch all collaborators for a board - FIXED
// export async function fetchCollaborators(boardId: string): Promise<Collaborator[]> {
//   try {
//     const { data, error } = await supabase
//       .from("board_collaborators")
//       .select(`
//         user_id,
//         role,
//         users:user_id (id, name, email)
//       `)
//       .eq("board_id", boardId);

//     // if (error) {
//     //   console.error("Error fetching collaborators:", error);
//     //   // Return empty array instead of throwing to prevent breaking the UI
//     //   return [];
//     // }

//     // Handle case where data is null or empty
//     if (!data || data.length === 0) {
//       return [];
//     }

//     // Transform the data to handle the array-to-object conversion
//     const transformedData: Collaborator[] = data.map(item => {
//       // Extract the first user from the array (should only be one)
//       const user = Array.isArray(item.users) ? item.users[0] : item.users;
      
//       return {
//         user_id: item.user_id,
//         role: item.role,
//         users: {
//           id: user?.id || item.user_id,
//           name: user?.name || 'Unknown User',
//           email: user?.email || 'unknown@example.com'
//         }
//       };
//     });

//     return transformedData;
//   } catch (error) {
//     console.error("Unexpected error in fetchCollaborators:", error);
//     return [];
//   }
// }

// // Update collaborator role - FIXED
// export async function updateCollaboratorRole(
//   boardId: string, 
//   userId: string, 
//   role: CollaboratorRole
// ) {
//   const { data, error } = await supabase
//     .from("board_collaborators")
//     .update({ role })
//     .match({ board_id: boardId, user_id: userId })
//     .select(`
//       user_id,
//       role,
//       users:user_id (id, name, email)
//     `)
//     .single();

//   if (error) {
//     console.error("Error updating collaborator role:", error);
//     throw error;
//   }

//   // Transform the single result as well
//   if (data) {
//     const user = Array.isArray(data.users) ? data.users[0] : data.users;
//     return {
//       ...data,
//       users: {
//         id: user?.id || data.user_id,
//         name: user?.name || 'Unknown User',
//         email: user?.email || 'unknown@example.com'
//       }
//     };
//   }

//   return data;
// }

// // Check if user exists by email
// export async function findUserByEmail(email: string) {
//   const { data, error } = await supabase
//     .from("users")
//     .select("id, email, name")
//     .eq("email", email)
//     .single();

//   if (error) {
//     if (error.code === 'PGRST116') { // No rows returned
//       return null;
//     }
//     console.error("Error finding user:", error);
//     throw error;
//   }

//   return data;
// }