// "use client";

// interface SvgGridProps {
//   width: number;
//   height: number;
//   gridSize: number;
//   strokeColor?: string;
//   strokeWidth?: number;
// }

// export default function SvgGrid({
//   width,
//   height,
//   gridSize,
//   strokeColor = "rgba(0,0,0,0.06)",
//   strokeWidth = 1,
// }: SvgGridProps) {
//   const verticalLines = [];
//   for (let x = 0; x <= width; x += gridSize) {
//     verticalLines.push(
//       <line
//         key={`v-${x}`}
//         x1={x}
//         y1={0}
//         x2={x}
//         y2={height}
//         stroke={strokeColor}
//         strokeWidth={strokeWidth}
//       />
//     );
//   }

//   const horizontalLines = [];
//   for (let y = 0; y <= height; y += gridSize) {
//     horizontalLines.push(
//       <line
//         key={`h-${y}`}
//         x1={0}
//         y1={y}
//         x2={width}
//         y2={y}
//         stroke={strokeColor}
//         strokeWidth={strokeWidth}
//       />
//     );
//   }

//   return (
//     <svg
//       width={width}
//       height={height}
//       style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
//     >
//       <g>{verticalLines}</g>
//       <g>{horizontalLines}</g>
//     </svg>
//   );
// }
