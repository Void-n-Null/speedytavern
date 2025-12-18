import { useIsMobile } from '../../../hooks/useIsMobile';

interface ControlRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  inline?: boolean;
  isMobile?: boolean;
}

export function ControlRow({ label, description, children, inline = true, isMobile }: ControlRowProps) {
  const computedIsMobile = isMobile ?? useIsMobile();
  
  // Stacked layout: label on top, control below
  if (!inline || computedIsMobile) {
    return (
      <div className="space-y-2 py-2.5 first:pt-0 last:pb-0">
        <div>
          <div className="text-sm font-medium text-zinc-200">{label}</div>
          {description && <div className="text-xs text-zinc-500">{description}</div>}
        </div>
        {children}
      </div>
    );
  }
  
  // Inline layout: label left, control right (desktop only)
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-sm text-zinc-300">{label}</div>
        {description && <div className="text-xs text-zinc-500 mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

