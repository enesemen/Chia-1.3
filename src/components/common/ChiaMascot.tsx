import React from 'react';

export type ChiaPose = 'planning' | 'balanced' | 'suggesting' | 'habits' | 'waving' | 'icon';

interface ChiaMascotProps {
  pose?: ChiaPose; size?: number | string; className?: string; showSpeechBubble?: boolean; speechText?: string;
}

const RobotHeadAndVisor: React.FC<{ closedEyes?: boolean; tilted?: boolean }> = ({ closedEyes = false, tilted = false }) => {
  const head = (
    <>
      <path d="M 45,85 C 45,45 68,32 100,32 C 132,32 155,45 155,85 C 155,122 132,135 100,135 C 68,135 45,122 45,85 Z" fill="#FAFAFA" stroke="#E2E8E0" strokeWidth="2" />
      <rect x="34" y="72" width="13" height="26" rx="6.5" fill="#4B6543" />
      <rect x="153" y="72" width="13" height="26" rx="6.5" fill="#4B6543" />
      <path d="M 55,85 C 55,58 72,48 100,48 C 128,48 145,58 145,85 C 145,112 128,122 100,122 C 72,122 55,112 55,85 Z" fill="#232E21" />
      {closedEyes ? (
        <>
          <path d="M 68,80 C 75,88 85,88 92,80" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M 108,80 C 115,88 125,88 132,80" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M 68,82 C 73,70 83,70 88,82" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 112,82 C 117,70 127,70 132,82" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="66" cy="94" rx="4" ry="2.5" fill="#698C5F" />
          <ellipse cx="134" cy="94" rx="4" ry="2.5" fill="#698C5F" />
        </>
      )}
    </>
  );
  return (
    <>
      <g transform="translate(100, 32)"><path d="M -16,-18 C -28,-36 0,-36 0,-16 C 0,-36 28,-36 16,-18 Z" fill="#4B6543" /></g>
      {tilted ? <g transform="rotate(-5, 100, 85)">{head}</g> : head}
    </>
  );
};

export const ChiaMascot: React.FC<ChiaMascotProps> = ({ pose = 'waving', size = 64, className = '', showSpeechBubble = false, speechText }) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <div style={{ width: pixelSize, height: pixelSize }}>
        {pose === 'icon' ? (
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm" fill="none">
            <rect width="200" height="200" rx="48" fill="#58724F" />
            <path d="M 50,110 C 50,70 70,55 100,55 C 130,55 150,70 150,110 C 150,145 130,160 100,160 C 70,160 50,145 50,110 Z" fill="#FFFFFF" />
            <rect x="38" y="95" width="14" height="30" rx="7" fill="#FFFFFF" />
            <rect x="148" y="95" width="14" height="30" rx="7" fill="#FFFFFF" />
            <path d="M 60,110 C 60,82 75,72 100,72 C 125,72 140,82 140,110 C 140,138 125,148 100,148 C 75,148 60,138 60,110 Z" fill="#202A1D" />
            <path d="M 72,108 C 77,96 87,96 92,108" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <path d="M 108,108 C 113,96 123,96 128,108" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="70" cy="120" rx="5" ry="3" fill="#7FA174" opacity="0.8" />
            <ellipse cx="130" cy="120" rx="5" ry="3" fill="#7FA174" opacity="0.8" />
            <g transform="translate(100, 55)">
              <path d="M 0,0 Q -2,-12 0,-18" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              <path d="M 0,-18 C -15,-32 -28,-18 0,-18 Z" fill="#FFFFFF" />
              <path d="M 0,-18 C 15,-32 28,-18 0,-18 Z" fill="#FFFFFF" />
            </g>
          </svg>
        ) : (
          <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-md" fill="none">
            <RobotHeadAndVisor closedEyes={pose === 'habits'} tilted={pose === 'suggesting'} />
            <path d="M 70,132 L 130,132 L 138,210 C 138,220 125,225 100,225 C 75,225 62,220 62,210 Z" fill="#F4F4F0" />
            <path d="M 72,142 L 128,142 L 133,212 C 133,218 120,222 100,222 C 80,222 67,218 67,212 Z" fill="#58724F" />
            {(pose === 'planning' || pose === 'waving') && <path d="M 100,165 Q 92,152 100,148 Q 108,152 100,165 Z" fill="#E8F0E5" />}
            {pose === 'planning' && (
              <>
                <g transform="translate(108, 140) rotate(-10)">
                  <rect width="55" height="42" rx="6" fill="#889882" stroke="#4B6543" strokeWidth="2" />
                  <rect x="4" y="4" width="47" height="34" rx="3" fill="#EAF0E8" />
                  <line x1="10" y1="12" x2="35" y2="12" stroke="#58724F" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="10" y1="20" x2="28" y2="20" stroke="#889882" strokeWidth="2" strokeLinecap="round" />
                  <line x1="10" y1="28" x2="38" y2="28" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
                </g>
                <ellipse cx="100" cy="170" rx="8" ry="6" fill="#FAFAFA" />
                <path d="M 152,48 L 162,40 M 160,60 L 172,58 M 156,72 L 168,76" stroke="#58724F" strokeWidth="3" strokeLinecap="round" />
              </>
            )}
            {pose === 'balanced' && (
              <>
                <g transform="translate(48, 145)">
                  <circle cx="20" cy="10" r="14" fill="#4E8752" /><circle cx="38" cy="8" r="16" fill="#386A3C" /><circle cx="58" cy="12" r="13" fill="#65A36A" />
                  <circle cx="28" cy="5" r="5" fill="#E07A5F" /><circle cx="48" cy="3" r="4" fill="#F4A261" /><circle cx="36" cy="14" r="4" fill="#E07A5F" />
                  <path d="M 5,16 C 5,16 10,40 40,40 C 70,40 75,16 75,16 Z" fill="#EAE8E0" stroke="#D0CDBF" strokeWidth="2" />
                </g>
                <path d="M 148,120 C 148,114 154,110 159,114 C 164,110 170,114 170,120 C 170,128 159,134 159,134 C 159,134 148,128 148,120 Z" fill="#E07A5F" />
              </>
            )}
            {pose === 'suggesting' && (
              <>
                <path d="M 115,180 C 120,160 125,130 118,122" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                <circle cx="118" cy="122" r="7" fill="#FAFAFA" />
                <text x="160" y="70" fill="#4B6543" fontSize="36" fontWeight="bold" fontFamily="sans-serif">?</text>
              </>
            )}
            {pose === 'habits' && (
              <g transform="translate(82, 160)">
                <rect width="36" height="30" rx="6" fill="#FFFFFF" stroke="#889882" strokeWidth="2" />
                <path d="M 36,8 C 44,8 44,22 36,22" stroke="#889882" strokeWidth="2" fill="none" />
                <path d="M 18,12 Q 13,20 18,22 Q 23,20 18,12 Z" fill="#58724F" />
                <path d="M 10,-8 Q 14,-14 10,-20 M 26,-8 Q 22,-14 26,-20" stroke="#B2C2B0" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            )}
            {pose === 'waving' && (
              <>
                <g transform="translate(145, 120) rotate(-25)">
                  <path d="M 0,0 C 15,-10 25,-25 35,-35" stroke="#FAFAFA" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="35" cy="-35" r="8" fill="#FAFAFA" />
                </g>
                <path d="M 180,75 C 185,82 185,92 180,98 M 190,70 C 197,80 197,95 190,105" stroke="#58724F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            )}
          </svg>
        )}
      </div>
      {showSpeechBubble && speechText && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white px-3 py-2 rounded-2xl border border-emerald-200/80 shadow-xs text-xs font-medium text-slate-800 whitespace-nowrap z-10 animate-fade-in">
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-b border-l border-emerald-200/80 rotate-45" />
          {speechText}
        </div>
      )}
    </div>
  );
};

export const ChiaLogo: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const iconSizes = { sm: 32, md: 40, lg: 48 };
  const textSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="shrink-0 transition-transform hover:scale-105 cursor-pointer"><ChiaMascot pose="icon" size={iconSizes[size]} /></div>
      <div className={`font-bold tracking-tight text-[#3B5434] font-sans flex items-center leading-none ${textSizes[size]}`}>chia</div>
    </div>
  );
};

export const ChiaAssistantBanner: React.FC<{
  pose?: ChiaPose; title: string; description: string; badgeText?: string; actionButton?: React.ReactNode; className?: string;
}> = ({ pose = 'balanced', title, description, badgeText = 'Chia Rehberlik Ediyor', actionButton, className = '' }) => (
  <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F2F6F0] via-[#FAF8F3] to-[#EAF0E8] border border-[#C9D8C3] shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4 ${className}`}>
    <div className="flex items-start sm:items-center gap-3.5">
      <div className="shrink-0 p-1 bg-white rounded-2xl border border-[#C9D8C3] shadow-2xs"><ChiaMascot pose={pose} size={56} /></div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B5434] bg-[#E3ECE0] px-2 py-0.5 rounded-full border border-[#C9D8C3]">{badgeText}</span>
        </div>
        <h3 className="text-sm font-bold text-[#1F2B1D]">{title}</h3>
        <p className="text-xs text-[#4A5D46] max-w-2xl leading-relaxed">{description}</p>
      </div>
    </div>
    {actionButton && <div className="shrink-0 self-start md:self-start flex items-center justify-end">{actionButton}</div>}
  </div>
);

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'Vazgeç',
  type = 'warning',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const iconBg = isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-800';
  const confirmBtnBg = isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-amber-800 hover:bg-amber-900 text-white';

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-900 animate-in zoom-in-95 p-6 text-center space-y-4">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center mx-auto`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer flex-1"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl ${confirmBtnBg} text-xs font-semibold transition-colors cursor-pointer flex-1 shadow-2xs`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};