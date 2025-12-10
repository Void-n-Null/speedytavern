import { useMessageStyleStore } from '../../store/messageStyleStore';
import type {
  FontSize,
  LineHeight,
  FontFamily,
  FontWeight,
  MetaPosition,
  Alignment,
  MessageStyle,
  Padding,
  Gap,
  AvatarShape,
  AvatarSize,
  AvatarVisibility,
  AvatarVerticalAlign,
  AvatarFallback,
  Visibility,
  ActionsPosition,
  ActionsStyle,
  ActionsSize,
  BranchVisibility,
  BranchPosition,
  BranchStyle,
  TimestampFormat,
  TimestampDetail,
  TimestampPosition,
  Transition,
  NewMessageAnimation,
  EditStyle,
  EditButtonPosition,
} from '../../types/messageStyle';

/**
 * Simple settings panel for message styling.
 * No CSS - just inputs and labels as requested.
 */
export function MessageStyleSettings() {
  const {
    config,
    setTypography,
    setLayout,
    setAvatar,
    setActions,
    setBranch,
    setTimestamp,
    setAnimation,
    setEdit,
    resetConfig,
  } = useMessageStyleStore();

  return (
    <div>
      <h2>Message Style Settings</h2>
      <button onClick={resetConfig}>Reset to Defaults</button>
      
      <hr />
      
      {/* ============ TYPOGRAPHY ============ */}
      <h3>Typography</h3>
      
      <div>
        <label>
          Font Size:
          <select
            value={config.typography.fontSize}
            onChange={(e) => setTypography({ fontSize: e.target.value as FontSize })}
          >
            <option value="xs">Extra Small</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Line Height:
          <select
            value={config.typography.lineHeight}
            onChange={(e) => setTypography({ lineHeight: e.target.value as LineHeight })}
          >
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Font Family:
          <select
            value={config.typography.fontFamily}
            onChange={(e) => setTypography({ fontFamily: e.target.value as FontFamily })}
          >
            <option value="system">System</option>
            <option value="mono">Monospace</option>
            <option value="serif">Serif</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Font Weight:
          <select
            value={config.typography.fontWeight}
            onChange={(e) => setTypography({ fontWeight: e.target.value as FontWeight })}
          >
            <option value="normal">Normal</option>
            <option value="medium">Medium</option>
            <option value="bold">Bold</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Text Color:
          <input
            type="color"
            value={config.typography.textColor}
            onChange={(e) => setTypography({ textColor: e.target.value })}
          />
        </label>
      </div>

      <div>
        <label>
          User Text Color (override):
          <input
            type="color"
            value={config.typography.userTextColor || '#ffffff'}
            onChange={(e) => setTypography({ userTextColor: e.target.value })}
          />
          <button onClick={() => setTypography({ userTextColor: '' })}>Clear</button>
        </label>
      </div>

      <div>
        <label>
          Bot Text Color (override):
          <input
            type="color"
            value={config.typography.botTextColor || '#ffffff'}
            onChange={(e) => setTypography({ botTextColor: e.target.value })}
          />
          <button onClick={() => setTypography({ botTextColor: '' })}>Clear</button>
        </label>
      </div>

      <div>
        <label>
          Username Color:
          <input
            type="color"
            value={config.typography.usernameColor}
            onChange={(e) => setTypography({ usernameColor: e.target.value })}
          />
        </label>
      </div>

      <div>
        <label>
          Timestamp Color:
          <input
            type="color"
            value={config.typography.timestampColor}
            onChange={(e) => setTypography({ timestampColor: e.target.value })}
          />
        </label>
      </div>

      <hr />

      {/* ============ LAYOUT ============ */}
      <h3>Layout</h3>

      <div>
        <label>
          Meta Position:
          <select
            value={config.layout.metaPosition}
            onChange={(e) => setLayout({ metaPosition: e.target.value as MetaPosition })}
          >
            <option value="left">Left (avatar beside message)</option>
            <option value="above">Above (avatar + name above text)</option>
            <option value="inline">Inline (name before text)</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          User Alignment:
          <select
            value={config.layout.userAlignment}
            onChange={(e) => setLayout({ userAlignment: e.target.value as Alignment })}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Bot Alignment:
          <select
            value={config.layout.botAlignment}
            onChange={(e) => setLayout({ botAlignment: e.target.value as Alignment })}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Message Style:
          <select
            value={config.layout.messageStyle}
            onChange={(e) => setLayout({ messageStyle: e.target.value as MessageStyle })}
          >
            <option value="bubble">Bubble</option>
            <option value="flat">Flat</option>
            <option value="bordered">Bordered</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Bubble Padding:
          <select
            value={config.layout.bubblePadding}
            onChange={(e) => setLayout({ bubblePadding: e.target.value as Padding })}
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Bubble Max Width (%):
          <input
            type="range"
            min="30"
            max="100"
            value={config.layout.bubbleMaxWidth}
            onChange={(e) => setLayout({ bubbleMaxWidth: parseInt(e.target.value) })}
          />
          <span>{config.layout.bubbleMaxWidth}%</span>
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.layout.groupConsecutive}
            onChange={(e) => setLayout({ groupConsecutive: e.target.checked })}
          />
          Group Consecutive Messages
        </label>
      </div>

      <div>
        <label>
          Group Gap:
          <select
            value={config.layout.groupGap}
            onChange={(e) => setLayout({ groupGap: e.target.value as Gap })}
          >
            <option value="none">None</option>
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Message Gap:
          <select
            value={config.layout.messageGap}
            onChange={(e) => setLayout({ messageGap: e.target.value as Gap })}
          >
            <option value="none">None</option>
            <option value="tight">Tight</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Avatar Gap (px):
          <input
            type="number"
            min="0"
            max="32"
            value={config.layout.avatarGap}
            onChange={(e) => setLayout({ avatarGap: parseInt(e.target.value) })}
          />
        </label>
      </div>

      <div>
        <label>
          Container Width (%):
          <input
            type="range"
            min="20"
            max="100"
            value={config.layout.containerWidth}
            onChange={(e) => setLayout({ containerWidth: parseInt(e.target.value) })}
          />
          <span>{config.layout.containerWidth}%</span>
        </label>
        <div style={{ fontSize: '11px', color: '#888' }}>
          Tip: You can also drag the edges of the message list to resize
        </div>
      </div>

      <hr />

      {/* ============ AVATAR ============ */}
      <h3>Avatar</h3>

      <div>
        <label>
          Shape:
          <select
            value={config.avatar.shape}
            onChange={(e) => setAvatar({ shape: e.target.value as AvatarShape })}
          >
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="rounded">Rounded Square</option>
          </select>
        </label>
      </div>

      {config.avatar.shape === 'rounded' && (
        <div>
          <label>
            Roundness (px):
            <input
              type="range"
              min="0"
              max="24"
              value={config.avatar.roundness}
              onChange={(e) => setAvatar({ roundness: parseInt(e.target.value) })}
            />
            <span>{config.avatar.roundness}px</span>
          </label>
        </div>
      )}

      <div>
        <label>
          Size:
          <select
            value={config.avatar.size}
            onChange={(e) => setAvatar({ size: e.target.value as AvatarSize })}
          >
            <option value="xs">Extra Small (24px)</option>
            <option value="sm">Small (32px)</option>
            <option value="md">Medium (40px)</option>
            <option value="lg">Large (48px)</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Visibility:
          <select
            value={config.avatar.visibility}
            onChange={(e) => setAvatar({ visibility: e.target.value as AvatarVisibility })}
          >
            <option value="always">Always</option>
            <option value="first-in-group">First in Group</option>
            <option value="never">Never</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Vertical Align:
          <select
            value={config.avatar.verticalAlign}
            onChange={(e) => setAvatar({ verticalAlign: e.target.value as AvatarVerticalAlign })}
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Fallback (no image):
          <select
            value={config.avatar.fallback}
            onChange={(e) => setAvatar({ fallback: e.target.value as AvatarFallback })}
          >
            <option value="initials">Initials</option>
            <option value="icon">Icon</option>
            <option value="color-block">Color Block</option>
          </select>
        </label>
      </div>

      <hr />

      {/* ============ ACTIONS ============ */}
      <h3>Action Buttons</h3>

      <div>
        <label>
          Visibility:
          <select
            value={config.actions.visibility}
            onChange={(e) => setActions({ visibility: e.target.value as Visibility })}
          >
            <option value="always">Always Visible</option>
            <option value="hover">Show on Hover</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Position:
          <select
            value={config.actions.position}
            onChange={(e) => setActions({ position: e.target.value as ActionsPosition })}
          >
            <option value="inline">Inline</option>
            <option value="bottom">Bottom</option>
            <option value="overlay-corner">Overlay Corner</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Style:
          <select
            value={config.actions.style}
            onChange={(e) => setActions({ style: e.target.value as ActionsStyle })}
          >
            <option value="icon">Icon Only</option>
            <option value="text">Text Only</option>
            <option value="icon-text">Icon + Text</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Size:
          <select
            value={config.actions.size}
            onChange={(e) => setActions({ size: e.target.value as ActionsSize })}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.actions.showEdit}
            onChange={(e) => setActions({ showEdit: e.target.checked })}
          />
          Show Edit Button
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.actions.showDelete}
            onChange={(e) => setActions({ showDelete: e.target.checked })}
          />
          Show Delete Button
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.actions.showBranch}
            onChange={(e) => setActions({ showBranch: e.target.checked })}
          />
          Show Branch Button
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.actions.showRegenerate}
            onChange={(e) => setActions({ showRegenerate: e.target.checked })}
          />
          Show Regenerate Button
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.actions.showCopy}
            onChange={(e) => setActions({ showCopy: e.target.checked })}
          />
          Show Copy Button
        </label>
      </div>

      <hr />

      {/* ============ BRANCH INDICATOR ============ */}
      <h3>Branch Indicator</h3>

      <div>
        <label>
          Visibility:
          <select
            value={config.branch.visibility}
            onChange={(e) => setBranch({ visibility: e.target.value as BranchVisibility })}
          >
            <option value="always">Always</option>
            <option value="hover">Show on Hover</option>
            <option value="when-multiple">Only When Multiple Branches</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Position:
          <select
            value={config.branch.position}
            onChange={(e) => setBranch({ position: e.target.value as BranchPosition })}
          >
            <option value="top-right">Top Right</option>
            <option value="bottom">Bottom</option>
            <option value="inline-after-meta">Inline After Meta</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Style:
          <select
            value={config.branch.style}
            onChange={(e) => setBranch({ style: e.target.value as BranchStyle })}
          >
            <option value="arrows">Arrows (‹ 2/3 ›)</option>
            <option value="dots">Dots (○ ● ○)</option>
            <option value="minimal">Minimal (2/3)</option>
          </select>
        </label>
      </div>

      <hr />

      {/* ============ TIMESTAMP ============ */}
      <h3>Timestamp</h3>

      <div>
        <label>
          Format:
          <select
            value={config.timestamp.format}
            onChange={(e) => setTimestamp({ format: e.target.value as TimestampFormat })}
          >
            <option value="smart">Smart (relative for recent)</option>
            <option value="relative">Always Relative</option>
            <option value="absolute">Always Absolute</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Detail (for absolute):
          <select
            value={config.timestamp.detail}
            onChange={(e) => setTimestamp({ detail: e.target.value as TimestampDetail })}
          >
            <option value="time-only">Time Only</option>
            <option value="date-only">Date Only</option>
            <option value="full">Full Date + Time</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Position:
          <select
            value={config.timestamp.position}
            onChange={(e) => setTimestamp({ position: e.target.value as TimestampPosition })}
          >
            <option value="with-name">With Name</option>
            <option value="below-name">Below Name</option>
            <option value="message-end">Message End</option>
          </select>
        </label>
      </div>

      <hr />

      {/* ============ ANIMATION ============ */}
      <h3>Animation</h3>

      <div>
        <label>
          <input
            type="checkbox"
            checked={config.animation.enabled}
            onChange={(e) => setAnimation({ enabled: e.target.checked })}
          />
          Enable Animations
        </label>
      </div>

      <div>
        <label>
          Hover Transition:
          <select
            value={config.animation.hoverTransition}
            onChange={(e) => setAnimation({ hoverTransition: e.target.value as Transition })}
          >
            <option value="none">None</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          New Message Animation:
          <select
            value={config.animation.newMessageAnimation}
            onChange={(e) => setAnimation({ newMessageAnimation: e.target.value as NewMessageAnimation })}
          >
            <option value="none">None</option>
            <option value="fade-in">Fade In</option>
            <option value="slide-up">Slide Up</option>
          </select>
        </label>
      </div>

      <hr />

      {/* ============ EDIT MODE ============ */}
      <h3>Edit Mode</h3>

      <div>
        <label>
          Style:
          <select
            value={config.edit.style}
            onChange={(e) => setEdit({ style: e.target.value as EditStyle })}
          >
            <option value="inline">Inline</option>
            <option value="modal">Modal</option>
            <option value="fullwidth">Full Width</option>
          </select>
        </label>
      </div>

      <div>
        <label>
          Button Position:
          <select
            value={config.edit.buttonPosition}
            onChange={(e) => setEdit({ buttonPosition: e.target.value as EditButtonPosition })}
          >
            <option value="inline">Inline</option>
            <option value="below">Below</option>
          </select>
        </label>
      </div>
    </div>
  );
}
