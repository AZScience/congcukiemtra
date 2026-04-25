
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  icon?: LucideIcon;
};

export default function PageHeader({ title, description, className, icon: Icon }: PageHeaderProps) {
  return (
    <div className={cn("px-4 pt-6 sm:px-6", className)}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-7 w-7 text-primary" />}
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">{title}</h1>
      </div>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
    </div>
  );
}
