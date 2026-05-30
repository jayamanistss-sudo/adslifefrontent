import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Utensils, Shirt, Smartphone, Sparkles, Plane, Film,
  ShoppingCart, ShoppingBag, Heart, Dumbbell, Tag, Package,
  Star, Coffee, Pizza, Car, Home, Briefcase, Music, BookOpen,
  Camera, Scissors, Gem, Gift, Globe, Leaf, Monitor, Tv,
  Watch, Wine, Baby, Bike, Dog, Flower2, Gamepad2, Hammer,
  Headphones, Hotel, Laptop, Paintbrush, Pill, Stethoscope,
  Ticket, Truck, Umbrella, Wallet, Wrench, Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  utensils:        Utensils,
  shirt:           Shirt,
  smartphone:      Smartphone,
  sparkles:        Sparkles,
  plane:           Plane,
  film:            Film,
  'shopping-cart': ShoppingCart,
  'shopping-bag':  ShoppingBag,
  heart:           Heart,
  dumbbell:        Dumbbell,
  tag:             Tag,
  package:         Package,
  star:            Star,
  coffee:          Coffee,
  pizza:           Pizza,
  car:             Car,
  home:            Home,
  briefcase:       Briefcase,
  music:           Music,
  book:            BookOpen,
  'book-open':     BookOpen,
  camera:          Camera,
  scissors:        Scissors,
  gem:             Gem,
  gift:            Gift,
  globe:           Globe,
  leaf:            Leaf,
  monitor:         Monitor,
  tv:              Tv,
  watch:           Watch,
  wine:            Wine,
  baby:            Baby,
  bike:            Bike,
  dog:             Dog,
  flower:          Flower2,
  gamepad:         Gamepad2,
  hammer:          Hammer,
  headphones:      Headphones,
  hotel:           Hotel,
  laptop:          Laptop,
  paintbrush:      Paintbrush,
  pill:            Pill,
  stethoscope:     Stethoscope,
  ticket:          Ticket,
  truck:           Truck,
  umbrella:        Umbrella,
  wallet:          Wallet,
  wrench:          Wrench,
  zap:             Zap,
};

interface Props extends LucideProps {
  name: string;
}

export default function CategoryIcon({ name, ...props }: Props) {
  const Icon = ICON_MAP[name?.toLowerCase()] ?? Tag;
  return <Icon {...props} />;
}
