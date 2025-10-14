// "use client";

// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// export interface UserCursor {
//   id: string;
//   name: string;
//   color: string;
//   x: number;
//   y: number;
//   image?: string;
// }

// interface RealtimeCursorsProps {
//   users: UserCursor[];
// }

// export default function RealtimeCursors({ users }: RealtimeCursorsProps) {
//   return (
//     <div className="absolute inset-0 pointer-events-none">
//       {users.map((user) => (
//         <div
//           key={user.id}
//           className="absolute flex flex-col items-center"
//           style={{
//             transform: `translate(${user.x}px, ${user.y}px)`,
//           }}
//         >
//           <div
//             className="w-2 h-2 rounded-full"
//             style={{ backgroundColor: user.color }}
//           />
//           <div className="mt-1">
//             <Avatar className="w-6 h-6 ring-2 ring-white shadow-sm">
//               {user.image ? (
//                 <AvatarImage src={user.image} />
//               ) : (
//                 <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-semibold">
//                   {user.name
//                     .split(" ")
//                     .map((n) => n[0])
//                     .join("")
//                     .toUpperCase()}
//                 </AvatarFallback>
//               )}
//             </Avatar>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }
