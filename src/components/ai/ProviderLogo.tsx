import { cn } from '../../lib/utils';
import { type AiProviderUiMetadata } from '../../api/ai';
import { useProviderUi } from '../../hooks/queries/aiProviders';

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '/provider/openai.svg',
  anthropic: '/provider/anthropic.svg',
  google: '/provider/google.svg',
  xai: '/provider/xai.svg',
  'x-ai': '/provider/xai.svg',
  lmstudio: '/provider/lmstudio.svg',
  ollama: '/provider/ollama.svg',
  openrouter: '/provider/openrouter.svg',
};

function getProviderLogo(provider: string, ui?: AiProviderUiMetadata): string {
  if (ui?.logoUrl) return ui.logoUrl;
  
  const key = provider.toLowerCase();
  for (const [p, logo] of Object.entries(PROVIDER_LOGOS)) {
    if (key.includes(p)) return logo;
  }
  return '/provider/openrouter.svg'; // Fallback
}

function getProviderBgStyle(provider: string, ui?: AiProviderUiMetadata): string {
  const styles: Record<string, string> = {
    openai: 'bg-white/10 border-white/20',
    anthropic: 'bg-orange-500/10 border-orange-500/20',
    google: 'bg-blue-500/10 border-blue-500/20',
    openrouter: 'bg-white/10 border-white/20',
    'x-ai': 'bg-zinc-800 border-zinc-700',
    xai: 'bg-zinc-800 border-zinc-700',
    meta: 'bg-indigo-500/10 border-indigo-500/20',
    mistral: 'bg-violet-500/10 border-violet-500/20',
    deepseek: 'bg-cyan-500/10 border-cyan-500/20',
    cohere: 'bg-rose-500/10 border-rose-500/20',
    lmstudio: 'bg-white/10 border-white/20',
    ollama: 'bg-white/10 border-white/20',
  };
  
  if (ui?.theme) {
    const themeStyles: Record<string, string> = {
      violet: 'bg-violet-500/10 border-violet-500/20',
      blue: 'bg-blue-500/10 border-blue-500/20',
      orange: 'bg-orange-500/10 border-orange-500/20',
      cyan: 'bg-cyan-500/10 border-cyan-500/20',
      rose: 'bg-rose-500/10 border-rose-500/20',
      indigo: 'bg-indigo-500/10 border-indigo-500/20',
      zinc: 'bg-zinc-800 border-zinc-700',
      light: 'bg-white/10 border-white/20',
      dark: 'bg-black/40 border-white/10',
    };
    if (themeStyles[ui.theme]) return themeStyles[ui.theme];
  }

  const key = provider.toLowerCase();
  for (const [p, style] of Object.entries(styles)) {
    if (key.includes(p)) return style;
  }
  return 'bg-white/10 border-white/20'; // Default
}

interface ProviderLogoProps {
  provider: string;
  ui?: AiProviderUiMetadata;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  selected?: boolean;
}

export function ProviderLogo({ 
  provider, 
  ui: providedUi,
  size = 'md',
  className,
  selected = false,
}: ProviderLogoProps) {
  const fetchedUi = useProviderUi(provider);
  const ui = providedUi || fetchedUi;
  
  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-11 w-11 p-2',
    lg: 'h-14 w-14 p-2.5',
  };

  const logoUrl = getProviderLogo(provider, ui);
  const providerKey = provider.toLowerCase();
  
  // Define forced colors for the SVG logos
  let forcedColorClass = "bg-white"; // Default for OpenAI/OpenRouter
  
  if (ui?.accentColor) {
    // If it's a hex color, we can't easily use it as a Tailwind class
    // but we can check if it starts with #
    if (ui.accentColor.startsWith('#')) {
      forcedColorClass = ""; // We'll handle via style if needed, or just let it be
    } else {
      forcedColorClass = `bg-${ui.accentColor}`;
    }
  } else {
    if (providerKey.includes('google')) {
      forcedColorClass = "bg-[#4285F4]"; // Google Blue
    } else if (providerKey.includes('anthropic')) {
      forcedColorClass = "bg-[#D97757]"; // Anthropic Orange
    }
  }

  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center border shrink-0 transition-colors',
      sizeClasses[size],
      selected ? 'bg-violet-500/20 border-violet-500/30' : getProviderBgStyle(provider, ui),
      className
    )}>
      <div 
        className={cn("w-full h-full", forcedColorClass)}
        style={{
          backgroundColor: ui?.accentColor?.startsWith('#') ? ui.accentColor : undefined,
          maskImage: `url(${logoUrl})`,
          WebkitMaskImage: `url(${logoUrl})`,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
        }}
      />
    </div>
  );
}


