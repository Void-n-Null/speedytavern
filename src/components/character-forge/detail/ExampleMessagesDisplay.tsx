import { cn } from '../../../lib/utils';

export function ExampleMessagesDisplay({
  examplesParsed,
  charName,
  rawExampleMessages,
  CodeBlock,
}: {
  examplesParsed: any;
  charName: string;
  rawExampleMessages: string;
  CodeBlock: any;
}) {
  if (examplesParsed?.ok) {
    return (
      <div className="max-h-[320px] space-y-3 overflow-y-auto">
        {examplesParsed.conversations.map((conv: any, i: number) => (
          <div
            key={conv.id}
            className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
          >
            <div className="mb-2 text-xs font-medium text-zinc-400">
              Conversation {i + 1}
            </div>
            <div className="space-y-2">
              {conv.messages.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'border border-blue-500/20 bg-blue-500/10 text-blue-100'
                      : 'border border-violet-500/20 bg-violet-500/10 text-violet-100'
                  )}
                >
                  <div className="mb-1 text-[11px] font-medium opacity-70">
                    {m.role === 'user' ? 'User' : charName || 'Character'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-amber-200">
        {examplesParsed === null ? 'Too large to parse. Showing raw.' : 'Non-standard format. Showing raw.'}
      </div>
      <CodeBlock text={rawExampleMessages} maxHeightClass="max-h-[200px]" maxChars={60_000} />
    </div>
  );
}

