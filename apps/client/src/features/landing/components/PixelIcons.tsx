// Remove React import as it is not strictly required in React 17+ and causes a linter error here

export const PixelCircle = ({ className = "", size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="2" y="0" width="6" height="2" />
    <rect x="2" y="8" width="6" height="2" />
    <rect x="0" y="2" width="2" height="6" />
    <rect x="8" y="2" width="2" height="6" />
  </svg>
);


export const PixelMinus = ({ className = "", size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="0" y="4" width="10" height="2" />
  </svg>
);

export const PixelSquare = ({ className = "", size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="1" y="1" width="8" height="8" />
  </svg>
);

export const PixelX = ({ className = "", size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="0" y="0" width="2" height="2" />
    <rect x="8" y="0" width="2" height="2" />
    <rect x="2" y="2" width="2" height="2" />
    <rect x="6" y="2" width="2" height="2" />
    <rect x="4" y="4" width="2" height="2" />
    <rect x="2" y="6" width="2" height="2" />
    <rect x="6" y="6" width="2" height="2" />
    <rect x="0" y="8" width="2" height="2" />
    <rect x="8" y="8" width="2" height="2" />
  </svg>
);

export const PixelWebcam = ({ className = "", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Outer white body */}
    <circle cx="12" cy="12" r="11" fill="#f5f5f5" />
    
    {/* Inner black ring */}
    <circle cx="12" cy="12" r="7" stroke="#0a0a0a" strokeWidth="1" />
    
    {/* Inner black dots */}
    <g fill="#0a0a0a">
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx="12" cy="8.5" r="0.8" transform={`rotate(${i * 30} 12 12)`} />
      ))}
    </g>
    
    {/* Center black lens */}
    <circle cx="12" cy="12" r="2.5" fill="#0a0a0a" />
  </svg>
);

export const GithubIcon = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

export const PixelAppWindow = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="2" y="4" width="20" height="16" />
    <path d="M2 9h20 M6 4v5 M10 4v5" />
  </svg>
);

export const PixelCode = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <path d="M9 6l-5 6 5 6 M15 6l5 6-5 6 M14 4l-4 16" />
  </svg>
);

export const PixelTerminal = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="2" y="3" width="20" height="18" />
    <path d="M6 8l3 3-3 3 M11 14h5" />
  </svg>
);

export const PixelEye = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <polygon points="2,12 8,6 16,6 22,12 16,18 8,18" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const PixelPackage = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <polygon points="12,3 3,8 3,17 12,22 21,17 21,8" />
    <path d="M3 8l9 5 9-5 M12 13v9" />
  </svg>
);

export const PixelEnvelope = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="2" y="5" width="20" height="14" />
    <path d="M2 5l10 8 10-8" />
  </svg>
);

export const PixelLock = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="5" y="11" width="14" height="10" />
    <path d="M7 11V6h10v5 M12 15v2" />
  </svg>
);

export const PixelEyeClosed = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <path d="M2 12h20 M12 12v4 M7 12l-2 3 M17 12l2 3" />
  </svg>
);

export const PixelCheck = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <path d="M5 12l4 4 10-10" />
  </svg>
);

export const PixelMinimize = ({ className = "", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="0" y="4" width="10" height="2" />
  </svg>
);

export const PixelClose = ({ className = "", size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="0" y="0" width="2" height="2" />
    <rect x="8" y="0" width="2" height="2" />
    <rect x="2" y="2" width="2" height="2" />
    <rect x="6" y="2" width="2" height="2" />
    <rect x="4" y="4" width="2" height="2" />
    <rect x="2" y="6" width="2" height="2" />
    <rect x="6" y="6" width="2" height="2" />
    <rect x="0" y="8" width="2" height="2" />
    <rect x="8" y="8" width="2" height="2" />
  </svg>
);

// File Explorer Icons
export const FileIconFolder = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M4 6h6l2 2h8v10H4V6z" />
  </svg>
);

export const FileIconDefault = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M6 2v20h12V8l-6-6H6z M12 2v6h6" />
  </svg>
);

export const FileIconJS = ({ className = "", size = 16, text = "JS" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="16" fontSize="10" fontFamily="monospace" fontWeight="bold" fill="currentColor" stroke="none" textAnchor="middle">{text}</text>
  </svg>
);

export const FileIconTS = ({ className = "", size = 16 }) => <FileIconJS className={className} size={size} text="TS" />;
export const FileIconTSX = ({ className = "", size = 16 }) => <FileIconJS className={className} size={size} text="TSX" />;

export const FileIconJSON = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="15" fontSize="11" fontFamily="monospace" fill="currentColor" stroke="none" textAnchor="middle">{'{}'}</text>
  </svg>
);

export const FileIconHTML = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="16" fontSize="11" fontFamily="monospace" fill="currentColor" stroke="none" textAnchor="middle">{'<>'}</text>
  </svg>
);

export const FileIconMD = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="16" fontSize="10" fontFamily="monospace" fill="currentColor" stroke="none" textAnchor="middle">M↓</text>
  </svg>
);

export const FileIconCSS = ({ className = "", size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="16" fontSize="12" fontFamily="monospace" fill="currentColor" stroke="none" textAnchor="middle">#</text>
  </svg>
);
