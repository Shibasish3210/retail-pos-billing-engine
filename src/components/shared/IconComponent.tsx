import React from 'react';
import { 
  Plus, Coffee, Zap, Box, Wind, Container, Cake, Wheat, Utensils, Flame, Cookie 
} from 'lucide-react';

interface IconComponentProps {
  name?: string;
  size?: number;
  className?: string;
}

export const IconComponent: React.FC<IconComponentProps> = ({ name, size = 24, className }) => {
  switch (name) {
    case 'Coffee': return <Coffee size={size} className={className} />;
    case 'Zap': return <Zap size={size} className={className} />;
    case 'Box': return <Box size={size} className={className} />;
    case 'Wind': return <Wind size={size} className={className} />;
    case 'Container': return <Container size={size} className={className} />;
    case 'Cake': return <Cake size={size} className={className} />;
    case 'Wheat': return <Wheat size={size} className={className} />;
    case 'Utensils': return <Utensils size={size} className={className} />;
    case 'Flame': return <Flame size={size} className={className} />;
    case 'Cookie': return <Cookie size={size} className={className} />;
    default: return <Plus size={size} className={className} />;
  }
};
