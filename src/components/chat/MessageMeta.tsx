import { memo } from 'react';
import type { Speaker } from '../../types/chat';

interface MessageMetaProps {
  speaker: Speaker;
  timestamp: number;
  isFirstInGroup: boolean; // For consecutive message grouping
}

/**
 * Renders message metadata: avatar, speaker name, timestamp.
 * 
 * Responsibilities:
 * - Avatar display
 * - Speaker name
 * - Smart timestamp formatting
 * - Collapse when not first in consecutive group
 */
export const MessageMeta = memo(function MessageMeta({
  speaker,
  timestamp,
  isFirstInGroup,
}: MessageMetaProps) {
  // Smart timestamp: relative for recent, date for old
  const formatTimestamp = (ts: number): string => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(ts).toLocaleDateString();
  };

  // Collapsed view for consecutive messages
  if (!isFirstInGroup) {
    return <div className="message-meta message-meta--collapsed" />;
  }

  return (
    <div className="message-meta">
      <div 
        className="message-avatar"
        style={{ backgroundColor: speaker.color ?? '#666' }}
      >
        {speaker.avatar_url ? (
          <img src={speaker.avatar_url} alt={speaker.name} />
        ) : (
          <span>{speaker.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="message-meta-text">
        <span className="message-speaker-name">{speaker.name}</span>
        <span className="message-timestamp">{formatTimestamp(timestamp)}</span>
      </div>
    </div>
  );
});
