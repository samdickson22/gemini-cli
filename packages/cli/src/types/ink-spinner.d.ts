declare module 'ink-spinner' {
  import type { FC } from 'react';

  export interface SpinnerProps {
    /** Type of spinner to render (dots, line, etc.) */
    readonly type?: string;
  }

  /**
   * Ink-compatible spinner component that renders a variety of CLI spinners.
   *
   * NOTE: The upstream package returns an `InkElement` which is incompatible with
   * `React.JSX` in React 18+ type definitions.  We re-declare it here as a normal
   * React `FC` so it can be used inside JSX without type errors.
   */
  const Spinner: FC<SpinnerProps>;

  export default Spinner;
}