import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: { height: '36px', borderRadius: '10px', padding: '3px' },
    md: { height: '48px', borderRadius: '12px', padding: '4px' },
    lg: { height: '90px', borderRadius: '18px', padding: '8px' },
    xl: { height: '140px', borderRadius: '24px', padding: '12px' },
  };

  const selected = sizeStyles[size];

  return (
    <div
      className={`brand-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: selected.borderRadius,
        padding: selected.padding,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), 0 0 1px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src="/logo.png"
        alt="MEVACOL Distribuciones"
        style={{
          height: selected.height,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
};
