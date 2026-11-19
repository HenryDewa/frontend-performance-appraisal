import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '../theme.tsx';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Button variant="ghost" size="icon" onClick={toggle} data-tour="theme" aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
