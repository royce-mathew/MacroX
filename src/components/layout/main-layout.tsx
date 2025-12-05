import React, { useState } from "react";
import {
  Circle,
  Settings,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ViewType = "recording" | "macros" | "settings";

interface MainLayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentView,
  onViewChange,
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: "recording" as ViewType, label: "Record", icon: Circle },
    { id: "macros" as ViewType, label: "Macros", icon: List },
    { id: "settings" as ViewType, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={cn(
          "border-r bg-card flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-6 border-b flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-2xl font-bold">MacroX</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Macro Recorder
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <li key={item.id}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3",
                      isCollapsed && "justify-center px-2"
                    )}
                    onClick={() => onViewChange(item.id)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        {!isCollapsed && (
          <>
            <Separator />
            <div className="p-4 text-xs text-muted-foreground">
              <p>Version 0.1.0</p>
              <p className="mt-1">Free & Open Source</p>
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
};
