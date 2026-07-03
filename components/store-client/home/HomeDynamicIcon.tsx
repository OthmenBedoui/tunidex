import React from 'react';
import * as LucideIcons from 'lucide-react';

interface HomeDynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

const HomeDynamicIcon: React.FC<HomeDynamicIconProps> = ({ name, className, size = 24 }) => {
  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> =
    LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
  const IconComponent = icons[name] || icons[name.trim()] || icons.Package;
  return <IconComponent size={size} className={className} />;
};

export default HomeDynamicIcon;
