'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
  },
  {
    name: 'Activity',
    href: '/audit-log',
    icon: Activity,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: ShieldCheck,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:hidden">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <nav
          className="grid w-full grid-cols-7 items-center px-2 py-2"
          aria-label="Mobile navigation"
        >
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1',
                  'transition-all duration-200',
                  active
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')}
              >
                <Icon
                  className={[
                    'h-4.25 w-4.25 shrink-0',
                    'transition-transform duration-200',
                    !active ? 'group-hover:-translate-y-0.5' : '',
                  ].join(' ')}
                  strokeWidth={active ? 2.2 : 1.9}
                />

                <span
                  className={[
                    'w-full truncate text-center text-[9px] leading-none',
                    active ? 'font-semibold' : 'font-medium',
                  ].join(' ')}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
