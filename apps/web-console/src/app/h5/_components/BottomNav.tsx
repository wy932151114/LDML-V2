'use client';

import { usePathname } from 'next/navigation';
import { Compass, Wind, Sun, MessageCircle, TrendingUp, Scan, History } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/h5/fortune', icon: Sun, label: '今日运势' },
  { href: '/h5/wuxing', icon: Wind, label: '五行能量' },
  { href: '/h5/jiugong', icon: Compass, label: '九宫飞星' },
  { href: '/h5/cv-scan', icon: Scan, label: '空间扫描' },
  { href: '/h5/ai', icon: MessageCircle, label: 'AI改命' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0e17]/95 backdrop-blur-lg border-t border-[#1e293b]">
      <div className="flex max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 transition-all ${
                isActive ? 'text-[#f59e0b]' : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <Icon size={20} className={isActive ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : ''} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
