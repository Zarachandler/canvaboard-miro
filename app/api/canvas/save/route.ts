// import { NextRequest, NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';

// export async function POST(req: NextRequest) {
//   try {
//     const { email, boardTitle, canvasData } = await req.json();

//     if (!email || !boardTitle || !canvasData) {
//       return NextResponse.json(
//         { error: 'Email, boardTitle, and canvasData are required' },
//         { status: 400 }
//       );
//     }

//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     // Retrieve user by email from Supabase Auth
//     const { data, error } = await supabase.auth.admin.listUsers();
//     if (error) {
//       console.error('Supabase error:', error);
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }
//     const user = data.users.find((u) => u.email === email);
//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }

//     const userId = user.id;

//     // Insert new board linked to userId
//     const { data: insertData, error: insertError } = await supabase
//       .from('boards')
//       .insert([
//         {
//           user_id: userId,
//           title: boardTitle,
//           content: canvasData,
//         },
//       ])
//       .select()
//       .single();

//     if (insertError) {
//       console.error('Insert error:', insertError);
//       return NextResponse.json({ error: insertError.message }, { status: 500 });
//     }

//     return NextResponse.json({ board: insertData }, { status: 201 });
//   } catch (err) {
//     console.error('API route error:', err);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   }
// }





import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const user = data.users.find((u) => u.email === email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error('API route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}