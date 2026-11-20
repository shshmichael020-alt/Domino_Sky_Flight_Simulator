import React, { ReactNode } from 'react';

export interface KpiCardProps {
  title: string;
  icon: ReactNode;
  value: ReactNode;
  subValue?: ReactNode;
  footer: ReactNode;
  diffBadge?: ReactNode;
  bottomBarColor: string;
  isAlert?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  icon,
  value,
  subValue,
  footer,
  diffBadge,
  bottomBarColor,
  isAlert,
}) => {
  return (
    <div
      className={`p-3 rounded border flex flex-col justify-between relative overflow-hidden transition-all ${
        isAlert
          ? 'bg-[#93000a]/20 border-[#ffb4ab] ring-1 ring-[#ffb4ab]/40'
          : 'bg-[#151b2b] border-[#242a3a]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            isAlert ? 'text-[#ffb4ab] font-bold' : 'text-[#869397]'
          }`}
        >
          {title}
        </span>
        {icon}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-mono text-2xl font-bold ${
            isAlert ? 'text-[#ffb4ab]' : 'text-[#dde2f8]'
          }`}
        >
          {value}
        </span>
        {subValue && (
          <span className="text-[11px] font-mono text-[#869397]">{subValue}</span>
        )}
      </div>

      <div className="mt-1">{footer}</div>

      {diffBadge && <div className="mt-1">{diffBadge}</div>}

      <div
        className={`absolute bottom-0 left-0 h-[2px] w-full ${bottomBarColor}`}
      ></div>
    </div>
  );
};
