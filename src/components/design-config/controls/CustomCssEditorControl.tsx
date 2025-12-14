import { useCallback, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { customCssCheatSheet } from '../customCssCheatSheet';

function validateCss(css: string): { ok: boolean; error?: string } {
  const input = css.trim();
  if (!input) return { ok: true };

  try {
    // Best case: modern browsers
    if (typeof CSSStyleSheet !== 'undefined') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(input);
      return { ok: true };
    }

    // Fallback: attempt to parse via a detached document
    const doc = document.implementation.createHTMLDocument('css-validate');
    const style = doc.createElement('style');
    style.textContent = input;
    doc.head.appendChild(style);

    // Accessing cssRules will throw on parse errors in many browsers.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    style.sheet?.cssRules;

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function CustomCssEditorControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<'editor' | 'selectors' | 'snippets' | 'validate'>('editor');

  const validation = useMemo(() => validateCss(value), [value]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard failures (permissions, etc.)
    }
  }, []);

  const insertAtEnd = useCallback(
    (snippet: string) => {
      const next = value.trim().length === 0 ? snippet.trimStart() : `${value.replace(/\s*$/, '')}\n\n${snippet.trimStart()}`;
      onChange(next);
      setTab('editor');
    },
    [onChange, value]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
        <div className="text-xs text-zinc-400">
          Inline styles are used heavily in the chat UI. If your rule "does nothing", you probably need <span className="text-zinc-200">!important</span>.
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Cheat sheet is maintained manually. If you spot missing selectors, update it here so it doesn’t drift.
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full grid grid-cols-2 gap-1 sm:flex sm:items-center sm:justify-start">
          <TabsTrigger className="w-full justify-center" value="editor">Editor</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="selectors">Selectors</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="snippets">Snippets</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="validate">Validate</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/* Write CSS here */\n\n.message-content {\n  color: #eaeaea !important;\n}\n"
            spellCheck={false}
            disabled={disabled}
            className={cn(
              'w-full min-h-[280px] p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40',
              disabled && 'opacity-60'
            )}
          />
        </TabsContent>

        <TabsContent value="selectors">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
            <div className="text-sm text-zinc-200 font-medium">Chat selectors</div>
            <div className="text-xs text-zinc-500 mt-1">Copy or insert examples. These are the real classnames used in the chat components.</div>

            <div className="mt-3 space-y-2">
              {customCssCheatSheet.map((item) => (
                <div key={item.selector} className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-zinc-100 truncate">{item.selector}</div>
                      <div className="text-xs text-zinc-500 mt-1">{item.description}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(item.selector)} type="button">
                        Copy
                      </Button>
                      {item.example && (
                        <Button size="sm" variant="secondary" onClick={() => insertAtEnd(item.example ?? '')} type="button">
                          Insert
                        </Button>
                      )}
                    </div>
                  </div>

                  {item.example && (
                    <pre className="mt-2 text-[11px] leading-snug text-zinc-300 whitespace-pre-wrap font-mono rounded-md bg-black/30 p-2 border border-zinc-800/50">
                      {item.example}
                    </pre>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              Also useful data attributes:
              <div className="font-mono text-[11px] mt-1 text-zinc-400">.message-item[data-node-id="..."]</div>
              <div className="font-mono text-[11px] text-zinc-400">.message-item[data-hovered="true"]</div>
              <div className="font-mono text-[11px] text-zinc-400">.message-list-wrapper[data-dragging="true"]</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="snippets">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3 space-y-2">
            <div className="text-sm text-zinc-200 font-medium">Common snippets</div>
            <div className="text-xs text-zinc-500">These are biased toward actually overriding inline styles (hence the !important spam).</div>

            <Snippet
              title="Force message text color"
              code={'.message-content {\n  color: #eaeaea !important;\n}\n'}
              onCopy={copy}
              onInsert={insertAtEnd}
            />
            <Snippet
              title="Make action buttons always visible"
              code={'.message-actions--hover {\n  opacity: 1 !important;\n}\n'}
              onCopy={copy}
              onInsert={insertAtEnd}
            />
            <Snippet
              title="Give every message a subtle outline"
              code={'.message-item {\n  outline: 1px solid rgba(255,255,255,0.08) !important;\n  outline-offset: -1px;\n}\n'}
              onCopy={copy}
              onInsert={insertAtEnd}
            />
            <Snippet
              title="Increase code block contrast"
              code={'.message-content pre {\n  border: 1px solid rgba(255,255,255,0.14);\n  background: rgba(0,0,0,0.55) !important;\n}\n'}
              onCopy={copy}
              onInsert={insertAtEnd}
            />
          </div>
        </TabsContent>

        <TabsContent value="validate">
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
            <div className="text-sm text-zinc-200 font-medium">Validation</div>
            <div className="text-xs text-zinc-500 mt-1">Best-effort CSS parse check using browser APIs. Not a full linter, but catches obvious syntax failures.</div>

            <div className="mt-3">
              {validation.ok ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                  CSS parsed OK
                </div>
              ) : (
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-200">
                  CSS parse error
                  <div className="mt-2 text-xs text-red-200/80 whitespace-pre-wrap font-mono">{validation.error}</div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Snippet({
  title,
  code,
  onCopy,
  onInsert,
}: {
  title: string;
  code: string;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-200 font-medium">{title}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(code)} type="button">
            Copy
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onInsert(code)} type="button">
            Insert
          </Button>
        </div>
      </div>
      <pre className="mt-2 text-[11px] leading-snug text-zinc-300 whitespace-pre-wrap font-mono rounded-md bg-black/30 p-2 border border-zinc-800/50">
        {code}
      </pre>
    </div>
  );
}
