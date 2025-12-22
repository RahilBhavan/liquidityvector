import { useState, useEffect } from 'react';

type Theme = 'monochrome' | 'amber' | 'green';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('monochrome');

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('lv-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    } else {
      document.body.setAttribute('data-theme', 'monochrome');
    }
  }, []);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('lv-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const cycleTheme = () => {
    const themes: Theme[] = ['monochrome', 'amber', 'green'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    toggleTheme(themes[nextIndex]);
  };

  return { theme, toggleTheme, cycleTheme };
}
