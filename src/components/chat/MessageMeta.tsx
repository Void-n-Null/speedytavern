import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Speaker } from '../../types/chat';
import {
  useTypographyConfig,
  useLayoutConfig,
  useAvatarConfig,
  useTimestampConfig,
} from '../../store/messageStyleStore';
import { avatarSizeMap } from '../../types/messageStyle';
import type { TimestampDetail } from '../../types/messageStyle';

interface MessageMetaProps {
  speaker: Speaker;
  timestamp: number;
  isFirstInGroup: boolean;
}

/**
 * Renders message metadata: avatar, speaker name, timestamp.
 * Now fully customizable via messageStyleStore.
 */
export const MessageMeta = memo(function MessageMeta({
  speaker,
  timestamp,
  isFirstInGroup,
}: MessageMetaProps) {
  // Debug: log when speaker or timestamp seems invalid
  if (!speaker?.name || !timestamp) {
    console.warn('[MessageMeta] Invalid data:', { speaker, timestamp, isFirstInGroup });
  }
  
  const typography = useTypographyConfig();
  const layout = useLayoutConfig();
  const avatarConfig = useAvatarConfig();
  const timestampConfig = useTimestampConfig();

  // Format timestamp based on config
  const formatTimestamp = (ts: number): string => {
    if (timestampConfig.format === 'hidden') return '';
    
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const date = new Date(ts);

    // Relative format
    if (timestampConfig.format === 'relative') {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return `${days}d ago`;
    }

    // Absolute format
    if (timestampConfig.format === 'absolute') {
      return formatAbsolute(date, timestampConfig.detail);
    }

    // Smart format (default): relative for recent, absolute for old
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatAbsolute(date, timestampConfig.detail);
  };

  const formatAbsolute = (date: Date, detail: TimestampDetail): string => {
    switch (detail) {
      case 'time-only':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'date-only':
        return date.toLocaleDateString();
      case 'full':
        return date.toLocaleString();
      default:
        return date.toLocaleDateString();
    }
  };

  // Avatar styles
  const avatarStyle = useMemo((): CSSProperties => {
    const size = avatarSizeMap[avatarConfig.size];
    let borderRadius: string;
    
    switch (avatarConfig.shape) {
      case 'circle':
        borderRadius = '50%';
        break;
      case 'square':
        borderRadius = '0';
        break;
      case 'rounded':
        borderRadius = `${avatarConfig.roundness}px`;
        break;
      default:
        borderRadius = '50%';
    }

    return {
      width: size,
      height: size,
      minWidth: size,
      minHeight: size,
      borderRadius,
      backgroundColor: speaker.color ?? '#666',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };
  }, [avatarConfig, speaker.color]);

  // Container styles based on metaPosition
  const containerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      display: 'flex',
      gap: `${layout.avatarGap}px`,
    };

    switch (layout.metaPosition) {
      case 'left':
        return { ...base, flexDirection: 'column', alignItems: 'center' };
      case 'above':
        return { ...base, flexDirection: 'row', alignItems: 'center' };
      case 'inline':
        return { ...base, flexDirection: 'row', alignItems: 'center' };
      default:
        return base;
    }
  }, [layout.metaPosition, layout.avatarGap]);

  // Text styles
  const nameStyle: CSSProperties = {
    color: typography.usernameColor,
    fontWeight: 600,
  };

  const timestampStyle: CSSProperties = {
    color: typography.timestampColor,
    fontSize: '0.85em',
  };

  // Determine if avatar should show
  const shouldShowAvatar = (): boolean => {
    switch (avatarConfig.visibility) {
      case 'always':
        return true;
      case 'first-in-group':
        return isFirstInGroup;
      case 'never':
        return false;
      default:
        return isFirstInGroup;
    }
  };

  // Collapsed view for consecutive messages when grouping
  if (!isFirstInGroup && layout.groupConsecutive) {
    const placeholderSize = avatarSizeMap[avatarConfig.size];
    return (
      <div 
        className="message-meta message-meta--collapsed" 
        style={{ width: placeholderSize, minWidth: placeholderSize }}
      />
    );
  }

  // Render avatar
  const renderAvatar = () => {
    if (!shouldShowAvatar()) {
      const placeholderSize = avatarSizeMap[avatarConfig.size];
      return <div style={{ width: placeholderSize, minWidth: placeholderSize }} />;
    }

    return (
      <div className="message-avatar" style={avatarStyle}>
        {speaker.avatar_url ? (
          <img 
            src={speaker.avatar_url} 
            alt={speaker.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : avatarConfig.fallback === 'initials' ? (
          <span style={{ fontSize: `calc(${avatarSizeMap[avatarConfig.size]} * 0.4)` }}>
            {speaker.name.charAt(0).toUpperCase()}
          </span>
        ) : avatarConfig.fallback === 'color-block' ? null : (
          <span>👤</span>
        )}
      </div>
    );
  };

  // Render meta text (name + timestamp)
  const renderMetaText = () => {
    const formattedTime = formatTimestamp(timestamp);
    
    if (timestampConfig.position === 'with-name') {
      return (
        <div className="message-meta-text" style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
          <span className="message-speaker-name" style={nameStyle}>{speaker.name}</span>
          {formattedTime && <span className="message-timestamp" style={timestampStyle}>{formattedTime}</span>}
        </div>
      );
    }

    if (timestampConfig.position === 'below-name') {
      return (
        <div className="message-meta-text" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="message-speaker-name" style={nameStyle}>{speaker.name}</span>
          {formattedTime && <span className="message-timestamp" style={timestampStyle}>{formattedTime}</span>}
        </div>
      );
    }

    // message-end position - timestamp rendered elsewhere
    return (
      <div className="message-meta-text">
        <span className="message-speaker-name" style={nameStyle}>{speaker.name}</span>
      </div>
    );
  };

  return (
    <div className="message-meta" style={containerStyle}>
      {renderAvatar()}
      {layout.metaPosition !== 'left' && renderMetaText()}
      {layout.metaPosition === 'left' && renderMetaText()}
    </div>
  );
});
