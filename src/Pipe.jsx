export default function Pipe({ x1, y1, x2, y2 }) {
  const midX = x1 + (x2 - x1) / 2;

  const path = `
    M ${x1} ${y1}
    L ${midX} ${y1}
    L ${midX} ${y2}
    L ${x2} ${y2}
  `;

  return (
    <path
      d={path}
      stroke="black"
      strokeWidth="3"
      fill="none"
    />
  );
}