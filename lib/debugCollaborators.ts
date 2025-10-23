import { supabase } from "@/lib/supabaseClient";

export async function debugFetchCollaborators(boardId: string) {
  console.log('🔍 DEBUG: Starting fetchCollaborators for board:', boardId);
  
  try {
    // Test 1: Check if board_collaborator table exists and has data
    console.log('📋 TEST 1: Checking board_collaborator table...');
    const { data: collabData, error: collabError } = await supabase
      .from('board_collaborator')
      .select('*')
      .eq('board_id', boardId);

    console.log('📋 board_collaborator data:', collabData);
    console.log('📋 board_collaborator error:', collabError);

    // Test 2: Check if user table exists and has data
    console.log('👤 TEST 2: Checking user table...');
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('*')
      .limit(5);

    console.log('👤 user table data:', userData);
    console.log('👤 user table error:', userError);

    // Test 3: Try the actual join query
    console.log('🔗 TEST 3: Trying join query...');
    const { data: joinData, error: joinError } = await supabase
      .from('board_collaborator')
      .select(`
        user_id, 
        role, 
        created_at,
        user:user_id (id, email, name)
      `)
      .eq('board_id', boardId);

    console.log('🔗 Join query data:', joinData);
    console.log('🔗 Join query error:', joinError);

    return joinData || [];

  } catch (error) {
    console.error('💥 DEBUG: Error in fetchCollaborators:', error);
    throw error;
  }
}

export async function debugAddCollaborator(boardId: string, userId: string, role: string = "editor") {
  console.log('🔍 DEBUG: Adding collaborator:', { boardId, userId, role });
  
  try {
    const { data, error } = await supabase
      .from("board_collaborator")
      .insert([{ 
        board_id: boardId, 
        user_id: userId, 
        role,
        created_at: new Date().toISOString()
      }])
      .select();

    console.log('✅ DEBUG: Insert result data:', data);
    console.log('❌ DEBUG: Insert result error:', error);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('💥 DEBUG: Error adding collaborator:', error);
    throw error;
  }
}