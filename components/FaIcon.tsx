import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowLeft,
  faCalendarDay,
  faCalendarDays,
  faChartLine,
  faChartSimple,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClock,
  faDeleteLeft,
  faFileExport,
  faFileImport,
  faFingerprint,
  faFire,
  faGear,
  faHome,
  faHourglassHalf,
  faLock,
  faMagnifyingGlass,
  faMoon,
  faPlay,
  faPlus,
  faScroll,
  faShare,
  faShieldHalved,
  faSpinner,
  faTrashArrowUp,
  faTrashCan,
  faUpload,
  faVolumeHigh,
  faVolumeXmark,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export type FaIconName =
  | 'arrow-left'
  | 'calendar-day'
  | 'calendar-days'
  | 'chart-line'
  | 'chart-simple'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'circle-check'
  | 'clock'
  | 'delete-left'
  | 'file-export'
  | 'file-import'
  | 'fingerprint'
  | 'fire'
  | 'gear'
  | 'home'
  | 'hourglass-half'
  | 'lock'
  | 'magnifying-glass'
  | 'moon'
  | 'play'
  | 'plus'
  | 'scroll'
  | 'share'
  | 'shield-halved'
  | 'spinner'
  | 'trash-arrow-up'
  | 'trash-can'
  | 'upload'
  | 'volume-high'
  | 'volume-xmark'
  | 'xmark';

const ICON_MAP: Record<FaIconName, IconDefinition> = {
  'arrow-left': faArrowLeft,
  'calendar-day': faCalendarDay,
  'calendar-days': faCalendarDays,
  'chart-line': faChartLine,
  'chart-simple': faChartSimple,
  check: faCheck,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  'circle-check': faCircleCheck,
  clock: faClock,
  'delete-left': faDeleteLeft,
  'file-export': faFileExport,
  'file-import': faFileImport,
  fingerprint: faFingerprint,
  fire: faFire,
  gear: faGear,
  home: faHome,
  'hourglass-half': faHourglassHalf,
  lock: faLock,
  'magnifying-glass': faMagnifyingGlass,
  moon: faMoon,
  play: faPlay,
  plus: faPlus,
  scroll: faScroll,
  share: faShare,
  'shield-halved': faShieldHalved,
  spinner: faSpinner,
  'trash-arrow-up': faTrashArrowUp,
  'trash-can': faTrashCan,
  upload: faUpload,
  'volume-high': faVolumeHigh,
  'volume-xmark': faVolumeXmark,
  xmark: faXmark,
};

interface Props {
  name: FaIconName;
  className?: string;
  spin?: boolean;
}

const FaIcon: React.FC<Props> = ({ name, className, spin }) => {
  return <FontAwesomeIcon icon={ICON_MAP[name]} className={className} spin={spin} />;
};

export default FaIcon;

