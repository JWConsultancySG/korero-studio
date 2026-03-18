import { NavLink, useLocation } from 'react-router-dom';
import { Home, Music, BookOpen, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/groups', icon: Music, label: 'Groups' },
  { to: '/my-classes', icon: BookOpen, label: 'Classes' },
  { to: '/admin', icon: Settings, label: 'Admin' },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide nav on booking flow
  if (location.pathname.startsWith('/booking')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around max-w-md mx-auto h-16 px-2">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(tab.to));

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center gap-0.5 py-1 px-3 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gradient-purple"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
