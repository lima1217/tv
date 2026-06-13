'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  const pathname = usePathname();
  const showSearchButton = pathname !== '/';

  return (
    <header className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm dark:bg-gray-900/70 dark:border-gray-700/50'>
      <div className='h-12 flex items-center justify-between px-4'>
        <div className='flex items-center gap-2'>
          {showSearchButton && (
            <Link
              href='/search'
              aria-label='搜索'
              className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-[background-color,transform] active:scale-95 hover:bg-gray-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-300 dark:hover:bg-gray-700/50'
            >
              <Search className='h-5 w-5' />
            </Link>
          )}
          {showBackButton && <BackButton />}
        </div>

        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-2xl font-bold text-green-600 tracking-tight hover:opacity-80 transition-opacity'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
