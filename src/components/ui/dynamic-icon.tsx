import { 
  PenTool, 
  BarChart3, 
  MessageSquare, 
  GraduationCap, 
  Calendar, 
  ShoppingCart, 
  Code, 
  FileText,
  Sparkles,
  Languages,
  Briefcase,
  Users,
  Heart,
  Star,
  Zap,
  Brain,
  Lightbulb,
  Target,
  Rocket,
  Shield,
  Globe,
  Mail,
  Phone,
  Camera,
  Music,
  Video,
  Image,
  Search,
  Settings,
  Home,
  Bookmark,
  Clock,
  TrendingUp,
  DollarSign,
  CreditCard,
  Package,
  Truck,
  MapPin,
  Bell,
  Lock,
  Key,
  Cpu,
  Database,
  Server,
  Cloud,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Headphones,
  Mic,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  "pen-tool": PenTool,
  "bar-chart-3": BarChart3,
  "message-square": MessageSquare,
  "graduation-cap": GraduationCap,
  calendar: Calendar,
  "shopping-cart": ShoppingCart,
  code: Code,
  "file-text": FileText,
  sparkles: Sparkles,
  languages: Languages,
  briefcase: Briefcase,
  users: Users,
  heart: Heart,
  star: Star,
  zap: Zap,
  brain: Brain,
  lightbulb: Lightbulb,
  target: Target,
  rocket: Rocket,
  shield: Shield,
  globe: Globe,
  mail: Mail,
  phone: Phone,
  camera: Camera,
  music: Music,
  video: Video,
  image: Image,
  search: Search,
  settings: Settings,
  home: Home,
  bookmark: Bookmark,
  clock: Clock,
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  "credit-card": CreditCard,
  package: Package,
  truck: Truck,
  "map-pin": MapPin,
  bell: Bell,
  lock: Lock,
  key: Key,
  cpu: Cpu,
  database: Database,
  server: Server,
  cloud: Cloud,
  wifi: Wifi,
  monitor: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  headphones: Headphones,
  mic: Mic,
};

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function DynamicIcon({ name, className, size }: DynamicIconProps) {
  const normalizedName = name.toLowerCase().replace(/_/g, "-");
  const Icon = iconMap[normalizedName] || Sparkles;
  
  return (
    <Icon 
      className={cn("h-5 w-5", className)} 
      size={size}
    />
  );
}

// Export icon names for reference
export const availableIcons = Object.keys(iconMap);
