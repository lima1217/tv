/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#0c111c' : '#f9fbfe';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#0c111c' : '#f9fbfe');
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听主题变化和路由变化，确保主题色始终同步
  useEffect(() => {
    if (mounted) {
      setThemeColor(resolvedTheme);
    }
  }, [mounted, resolvedTheme, pathname]);

  if (!mounted) {
    return <div className='h-10 w-10' />;
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    const targetTheme = isDark ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (prefersReducedMotion || !(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(targetTheme);
    });
  };

  return (
    <button
      type='button'
      onClick={toggleTheme}
      className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] hover:bg-gray-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-300 dark:hover:bg-gray-700/50'
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      <AnimatePresence initial={false} mode='popLayout'>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }
          }
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, filter: 'blur(0px)' }
          }
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', duration: 0.3, bounce: 0 }
          }
          className='flex items-center justify-center'
        >
          {isDark ? (
            <Sun className='h-5 w-5' aria-hidden='true' />
          ) : (
            <Moon className='h-5 w-5' aria-hidden='true' />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
