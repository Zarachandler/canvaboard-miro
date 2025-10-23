// app/services/editorSyncService.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to fetch editors from board_collaborators and store in board_editors
export const syncEditorsToBoardEditors = async (): Promise<{ 
  success: boolean; 
  syncedCount?: number;
  editors?: any[];
  error?: string 
}> => {
  try {
    console.log('🔄 Starting editor sync from board_collaborators to board_editors...');

    // Step 1: Fetch all users with role = 'editor' from board_collaborators
    const { data: editors, error: fetchError } = await supabase
      .from('board_collaborators')
      .select('board_id, email, role, name, invited_at')
      .eq('role', 'editor');

    if (fetchError) {
      console.error('❌ Error fetching editors from board_collaborators:', fetchError);
      return { success: false, error: `Fetch error: ${fetchError.message}` };
    }

    if (!editors || editors.length === 0) {
      console.log('ℹ️ No editors found in board_collaborators table');
      return { success: true, syncedCount: 0, editors: [] };
    }

    console.log(`📊 Found ${editors.length} editors in board_collaborators:`);
    editors.forEach((editor, index) => {
      console.log(`   ${index + 1}. Board: ${editor.board_id}, Email: ${editor.email}, Name: ${editor.name}, Role: ${editor.role}`);
    });

    // Step 2: Prepare data for board_editors table
    const editorsToInsert = editors.map(editor => ({
      board_id: editor.board_id,
      user_email: editor.email,
      role: editor.role,
      created_at: editor.invited_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    console.log('📝 Prepared data for board_editors insertion:', editorsToInsert);

    // Step 3: Insert into board_editors table
    let insertedCount = 0;
    const insertedEditors = [];

    // Try batch insert first
    const { data: batchResult, error: batchError } = await supabase
      .from('board_editors')
      .insert(editorsToInsert)
      .select();

    if (batchError) {
      console.log('⚠️ Batch insert failed, trying individual inserts...');
      
      // Individual inserts as fallback
      for (const editor of editorsToInsert) {
        const { data: singleResult, error: singleError } = await supabase
          .from('board_editors')
          .insert(editor)
          .select()
          .single();

        if (singleError) {
          console.error(`❌ Failed to insert ${editor.user_email}:`, singleError);
        } else {
          console.log(`✅ Inserted: ${editor.user_email} for board ${editor.board_id}`);
          insertedCount++;
          insertedEditors.push(singleResult);
        }
      }
    } else {
      insertedCount = batchResult?.length || 0;
      insertedEditors.push(...(batchResult || []));
      console.log(`✅ Batch insert successful! Inserted ${insertedCount} editors`);
    }

    // Step 4: Verify the data was stored
    console.log('🔍 Verifying data in board_editors table...');
    const { data: verifiedData, error: verifyError } = await supabase
      .from('board_editors')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
    } else {
      console.log(`📋 board_editors table now has ${verifiedData?.length || 0} records:`);
      verifiedData?.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, Board: ${record.board_id}, Email: ${record.user_email}, Role: ${record.role}`);
      });
    }

    return { 
      success: insertedCount > 0, 
      syncedCount: insertedCount,
      editors: insertedEditors
    };

  } catch (error: any) {
    console.error('💥 Sync error:', error);
    return { success: false, error: error.message };
  }
};

// Function to get current state of both tables
export const getSyncStatus = async (): Promise<{
  success: boolean;
  boardCollaborators?: any[];
  boardEditors?: any[];
  error?: string;
}> => {
  try {
    console.log('📊 Getting sync status...');

    // Get data from board_collaborators (editors only)
    const { data: collaborators, error: collabError } = await supabase
      .from('board_collaborators')
      .select('board_id, email, role, name, invited_at')
      .eq('role', 'editor')
      .order('invited_at', { ascending: false });

    if (collabError) {
      console.error('Error fetching board_collaborators:', collabError);
    }

    // Get data from board_editors
    const { data: editors, error: editorsError } = await supabase
      .from('board_editors')
      .select('*')
      .order('created_at', { ascending: false });

    if (editorsError) {
      console.error('Error fetching board_editors:', editorsError);
    }

    console.log('📈 Sync Status:');
    console.log(`   - board_collaborators (editors): ${collaborators?.length || 0} records`);
    console.log(`   - board_editors: ${editors?.length || 0} records`);

    return {
      success: true,
      boardCollaborators: collaborators || [],
      boardEditors: editors || []
    };

  } catch (error: any) {
    console.error('Status check error:', error);
    return { success: false, error: error.message };
  }
};

// Function to sync specific editors by email
export const syncSpecificEditors = async (emails: string[]): Promise<{
  success: boolean;
  syncedCount?: number;
  error?: string;
}> => {
  try {
    console.log(`🔍 Syncing specific editors: ${emails.join(', ')}`);

    // Fetch specific editors from board_collaborators
    const { data: editors, error: fetchError } = await supabase
      .from('board_collaborators')
      .select('board_id, email, role, name, invited_at')
      .eq('role', 'editor')
      .in('email', emails);

    if (fetchError) {
      console.error('Error fetching specific editors:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!editors || editors.length === 0) {
      console.log('❌ No matching editors found');
      return { success: false, error: 'No matching editors found' };
    }

    console.log(`📊 Found ${editors.length} matching editors:`);
    editors.forEach(editor => {
      console.log(`   - ${editor.email} (${editor.name}) -> Board: ${editor.board_id}`);
    });

    // Insert into board_editors
    const editorsToInsert = editors.map(editor => ({
      board_id: editor.board_id,
      user_email: editor.email,
      role: editor.role,
      created_at: editor.invited_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    let syncedCount = 0;
    for (const editor of editorsToInsert) {
      const { error: insertError } = await supabase
        .from('board_editors')
        .insert(editor);

      if (insertError) {
        console.error(`❌ Failed to sync ${editor.user_email}:`, insertError);
      } else {
        console.log(`✅ Synced: ${editor.user_email}`);
        syncedCount++;
      }
    }

    return { success: syncedCount > 0, syncedCount };

  } catch (error: any) {
    console.error('Specific sync error:', error);
    return { success: false, error: error.message };
  }
};

// One-click function to sync your specific editors
export const syncYourEditors = async (): Promise<{
  success: boolean;
  syncedCount?: number;
  error?: string;
}> => {
  // Your specific editor emails from the image
  const yourEditors = [
    'zarachandler283@gmail.com',
    'stellaross2002@gmail.com'
  ];

  console.log('🎯 Syncing your specific editors...');
  return await syncSpecificEditors(yourEditors);
};