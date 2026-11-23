import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function createIcon(paths: ReactNode) {
    return function Icon({ className, ...props }: IconProps) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={className ?? 'size-5'}
                {...props}
            >
                {paths}
            </svg>
        );
    };
}

export const DashboardIcon = createIcon(
    <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
);

export const BoxIcon = createIcon(
    <>
        <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
        <path d="m3 8 9 5 9-5" />
        <path d="M12 13v8" />
        <path d="m7.5 5.5 9 5" />
    </>,
);

export const LaptopIcon = createIcon(
    <>
        <rect x="4" y="4" width="16" height="11" rx="1.5" />
        <path d="M2 19h20" />
        <path d="M9 19 10 15h4l1 4" />
    </>,
);

export const ArrowsIcon = createIcon(
    <>
        <path d="M7 4v14" />
        <path d="m3 14 4 4 4-4" />
        <path d="M17 20V6" />
        <path d="m21 10-4-4-4 4" />
    </>,
);

export const ChartIcon = createIcon(
    <>
        <path d="M3 3v18h18" />
        <path d="m7 15 4-5 3 3 5-6" />
    </>,
);

export const ClipboardIcon = createIcon(
    <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3h6v1" />
        <path d="M9 11h6M9 15h4" />
    </>,
);

export const DatabaseIcon = createIcon(
    <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>,
);

export const SettingsIcon = createIcon(
    <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
);

export const HelpIcon = createIcon(
    <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
    </>,
);

export const SearchIcon = createIcon(
    <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
    </>,
);

export const BellIcon = createIcon(
    <>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>,
);

export const BellOffIcon = createIcon(
    <>
        <path d="M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5" />
        <path d="M17 17H3s3-2 3-9a5.9 5.9 0 0 1 .3-1.8" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        <path d="m2 2 20 20" />
    </>,
);

export const CalendarIcon = createIcon(
    <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
    </>,
);

export const PlusIcon = createIcon(<path d="M12 5v14M5 12h14" />);

export const ArrowDownTrayIcon = createIcon(
    <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
    </>,
);

export const ArrowUpTrayIcon = createIcon(
    <>
        <path d="M12 15V3" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 21h14" />
    </>,
);

export const ChevronDownIcon = createIcon(<path d="m6 9 6 6 6-6" />);

export const ChevronRightIcon = createIcon(<path d="m9 6 6 6-6 6" />);

export const ArrowLeftIcon = createIcon(
    <>
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
    </>,
);

export const ImageIcon = createIcon(
    <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-5-5L5 21" />
    </>,
);

export const UserIcon = createIcon(
    <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
);

export const DoorIcon = createIcon(
    <>
        <path d="M4 21h16" />
        <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
        <circle cx="14.5" cy="12.5" r="1" />
    </>,
);

export const WrenchIcon = createIcon(
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13a6 6 0 0 1-7.6 2.4L6 22.8a2 2 0 0 1-2.8-2.8l7.4-7.4A6 6 0 0 1 13 5l1.7 1.3Z" />,
);

export const TagIcon = createIcon(
    <>
        <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
    </>,
);

export const MapPinIcon = createIcon(
    <>
        <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
        <circle cx="12" cy="9" r="2.5" />
    </>,
);

export const GridIcon = createIcon(
    <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>,
);

export const ListIcon = createIcon(
    <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>,
);

export const XIcon = createIcon(<path d="M18 6 6 18M6 6l12 12" />);

export const MenuIcon = createIcon(<path d="M4 6h16M4 12h16M4 18h16" />);

export const ClockIcon = createIcon(
    <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </>,
);

export const AlertIcon = createIcon(
    <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
    </>,
);

export const PackageCheckIcon = createIcon(
    <>
        <path d="M21 8 12 3 3 8v8l9 5 4-2.2" />
        <path d="m3 8 9 5 9-5" />
        <path d="M12 13v8" />
        <path d="m16 19 2 2 4-4" />
    </>,
);

export const LogoutIcon = createIcon(
    <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="m16 17 5-5-5-5" />
        <path d="M21 12H9" />
    </>,
);

export const TrashIcon = createIcon(
    <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>,
);

export const BanIcon = createIcon(
    <>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.7 5.7 12.6 12.6" />
    </>,
);

export const RefreshIcon = createIcon(
    <>
        <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
        <path d="M3 21v-5h5" />
        <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
        <path d="M21 3v5h-5" />
    </>,
);

export const CheckIcon = createIcon(<path d="M20 6 9 17l-5-5" />);

export const UsersIcon = createIcon(
    <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
        <path d="M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </>,
);

export const TruckIcon = createIcon(
    <>
        <path d="M3 6h11v10H3Z" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
    </>,
);

export const KeyIcon = createIcon(
    <>
        <circle cx="8" cy="15" r="4" />
        <path d="m10.8 12.2 8.2-8.2" />
        <path d="m16 7 3 3" />
        <path d="m14 9 2 2" />
    </>,
);

export const EyeIcon = createIcon(
    <>
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </>,
);

export const EyeOffIcon = createIcon(
    <>
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499A10.75 10.75 0 0 1 2.062 12.35a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 2.82-4.134" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </>,
);
