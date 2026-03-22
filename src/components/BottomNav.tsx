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

  if (location.pathname.startsWith('/booking') || location.pathname === '/register' || location.pathname === '/feedback') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50">
      <div className="flex items-stretch max-w-md mx-auto h-20 px-2 pb-safe">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.to ||
            (tab.to !== '/' && location.pathname.startsWith(tab.to));

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1"
            >
              {isActive && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                  <motion.div
                    layoutId="nav-indicator"
                    className="h-[3px] w-10 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                </div>
              )}
              <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-accent' : ''}`}>
                <tab.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
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
