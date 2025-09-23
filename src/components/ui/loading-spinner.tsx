import { AppLogo } from '@/components/app-logo';

export function LoadingSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        <AppLogo className="h-8 w-8 animate-spin" />
        <span className="text-lg font-semibold">Loading...</span>
      </div>
    </div>
  );
}