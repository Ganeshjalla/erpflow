interface BadgeProps {
  children: React.ReactNode;
  color: "green" | "yellow" | "red" | "gray" | "blue" | "indigo";
}

const colorMap: Record<BadgeProps["color"], string> = {
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
};

export function Badge({ children, color }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colorMap[color]}`}
    >
      {children}
    </span>
  );
}

export function statusColor(status: string): BadgeProps["color"] {
  switch (status) {
    case "ACTIVE":
    case "CONFIRMED":
    case "IN_STOCK":
      return "green";
    case "LEAD":
    case "DRAFT":
    case "LOW_STOCK":
      return "yellow";
    case "INACTIVE":
    case "CANCELLED":
    case "OUT_OF_STOCK":
      return "red";
    default:
      return "gray";
  }
}
