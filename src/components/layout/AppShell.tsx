import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { PropertiesPanel } from "@/components/layout/PropertiesPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Toolbar } from "@/components/layout/Toolbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStudio } from "@/store/studio";

/**
 * Single-window application shell:
 * sidebar · toolbar · workspace · properties panel · status bar.
 * On narrow screens the sidebar and properties panel become drawers so the
 * workspace keeps full width.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { propertiesOpen, setPropertiesOpen } = useStudio();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setPropertiesOpen(false);
      setNavOpen(false);
    }
  }, [isMobile, setPropertiesOpen]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {!isMobile ? (
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        ) : (
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetContent side="left" className="w-[240px] border-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar collapsed={false} onToggle={() => setNavOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar
            onOpenSettings={() => navigate({ to: "/settings" })}
            onOpenNav={isMobile ? () => setNavOpen(true) : undefined}
          />

          <div className="flex min-h-0 flex-1">
            <main key={pathname} className="animate-page-in min-w-0 flex-1 overflow-y-auto">
              {children}
            </main>
            {propertiesOpen && !isMobile ? <PropertiesPanel /> : null}
          </div>

          {isMobile ? (
            <Sheet open={propertiesOpen} onOpenChange={setPropertiesOpen}>
              <SheetContent side="right" className="w-[300px] border-border bg-sidebar p-0">
                <SheetTitle className="sr-only">Properties</SheetTitle>
                <PropertiesPanel className="w-full border-l-0" />
              </SheetContent>
            </Sheet>
          ) : null}

          <StatusBar />
        </div>
      </div>
    </TooltipProvider>
  );
}

export function Workspace({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 p-4 ${className ?? ""}`}>{children}</div>;
}
