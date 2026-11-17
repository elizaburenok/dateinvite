import { Button, type ButtonProps } from './Button.js';

/** Translucent variant of the shared 56px action button. */
export function GlassButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="glass" />;
}
