
import { AppLogo } from "@/components/app-logo";

export default function AuthLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <AppLogo className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">StaffDesk</h1>
            <p className="text-muted-foreground">Divisional Secretariat Kalmunai</p>
        </div>
        {children}
      </div>
    );
  }
