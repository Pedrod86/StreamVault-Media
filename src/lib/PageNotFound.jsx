import { useLocation } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
          <Film className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-heading font-bold text-muted-foreground/30">404</h1>
        <div>
          <h2 className="text-xl font-heading font-semibold text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground text-sm mt-2">
            The page "{pageName}" doesn't exist.
          </p>
        </div>
        <Button onClick={() => window.location.href = '/'} className="bg-primary hover:bg-primary/90 rounded-xl">
          Go Home
        </Button>
      </div>
    </div>
  );
}