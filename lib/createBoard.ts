// import { supabase } from './supabaseClient'

// export async function createBoard(userId: string, title: string, content: string) {
//   const { data, error } = await supabase
//     .from('boards')
//     .insert([{ user_id: userId, title, content }])
//     .single()
//   if (error) throw error
//   return data
// }
