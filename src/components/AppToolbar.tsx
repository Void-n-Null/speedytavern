import { Settings, Users, Wand2, Plug, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { useIsMobile } from '../hooks/useIsMobile';
import { useHeaderConfig, useLayoutConfig } from '../hooks/queries/useProfiles';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PromptEngineeringModal } from './prompt-engineering/PromptEngineeringModal';
import { AiDashboard } from './ai/AiDashboard';
import { cn } from '../lib/utils';

interface AppToolbarProps {
  onOpenSettings: () => void;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function withOpacity(color: string, opacityPct: number): string {
  const o = clamp(opacityPct, 0, 100) / 100;
  const c = (color ?? '').trim();
  if (!c) return `rgba(0,0,0,${o})`;
  if (c === 'transparent') return 'transparent';

  // rgba()/rgb()
  const rgbMatch = c.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const r = clamp(Number(rgbMatch[1]), 0, 255);
    const g = clamp(Number(rgbMatch[2]), 0, 255);
    const b = clamp(Number(rgbMatch[3]), 0, 255);
    return `rgba(${r}, ${g}, ${b}, ${o})`;
  }

  // #rgb / #rrggbb
  const hexMatch = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1].toLowerCase();
    const full = hex.length === 3 ? hex.split('').map((ch) => ch + ch).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${o})`;
  }

  // Fallback: return as-is (can't safely apply opacity)
  return c;
}

export function AppToolbar({ onOpenSettings }: AppToolbarProps) {
  const isMobile = useIsMobile();
  const layout = useLayoutConfig();
  const header = useHeaderConfig();
  const location = useLocation();
  const [isPromptEngineeringOpen, setIsPromptEngineeringOpen] = useState(false);
  const [isAiProvidersOpen, setIsAiProvidersOpen] = useState(false);

  // Determine if we're in a chat page (show back button)
  const isInChat = location.pathname.startsWith('/chats/');

  const toolbarStyle: React.CSSProperties = useMemo(() => ({
    width: isMobile || header.widthMode === 'full' ? '100%' : `${layout.containerWidth + 5}%`,
    margin: isMobile || header.widthMode === 'full' ? undefined : '0 auto',
    // Ensure header (and its box-shadow) paints above the message list below.
    // Without this, the next sibling's background can visually "cover" the shadow area.
    position: 'relative',
    zIndex: 20,
  }), [header.widthMode, isMobile, layout.containerWidth]);

  const innerStyle: React.CSSProperties = useMemo(() => {
    // Side borders only show when: border toggle is ON, rounded mode is ON, and chat-width mode (not full-width)
    const showEdgeBorders = header.borderBottom && header.roundedBottom && header.widthMode === 'match-chat' && !isMobile;
    const borderColor = withOpacity(header.borderColor, header.borderOpacity);
    const shadowColor = withOpacity(header.shadowColor, header.shadowOpacity);
    const boxShadow =
      header.shadowEnabled
        ? `${header.shadowOffsetXPx}px ${header.shadowOffsetYPx}px ${header.shadowBlurPx}px ${header.shadowSpreadPx}px ${shadowColor}`
        : 'none';

    return {
      height: header.heightPx,
      paddingLeft: header.paddingX,
      paddingRight: header.paddingX,
      backgroundColor: withOpacity(header.backgroundColor, header.backgroundOpacity),
      backdropFilter: header.backdropBlurPx > 0 ? `blur(${header.backdropBlurPx}px)` : undefined,
      borderBottomStyle: header.borderBottom ? 'solid' : 'none',
      borderBottomWidth: header.borderBottom ? header.borderWidthPx : 0,
      borderBottomColor: header.borderBottom ? borderColor : undefined,
      borderBottomLeftRadius: header.roundedBottom ? header.radiusPx : 0,
      borderBottomRightRadius: header.roundedBottom ? header.radiusPx : 0,
      // Edge borders for rounded + chat-width mode (card-like appearance)
      borderLeftStyle: showEdgeBorders ? 'solid' : 'none',
      borderLeftWidth: showEdgeBorders ? header.borderWidthPx : 0,
      borderLeftColor: showEdgeBorders ? borderColor : undefined,
      borderRightStyle: showEdgeBorders ? 'solid' : 'none',
      borderRightWidth: showEdgeBorders ? header.borderWidthPx : 0,
      borderRightColor: showEdgeBorders ? borderColor : undefined,
      boxShadow,
    };
  }, [
    header.backgroundColor,
    header.backgroundOpacity,
    header.backdropBlurPx,
    header.borderBottom,
    header.borderColor,
    header.borderOpacity,
    header.borderWidthPx,
    header.heightPx,
    header.paddingX,
    header.radiusPx,
    header.roundedBottom,
    header.shadowBlurPx,
    header.shadowColor,
    header.shadowEnabled,
    header.shadowOffsetXPx,
    header.shadowOffsetYPx,
    header.shadowOpacity,
    header.shadowSpreadPx,
    header.widthMode,
    isMobile,
  ]);

  const buttonStyle: React.CSSProperties = useMemo(() => ({
    paddingLeft: header.buttonPaddingX,
    paddingRight: header.buttonPaddingX,
    paddingTop: header.buttonPaddingY,
    paddingBottom: header.buttonPaddingY,
    backgroundColor: header.buttonUseTransparentBackground ? 'transparent' : undefined,
    fontSize: header.buttonLabelSizePx,
    height: 'auto',
    width: 'auto',
    minWidth: 0,
  }), [
    header.buttonPaddingX,
    header.buttonPaddingY,
    header.buttonUseTransparentBackground,
    header.buttonLabelSizePx
  ]);

  const headerContent = (
    <div
      className={cn(
        "flex items-center gap-3",
        header.layoutAlignment === 'center' ? "justify-center" : "justify-between"
      )}
      style={innerStyle}
    >
      <div className={cn(
        "flex min-w-0 items-center gap-3 h-full",
        header.layoutAlignment === 'center' && "shrink-0"
      )}>
        {header.showLogo ? (
          <img
            src={header.logoUrl || '/logo.png'}
            alt={header.titleText || 'TavernStudio'}
            className="shrink-0 object-contain"
            style={{ height: header.logoHeightPx, maxWidth: header.logoMaxWidthPx, width: 'auto' }}
          />
        ) : null}
        {header.showTitle ? (
          <div
            className="truncate font-semibold"
            style={{ color: header.titleColor, fontSize: header.titleSizePx }}
          >
            {header.titleText}
          </div>
        ) : null}
      </div>

      <div className={cn(
        "flex items-center gap-2",
        header.layoutAlignment === 'center' && "shrink-0"
      )}>
        {isInChat && (
          <Link to="/">
            <Button
              variant={header.settingsButtonVariant}
              className="shrink-0 flex items-center gap-2"
              style={buttonStyle}
              aria-label="Back to Chats"
            >
              {header.buttonShowIcon && <MessageSquare className="h-5 w-5" />}
              {header.buttonShowLabel && <span>Chats</span>}
            </Button>
          </Link>
        )}
        <Link to="/forge">
          <Button
            variant={header.settingsButtonVariant}
            className="shrink-0 flex items-center gap-2"
            style={buttonStyle}
            aria-label="Character Forge"
          >
            {header.buttonShowIcon && <Users className="h-5 w-5" />}
            {header.buttonShowLabel && <span>Forge</span>}
          </Button>
        </Link>
        <Button
          onClick={() => setIsAiProvidersOpen(true)}
          variant={header.settingsButtonVariant}
          className="shrink-0 flex items-center gap-2"
          style={buttonStyle}
          aria-label="AI Providers"
        >
          {header.buttonShowIcon && <Plug className="h-5 w-5" />}
          {header.buttonShowLabel && <span>AI</span>}
        </Button>
        <Button
          onClick={() => setIsPromptEngineeringOpen(true)}
          variant={header.settingsButtonVariant}
          className="shrink-0 flex items-center gap-2"
          style={buttonStyle}
          aria-label="Prompt engineering"
        >
          {header.buttonShowIcon && <Wand2 className="h-5 w-5" />}
          {header.buttonShowLabel && <span>Prompt</span>}
        </Button>
        <Button
          onClick={onOpenSettings}
          variant={header.settingsButtonVariant}
          className="shrink-0 flex items-center gap-2"
          style={buttonStyle}
          aria-label="Open settings"
        >
          {header.buttonShowIcon && <Settings className="h-5 w-5" />}
          {header.buttonShowLabel && <span>Settings</span>}
        </Button>
      </div>
    </div>
  );

  // Hover-reveal only makes sense on desktop; mobile has no hover.
  const hoverRevealEnabled = header.displayMode === 'hover-reveal' && !isMobile;

  // Track pointer Y while hover-reveal is enabled, throttled to once per frame.
  const [pointerY, setPointerY] = useState<number | null>(null);
  const pendingYRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hoverRevealEnabled) {
      setPointerY(null);
      return;
    }

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;

    const cancel =
      typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id: number) => clearTimeout(id);

    const onMove = (e: MouseEvent) => {
      pendingYRef.current = e.clientY;
      if (rafRef.current != null) return;
      rafRef.current = schedule(() => {
        rafRef.current = null;
        const next = pendingYRef.current;
        pendingYRef.current = null;
        if (next == null) return;
        setPointerY(next);
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current != null) cancel(rafRef.current);
      rafRef.current = null;
      pendingYRef.current = null;
    };
  }, [hoverRevealEnabled]);

  // Sticky open: once revealed, keep open until cursor is below header height.
  const [isOpenSticky, setIsOpenSticky] = useState(false);

  useEffect(() => {
    if (!hoverRevealEnabled) {
      setIsOpenSticky(false);
      return;
    }
    if (!isOpenSticky) return;
    if (pointerY == null) return;
    if (pointerY > header.hoverRevealZoneHeightPx) {
      setIsOpenSticky(false);
    }
  }, [header.hoverRevealZoneHeightPx, hoverRevealEnabled, isOpenSticky, pointerY]);

  const zoneHeight = Math.max(4, header.hoverRevealZoneHeightPx || 10);
  const showTab = hoverRevealEnabled && !isOpenSticky && pointerY != null && pointerY <= zoneHeight;
  const isOpen = hoverRevealEnabled && isOpenSticky;

  if (!hoverRevealEnabled) {
    return (
      <>
        <header className="shrink-0" style={toolbarStyle}>
          {headerContent}
        </header>
        <AiDashboard open={isAiProvidersOpen} onOpenChange={setIsAiProvidersOpen} />
        <PromptEngineeringModal open={isPromptEngineeringOpen} onOpenChange={setIsPromptEngineeringOpen} />
      </>
    );
  }

  const hiddenOffset = -(header.heightPx + 8);

  return (
    <>
      {/* Don't take up layout space when the header is floating */}
      <div className="shrink-0" style={{ height: 0 }} />

      {/* Hover sensor strip + tab (fixed) */}
      <div className="fixed left-0 right-0 top-0 z-50" style={{ pointerEvents: 'none' }}>
        <div
          className="relative"
          style={{ height: zoneHeight, pointerEvents: 'none' }}
        >
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{
              transform: 'translateX(-50%)',
              opacity: showTab ? 1 : 0,
              pointerEvents: showTab ? 'auto' : 'none',
              transition: 'opacity 120ms ease',
            }}
            onMouseEnter={() => setIsOpenSticky(true)}
          >
            <div
              className="mt-1 rounded-b-md border border-zinc-800 bg-zinc-950/90 px-3 py-1 text-zinc-300 shadow"
              style={{ fontSize: header.hoverTabFontSizePx || 11 }}
            >
              {header.hoverTabText || 'Settings'}
            </div>
          </div>
        </div>
      </div>

      {/* Floating header bar (slides in/out) */}
      <div className="fixed left-0 right-0 top-0 z-50" style={{ pointerEvents: 'none' }}>
        <header
          className="shrink-0"
          style={{
            ...toolbarStyle,
            pointerEvents: 'auto',
            transform: `translateY(${isOpen ? 0 : hiddenOffset}px)`,
            transition: 'transform 160ms ease',
          }}
          onMouseEnter={() => setIsOpenSticky(true)}
        >
          {headerContent}
        </header>
      </div>

      <AiDashboard open={isAiProvidersOpen} onOpenChange={setIsAiProvidersOpen} />
      <PromptEngineeringModal open={isPromptEngineeringOpen} onOpenChange={setIsPromptEngineeringOpen} />
    </>
  );
}
