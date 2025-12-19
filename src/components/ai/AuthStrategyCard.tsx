import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { toast } from '../ui/toast';
import { aiProviders } from '../../api/ai';
import type { SecretDraftKey } from './useAiProvidersModalController';

interface AuthStrategyCardProps {
  providerId: string;
  strategy: {
    id: string;
    label: string;
    type: string;
    configured: boolean;
    requiredKeys: string[];
    presentKeys: string[];
  };
  secretDrafts: Record<SecretDraftKey, string>;
  setSecretDrafts: React.Dispatch<React.SetStateAction<Record<SecretDraftKey, string>>>;
  onConnect: (authStrategyId: string) => void;
  onDisconnect: () => void;
  onSaveSecrets: (authStrategyId: string, secrets: Record<string, string>) => void;
  isConnectPending: boolean;
  isDisconnectPending: boolean;
  isSaveSecretsPending: boolean;
}

export function AuthStrategyCard({
  providerId,
  strategy,
  secretDrafts,
  setSecretDrafts,
  onConnect,
  onDisconnect,
  onSaveSecrets,
  isConnectPending,
  isDisconnectPending,
  isSaveSecretsPending,
}: AuthStrategyCardProps) {
  const handleSave = () => {
    const secrets: Record<string, string> = {};
    for (const k of strategy.requiredKeys) {
      const dk: SecretDraftKey = `${providerId}:${strategy.id}:${k}`;
      const v = (secretDrafts[dk] ?? '').trim();
      if (v) secrets[k] = v;
    }
    if (Object.keys(secrets).length === 0) {
      toast.warning('No secrets entered');
      return;
    }
    onSaveSecrets(strategy.id, secrets);
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-100">
          {strategy.label} <span className="text-[10px] text-zinc-500">({strategy.type})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-zinc-400">{strategy.configured ? 'configured' : 'not configured'}</div>
          {providerId === 'openrouter' && strategy.type === 'pkce' ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[10px]"
              onClick={async () => {
                try {
                  const returnUrl = window.location.origin;
                  const { authUrl } = await aiProviders.startOpenRouterPkce(returnUrl);
                  window.location.href = authUrl;
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : String(e));
                }
              }}
            >
              Start PKCE
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            disabled={!strategy.configured || isConnectPending}
            onClick={() => onConnect(strategy.id)}
          >
            Connect
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            disabled={isDisconnectPending}
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {strategy.requiredKeys.map((k) => {
          const draftKey: SecretDraftKey = `${providerId}:${strategy.id}:${k}`;
          return (
            <div key={k} className="col-span-2">
              <Label className="text-[11px] text-zinc-300">
                {k}{' '}
                {strategy.presentKeys.includes(k) ? (
                  <span className="text-[10px] text-emerald-400">(present)</span>
                ) : (
                  <span className="text-[10px] text-zinc-500">(missing)</span>
                )}
              </Label>
              <Input
                className="h-8 text-xs"
                type="password"
                value={secretDrafts[draftKey] ?? ''}
                placeholder={k}
                onChange={(e) =>
                  setSecretDrafts((prev) => ({
                    ...prev,
                    [draftKey]: e.target.value,
                  }))
                }
              />
            </div>
          );
        })}

        <div className="col-span-2 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-[10px]"
            disabled={isSaveSecretsPending}
            onClick={handleSave}
          >
            Save secrets
          </Button>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-zinc-500">
        Secrets are stored encrypted in SQLite. Provide `TAVERN_MASTER_KEY_B64` in production.
      </div>
    </div>
  );
}

