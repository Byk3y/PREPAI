import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export const CloseIcon = ({ size = 24, color = '#1a1a1a' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M18 6L6 18M6 6l12 12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const DownloadIcon = ({ size = 24, color = '#1a1a1a' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const PlayIcon = ({ size = 32, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M8 5v14l11-7z" />
    </Svg>
);

export const PauseIcon = ({ size = 32, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </Svg>
);

export const RewindIcon = ({ size = 28, color = '#4F5BD5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M11 19a8 8 0 100-16 8 8 0 000 16z"
            stroke={color}
            strokeWidth={1.5}
        />
        <Path
            d="M11 19a8 8 0 110-16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <G transform="translate(2, 0)">
            <Path
                d="M9 8v4l-2-2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>
    </Svg>
);

export const ForwardIcon = ({ size = 28, color = '#4F5BD5' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M13 19a8 8 0 110-16 8 8 0 010 16z"
            stroke={color}
            strokeWidth={1.5}
        />
        <Path
            d="M13 3a8 8 0 110 16"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <G transform="translate(-2, 0)">
            <Path
                d="M15 8v4l2-2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </G>
    </Svg>
);

export const ThumbUpIcon = ({ size = 24, color = '#9ca3af', filled = false }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : 'none'}
        />
    </Svg>
);

export const ThumbDownIcon = ({ size = 24, color = '#9ca3af', filled = false }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={filled ? color : 'none'}
        />
    </Svg>
);
