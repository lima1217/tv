import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      type='button'
      onClick={() => window.history.back()}
      className='flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] hover:bg-gray-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 dark:text-gray-300 dark:hover:bg-gray-700/50'
      aria-label='返回'
    >
      <ArrowLeft className='h-5 w-5' aria-hidden='true' />
    </button>
  );
}
