import type { CSSProperties } from 'react';

import chevronDown from '../assets/figma/icon-chevron-down.svg';
import dumbbell from '../assets/figma/icon-dumbbell.svg';
import more from '../assets/figma/icon-more.svg';
import navLibrary from '../assets/figma/nav-library.svg';
import navOverview from '../assets/figma/nav-overview.svg';
import navPayments from '../assets/figma/nav-payments.svg';
import navReports from '../assets/figma/nav-reports.svg';
import navSettings from '../assets/figma/nav-settings.svg';
import navUsers from '../assets/figma/nav-users.svg';
import navVerify from '../assets/figma/nav-verify.svg';
import search from '../assets/figma/icon-search.svg';
import signal from '../assets/figma/icon-signal.svg';
import starOff from '../assets/figma/icon-star-off.svg';
import starOn from '../assets/figma/icon-star-on.svg';
import statusOk from '../assets/figma/status-ok.svg';
import statusWarning from '../assets/figma/status-warning.svg';
import user from '../assets/figma/icon-user.svg';

/** Icons exported from the Figma file. */
export const icons = {
  chevronDown,
  dumbbell,
  more,
  navLibrary,
  navOverview,
  navPayments,
  navReports,
  navSettings,
  navUsers,
  navVerify,
  search,
  signal,
  starOff,
  starOn,
  statusOk,
  statusWarning,
  user,
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  size: number;
  /**
   * Repaints a monochrome glyph with the current text colour (e.g. the active
   * sidebar item). Leave off for multicolour icons such as status marks.
   */
  tint?: boolean;
  className?: string;
};

export function Icon({ name, size, tint = false, className }: IconProps) {
  if (!tint) {
    return <img src={icons[name]} width={size} height={size} alt="" aria-hidden className={className} />;
  }
  const style: CSSProperties = {
    width: size,
    height: size,
    display: 'inline-block',
    flex: 'none',
    backgroundColor: 'currentColor',
    maskImage: `url("${icons[name]}")`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskImage: `url("${icons[name]}")`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
  };
  return <span style={style} aria-hidden className={className} />;
}
