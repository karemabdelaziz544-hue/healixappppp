import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { AppColors } from '../../constants/AppTheme';

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// 1. Notification Bell Icon
export const NotificationIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 2C8.13 2 5 5.13 5 9V14.17L3.59 15.59C3.21 15.97 3 16.48 3 17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17C21 16.48 20.79 15.97 20.41 15.59L19 14.17V9C19 5.13 15.87 2 12 2Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 19C9 20.66 10.34 22 12 22C13.66 22 15 20.66 15 19"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 2. Flame / Streak Icon
export const StreakIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 22C16.4183 22 20 18.4183 20 14C20 10 16.5 6 13 2C13 6 10 7 8 10C6 13 4 15 4 17.5C4 19.9853 7.58172 22 12 22Z"
      fill={color}
    />
    <Path
      d="M12 22C14.2091 22 16 20.2091 16 18C16 16 14 14 12.5 12C12.5 14 10.5 15 9.5 16.5C8.5 18 8 19 8 20C8 21.1046 9.79086 22 12 22Z"
      fill={AppColors.white}
    />
  </Svg>
);

// 3. Water Drop Icon
export const WaterIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.blue, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 2.69C12 2.69 5 10.18 5 15C5 18.87 8.13 22 12 22C15.87 22 19 18.87 19 15C19 10.18 12 2.69 12 2.69Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 18C10.34 18 9 16.66 9 15"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

// 4. Meal / Utensils Icon
export const MealIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M18 2V12M18 12V22M18 12C19.66 12 21 10.66 21 9V4C21 2.9 20.1 2 19 2H18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 2V8M9 2V8M3 2V8C3 10.21 4.79 12 7 12V22M7 12C9.21 12 11 10.21 11 8"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 5. Workout / Barbell Icon
export const WorkoutIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M6.5 4V20M17.5 4V20M2 8H11M13 8H22M2 16H11M13 16H22M4 7V17M20 7V17"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 6. Walk / Steps Icon
export const WalkIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Circle cx="13.5" cy="4.5" r="2.5" stroke={color} strokeWidth="1.8" />
    <Path
      d="M6.5 21L10 16L12.5 18.5L9 22M15 12.5L12 16M13.5 8.5L9.5 12L6 9.5M13.5 8.5L16.5 12L20.5 11"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 7. Sparkles / AI Icon
export const SparklesIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.white, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 3L14.5 8.5L20 11L14.5 13.5L12 19L9.5 13.5L4 11L9.5 8.5L12 3Z"
      fill={color}
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <Path
      d="M5 3L6.25 5.75L9 7L6.25 8.25L5 11L3.75 8.25L1 7L3.75 5.75L5 3Z"
      fill={color}
    />
  </Svg>
);

// 8. Checkmark / Tick Icon
export const CheckmarkIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.white, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 9. Chevron Down Icon
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 10. Chevron Up Icon
export const ChevronUpIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M18 15L12 9L6 15"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 11. Chevron Left (RTL Forward) Icon
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 12. Sync / Refresh Icon
export const SyncIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M21.5 2V6H17.5M2.5 22V18H6.5M21 11.5C20.5 6.7 16.7 3 12 3C7.6 3 3.9 6.2 3.1 10.5M3 12.5C3.5 17.3 7.3 21 12 21C16.4 21 20.1 17.8 20.9 13.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 13. Grid / Menu Icon
export const GridIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
    <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
    <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
    <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth="1.8" />
  </Svg>
);

// 14. Upload Icon
export const UploadIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 16V3M12 3L7 8M12 3L17 8M3 15V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 15. Calendar Icon
export const CalendarIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.8" />
    <Path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

// 16. Undo Arrow Icon
export const UndoIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.outline, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M3 9H14C17.31 9 20 11.69 20 15C20 18.31 17.31 21 14 21H8M3 9L8 4M3 9L8 14"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 17. Pie Chart / Compliance Icon
export const PieChartIcon: React.FC<IconProps> = ({ size = 24, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M21.21 15.89A10 10 0 1 1 8 2.83"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 12A10 10 0 0 0 12 2V12H22Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 18. Trophy / Achievement Icon
export const TrophyIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M6 9C6 13.42 9.58 17 14 17C18.42 17 22 13.42 22 9V3H6V9ZM6 9H2V11C2 12.66 3.34 14 5 14H6V9ZM22 9H26V11C26 12.66 24.66 14 23 14H22V9ZM14 17V21M10 21H18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 19. Pulse / Medical Doctor Icon
export const PulseIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M22 12H18L15 21L9 3L6 12H2"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 20. Swap Profile Icon
export const SwapIcon: React.FC<IconProps> = ({ size = 14, color = AppColors.white, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M20 7H4M4 7L9 2M4 7L9 12M4 17H20M20 17L15 12M20 17L15 22"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 21. Warning Icon
export const WarningIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.danger, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.63 18.67 1.8 18.98C1.97 19.29 2.3 19.48 2.65 19.48H21.35C21.7 19.48 22.03 19.29 22.2 18.98C22.37 18.67 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.2 3.37 12.85 3.37C12.5 3.37 12.17 3.56 11.99 3.86H10.29Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 23. Customer Support / Headphones Icon
export const SupportIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M3 18V12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12V18M3 15H5C6.1 15 7 15.9 7 17V19C7 20.1 6.1 21 5 21H3V15ZM21 15H19C17.9 15 17 15.9 17 17V19C17 20.1 17.9 21 19 21H21V15Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 24. Message / Chat Doctor Icon
export const MessageIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M21 11.5C21 16.2 16.97 20 12 20C10.5 20 9.07 19.63 7.82 18.98L3 20L4.22 15.65C3.44 14.41 3 12.99 3 11.5C3 6.8 7.03 3 12 3C16.97 3 21 6.8 21 11.5Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 25. Article / Blog Icon
export const ArticleIcon: React.FC<IconProps> = ({ size = 20, color = AppColors.primary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM7 7H17M7 11H17M7 15H13"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 26. Info Circle Icon
export const InfoIcon: React.FC<IconProps> = ({ size = 16, color = AppColors.outline, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <Path d="M12 16V12M12 8H12.01" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

