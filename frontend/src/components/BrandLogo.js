import React from 'react';

const BrandLogo = ({ className = '', alt = 'Deeply Fit logo' }) => (
  <img
    className={`brand-logo ${className}`.trim()}
    src="/deeplyfit-logo.png"
    alt={alt}
    draggable="false"
  />
);

export default BrandLogo;
