import React from 'react';
import * as LucideIcons from 'lucide-react';

interface StoreDynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

const StoreDynamicIcon: React.FC<StoreDynamicIconProps> = ({ name, size = 16, className }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> =
    LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[name] || icons[name.trim()] || icons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

export default StoreDynamicIcon;
