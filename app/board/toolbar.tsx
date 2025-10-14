// "use client";

// import { useState } from "react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Button } from "@/components/ui/button";
// import { Pen, Highlighter, Eraser } from "lucide-react";

// export default function Toolbar() {
//   const [tool, setTool] = useState<string>("pen");

//   return (
//     <div className="flex items-center gap-2 p-4">
//       <DropdownMenu>
//         <DropdownMenuTrigger asChild>
//           <Button variant="outline" size="icon" className="rounded-full">
//             {tool === "pen" && <Pen className="h-5 w-5" />}
//             {tool === "marker" && <Highlighter className="h-5 w-5" />}
//             {tool === "eraser" && <Eraser className="h-5 w-5" />}
//           </Button>
//         </DropdownMenuTrigger>

//         <DropdownMenuContent className="w-36">
//           <DropdownMenuItem onClick={() => setTool("pen")}>
//             <Pen className="mr-2 h-4 w-4" /> Pen
//           </DropdownMenuItem>
//           <DropdownMenuItem onClick={() => setTool("marker")}>
//             <Highlighter className="mr-2 h-4 w-4" /> Marker
//           </DropdownMenuItem>
//           <DropdownMenuItem onClick={() => setTool("eraser")}>
//             <Eraser className="mr-2 h-4 w-4" /> Eraser
//           </DropdownMenuItem>
//         </DropdownMenuContent>
//       </DropdownMenu>
//     </div>
//   );
// }
