import { Trash2, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import type { ExampleConversation, ExampleMessage, ExampleRole } from '../../../utils/exampleMessages';

function RolePill({ role, onChange, disabled }: { role: ExampleRole; onChange: (r: ExampleRole) => void; disabled?: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        className={cn(
          'px-2.5 py-1 text-xs font-medium transition-colors',
          role === 'user' ? 'bg-blue-500/15 text-blue-200' : 'text-zinc-400 hover:text-zinc-200'
        )}
        onClick={() => onChange('user')}
        disabled={disabled}
      >
        User
      </button>
      <button
        type="button"
        className={cn(
          'px-2.5 py-1 text-xs font-medium transition-colors',
          role === 'char' ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-400 hover:text-zinc-200'
        )}
        onClick={() => onChange('char')}
        disabled={disabled}
      >
        Char
      </button>
    </div>
  );
}

function MessageEditor({
  msg,
  onChange,
  onDelete,
  disabled,
}: {
  msg: ExampleMessage;
  onChange: (next: ExampleMessage) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center gap-2 border-b border-zinc-800/50 px-3 py-2">
        <RolePill role={msg.role} onChange={(r) => onChange({ ...msg, role: r })} disabled={disabled} />
        <div className="flex-1" />
        <button
          type="button"
          className="rounded p-1 text-zinc-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-40"
          onClick={onDelete}
          disabled={disabled}
          title="Delete message"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">
        <textarea
          value={msg.content}
          onChange={(e) => onChange({ ...msg, content: e.target.value })}
          placeholder={msg.role === 'user' ? 'User says…' : 'Character replies…'}
          rows={3}
          disabled={disabled}
          spellCheck={false}
          className={cn(
            'w-full resize-y rounded-lg border bg-zinc-900/80 p-3',
            'font-mono text-sm text-zinc-200 placeholder:text-zinc-600',
            'focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30',
            'border-zinc-800 disabled:opacity-60'
          )}
        />
      </div>
    </div>
  );
}

export function ExampleConversationBuilder({
  conversations,
  onChange,
  disabled,
}: {
  conversations: ExampleConversation[];
  onChange: (next: ExampleConversation[]) => void;
  disabled?: boolean;
}) {
  const addConversation = () => {
    onChange([
      ...conversations,
      { id: `conv_${Date.now()}`, messages: [{ role: 'user', content: '' }, { role: 'char', content: '' }] },
    ]);
  };

  const addMessage = (convIndex: number, role: ExampleRole) => {
    const next = conversations.map((c, i) =>
      i === convIndex ? { ...c, messages: [...c.messages, { role, content: '' }] } : c
    );
    onChange(next);
  };

  const updateMessage = (convIndex: number, msgIndex: number, msg: ExampleMessage) => {
    const next = conversations.map((c, i) => {
      if (i !== convIndex) return c;
      const msgs = [...c.messages];
      msgs[msgIndex] = msg;
      return { ...c, messages: msgs };
    });
    onChange(next);
  };

  const deleteMessage = (convIndex: number, msgIndex: number) => {
    const next = conversations.map((c, i) => {
      if (i !== convIndex) return c;
      return { ...c, messages: c.messages.filter((_, j) => j !== msgIndex) };
    });
    onChange(next);
  };

  const deleteConversation = (convIndex: number) => {
    onChange(conversations.filter((_, i) => i !== convIndex));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500">
          Build structured back-and-forth. We’ll serialize to <code className="rounded bg-zinc-800 px-1">&lt;START&gt;</code> +
          <code className="ml-1 rounded bg-zinc-800 px-1">{'{{user}}'}</code>/<code className="rounded bg-zinc-800 px-1">{'{{char}}'}</code>.
        </div>
        <Button size="sm" variant="outline" onClick={addConversation} disabled={disabled}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add conversation
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">No example conversations yet</p>
          <p className="mt-1 text-xs text-zinc-600">Add one to avoid formatting typos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conv, convIndex) => (
            <div key={conv.id} className="rounded-xl border border-zinc-800 bg-zinc-950/20 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="text-xs font-medium text-zinc-300">Conversation {convIndex + 1}</div>
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => addMessage(convIndex, 'user')} disabled={disabled} className="text-xs">
                  + User
                </Button>
                <Button size="sm" variant="outline" onClick={() => addMessage(convIndex, 'char')} disabled={disabled} className="text-xs">
                  + Char
                </Button>
                <button
                  type="button"
                  className="rounded p-1 text-zinc-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-40"
                  onClick={() => deleteConversation(convIndex)}
                  disabled={disabled}
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {conv.messages.map((msg, msgIndex) => (
                  <MessageEditor
                    key={`${conv.id}_${msgIndex}`}
                    msg={msg}
                    onChange={(m) => updateMessage(convIndex, msgIndex, m)}
                    onDelete={() => deleteMessage(convIndex, msgIndex)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






