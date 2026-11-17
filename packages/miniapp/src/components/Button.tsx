import type { ComponentPropsWithRef } from 'react';
import '../styles/button.css';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'plain' | 'glass';
  iconOnly?: boolean;
  size?: 'default' | 'small';
};

/** Shared action button. Native props, refs and accessibility pass through. */
export function Button({ children, className = '', type = 'button', variant = 'plain', iconOnly = false, size = 'default', ...props }: ButtonProps) {
  const classes = ['invite-button', iconOnly && 'invite-button--icon', size === 'small' && 'invite-button--small', variant === 'glass' && 'glass-button', className]
    .filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {variant === 'glass' ? <span className="glass-button__label">{children}</span> : children}
    </button>
  );
}
