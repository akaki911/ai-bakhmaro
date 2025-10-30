import { forwardRef } from 'react';
import type { CSSProperties } from 'react';

type SwitchProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const baseTrackClasses =
  'neon-switch-track relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border px-[3px] transition-all duration-300 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60';
const baseThumbClasses =
  'neon-switch-thumb pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full transition duration-300 will-change-transform';

const createToggleStyle = (checked: boolean): CSSProperties =>
  ({
    '--toggle-track-background': `var(${checked ? '--toggle-track-background-on' : '--toggle-track-background-off'})`,
    '--toggle-track-border': `var(${checked ? '--toggle-track-border-on' : '--toggle-track-border-off'})`,
    '--toggle-track-shadow': `var(${checked ? '--toggle-track-shadow-on' : '--toggle-track-shadow-off'})`,
    '--toggle-track-shadow-hover': `var(${checked ? '--toggle-track-shadow-on-hover' : '--toggle-track-shadow-off-hover'})`,
    '--toggle-thumb-surface': `var(${checked ? '--toggle-thumb-surface-on' : '--toggle-thumb-surface-off'})`,
    '--toggle-thumb-shadow': `var(${checked ? '--toggle-thumb-shadow-on' : '--toggle-thumb-shadow-off'})`,
    '--toggle-thumb-shadow-hover': `var(${checked ? '--toggle-thumb-shadow-on-hover' : '--toggle-thumb-shadow-off-hover'})`,
  } as CSSProperties);

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked = false,
      onCheckedChange,
      className = '',
      onClick,
      onKeyDown,
      style: inlineStyle,
      disabled,
      ...props
    },
    ref,
  ) => {
      const trackClasses = `${baseTrackClasses} ${className}`.trim();
      const thumbClasses = `${baseThumbClasses} ${checked ? 'translate-x-5' : 'translate-x-0.5'}`;
      const toggleStyle = createToggleStyle(checked);

      return (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled ?? undefined}
          data-state={checked ? 'checked' : 'unchecked'}
          data-disabled={disabled ? 'true' : 'false'}
          ref={ref}
          onClick={(event) => {
            onClick?.(event);
            if (event.defaultPrevented || disabled) {
              return;
            }
            onCheckedChange?.(!checked);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (
              event.defaultPrevented ||
              disabled ||
              (event.key !== 'Enter' && event.key !== ' ') ||
              event.repeat
            ) {
              return;
            }
            event.preventDefault();
            onCheckedChange?.(!checked);
          }}
          className={trackClasses}
          style={{ ...toggleStyle, ...(inlineStyle as CSSProperties) }}
          disabled={disabled}
          {...props}
        >
          <span aria-hidden className="neon-switch-halo" />
          <span className={thumbClasses} />
        </button>
      );
    },
  );

Switch.displayName = 'Switch';

export default Switch;
