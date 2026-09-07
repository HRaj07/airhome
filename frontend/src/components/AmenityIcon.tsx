import {
  Wifi,
  UtensilsCrossed,
  ParkingCircle,
  Snowflake,
  Flame,
  WashingMachine,
  Tv,
  Laptop,
  PawPrint,
  Waves,
  Dumbbell,
  Coffee,
  Zap,
  CheckCircle,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  wifi: Wifi,
  kitchen: UtensilsCrossed,
  parking: ParkingCircle,
  ac: Snowflake,
  heating: Flame,
  washer: WashingMachine,
  dryer: WashingMachine,
  tv: Tv,
  workspace: Laptop,
  pets: PawPrint,
  "hot-tub": Waves,
  pool: Waves,
  gym: Dumbbell,
  breakfast: Coffee,
  fireplace: Flame,
  "ev-charger": Zap,
};

export default function AmenityIcon({ icon, size = 22, className = "" }: { icon: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[icon] || CheckCircle;
  return <Icon size={size} className={className} strokeWidth={1.5} />;
}
