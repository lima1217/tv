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
    <header className='md:hidden fixed top-0 left-0 right-0 z-[999] w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80'>
      <div className='flex h-12 items-center justify-between px-4'>
        <div className='flex items-center gap-1'>
          {showSearchButton && (
            <Link
              href='/search'
              aria-label='搜索'
              className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] hover:bg-gray-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-300 dark:hover:bg-gray-700/50'
            >
              <Search className='h-5 w-5' />
            </Link>
          )}
          {showBackButton && <BackButton />}
        </div>

        <div className='flex items-center gap-1'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='text-xl font-bold tracking-tight text-green-600 transition-opacity duration-150 hover:opacity-80'
        >
          {siteName}
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
