import { memo } from 'react';
import { cn } from '../../lib/utils';
import { interfaceDesignSections } from './designConfigSchema';
import { GroupRenderer } from './GroupRenderer';
import { ProfileSection } from './ProfileSection';

interface SectionContentProps {
  sectionId: string;
  compactMode: boolean;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  section: typeof interfaceDesignSections[number];
  isMobile: boolean;
}

export const SectionContent = memo(function SectionContent({
  sectionId,
  compactMode,
  config,
  onChange,
  section,
  isMobile,
}: SectionContentProps) {
  return (
    <div className={cn(!isMobile && 'max-w-3xl space-y-4', isMobile && 'space-y-3')}>
      <div className={cn(isMobile ? 'mb-4' : 'mb-5')}>
        <h3 className="text-sm font-semibold text-zinc-100">{section.label}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
      </div>

      {sectionId === 'profile' ? (
        <ProfileSection />
      ) : (
        section.groups.map((group, i) => (
          <GroupRenderer
            key={group.title || i}
            group={group}
            config={config}
            onChange={onChange}
            compact={compactMode}
            groupIndex={i}
            sectionId={sectionId}
            isMobile={isMobile}
          />
        ))
      )}
    </div>
  );
});

