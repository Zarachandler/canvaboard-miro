import { supabase } from "@/lib/supabaseClient";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  team: string;
}

export const login = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.session || !data.user) throw new Error("Login failed. No session returned.");

  const user: User = {
    id: data.user.id,
    email: data.user.email || "",
    name: data.user.user_metadata?.full_name || data.user.email || "Anonymous",
    avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${email}`,
    team: data.user.user_metadata?.team || "SmartFlow",
  };

  return user;
};

export const logout = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;

  return {
    id: session.user.id,
    email: session.user.email || "",
    name: session.user.user_metadata?.full_name || session.user.email || "Anonymous",
    avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${session.user.email}`,
    team: session.user.user_metadata?.team || "SmartFlow",
  };
};