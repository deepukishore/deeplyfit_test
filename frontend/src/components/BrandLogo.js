import React from 'react';

const PUBLIC_URL = process.env.PUBLIC_URL || '';

const BrandLogo = ({ className = '', alt = 'Deeply Fit logo', priority = false }) => {
  const filename = priority ? 'deeplyfit-logo-loading.png' : 'deeplyfit-logo.png';

  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src={`${PUBLIC_URL}/${filename}`}
      alt={alt}
      width={priority ? 144 : 1254}
      height={priority ? 144 : 1254}
      loading={priority ? 'eager' : undefined}
      decoding={priority ? 'sync' : 'async'}
      fetchpriority={priority ? 'high' : undefined}
      draggable="false"
    />
  );
};

export default BrandLogo;
