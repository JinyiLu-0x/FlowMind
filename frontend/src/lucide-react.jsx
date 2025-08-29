import React from 'react';

const make = (emoji) => ({ size = 18, className, ...props }) =>
  (
    <span
      role="img"
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        verticalAlign: 'middle',
        textAlign: 'center',
      }}
      {...props}
    >
      {emoji}
    </span>
  );

// 导出 FlowMind.jsx 中使用到的名称（emoji 占位）
export const Calendar = make('📅');
export const Plus = make('➕');
export const User = make('👤');
export const Brain = make('🧠');
export const Clock = make('⏰');
export const Tag = make('🏷️');
export const Trash2 = make('🗑️');
export const Edit3 = make('✏️');
export const CheckCircle = make('✅');
export const Circle = make('⚪');
export const Lightbulb = make('💡');
export const FileText = make('📄');
export const Settings = make('⚙️');
export const ChevronDown = make('▾');

export default {};