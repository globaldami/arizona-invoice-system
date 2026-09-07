'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

type ScrollToTopButtonProps = {
  /**
   * Additional/override classes for the button position.
   * Defaults to bottom-right, above mobile nav.
   */
  className?: string;
};

export default function ScrollToTopButton({
  className = 'fixed bottom-24 right-5 z-30 lg:bottom-6',
}: ScrollToTopButtonProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100;

      setShowScrollTop(scrolledToBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!showScrollTop) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 ${className}`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
