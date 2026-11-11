import React from 'react';

/**
 * Official-style SVG Brand Logos for Indian UPI Payment Providers
 */

export const GooglePayLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* White pill background with soft border */}
    <rect width="48" height="48" rx="14" fill="#FFFFFF" />
    <rect
      x="1"
      y="1"
      width="46"
      height="46"
      rx="13"
      stroke="#E2E8F0"
      strokeWidth="1.5"
    />
    {/* Google multi-color G */}
    <path
      d="M34.5 24.3c0-.7-.06-1.4-.18-2H24v4.2h5.9c-.25 1.4-1.04 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.4z"
      fill="#4285F4"
    />
    <path
      d="M24 35c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H14v2.9C15.8 32.5 19.6 35 24 35z"
      fill="#34A853"
    />
    <path
      d="M17.8 26c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3v-2.9h-3.8c-.8 1.6-1.3 3.3-1.3 5.2s.5 3.6 1.3 5.2l3.8-2.9z"
      fill="#FBBC05"
    />
    <path
      d="M24 17.2c1.6 0 3.1.6 4.3 1.7l3.2-3.2C29.5 13.9 26.9 13 24 13c-4.4 0-8.2 2.5-10 6.1l3.8 2.9c.9-2.7 3.3-4.8 6.2-4.8z"
      fill="#EA4335"
    />
  </svg>
);

export const PhonePeLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Official PhonePe Purple circle */}
    <rect width="48" height="48" rx="14" fill="#5F259F" />
    {/* White Devanagari 'पे' ligature */}
    <g fill="#FFFFFF">
      {/* Top horizontal bar (Shirorekha) */}
      <rect x="13" y="14" width="22" height="3" rx="1.5" />
      {/* Matra (top accent) */}
      <path
        d="M22 14c0-3.5 3-7 6.5-7 1.2 0 1.8.8 1.4 1.8-.8 2-3.8 4.5-6.5 5.2h-1.4z"
        fill="#FFFFFF"
      />
      {/* Main character 'प' loop & vertical stem */}
      <path
        d="M18 17v7.5c0 3 2.2 5 5 5h3.5v9h3.8V17H27v8.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5V17H18z"
        fill="#FFFFFF"
      />
    </g>
  </svg>
);

export const PaytmLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* White background badge */}
    <rect width="48" height="48" rx="14" fill="#FFFFFF" />
    <rect
      x="1"
      y="1"
      width="46"
      height="46"
      rx="13"
      stroke="#E2E8F0"
      strokeWidth="1.5"
    />
    {/* Stylized official Paytm typography */}
    {/* 'Pay' in Dark Navy */}
    <g fill="#002E6E">
      <path d="M11 16h5.2c2.5 0 4.1 1.4 4.1 3.5 0 2.2-1.6 3.6-4.1 3.6h-2.7v5.5H11V16zm2.5 5.2h2.5c1.1 0 1.9-.6 1.9-1.7 0-1-.8-1.6-1.9-1.6h-2.5v3.3z" />
    </g>
    {/* 'tm' in Bright Cyan */}
    <g fill="#00BAF2">
      <path d="M21.5 19.8h2.3v1.8h-2.3v4.4c0 .8.4 1.2 1.2 1.2.4 0 .8-.1 1.1-.2v1.7c-.5.2-1.2.3-1.8.3-2 0-3-.9-3-2.6v-4.8h-1.6v-1.8h1.6v-2.3h2.5v2.3z" />
      <path d="M27 19.8h2.3v1.3c.7-1 1.7-1.5 2.8-1.5 1.3 0 2.3.6 2.8 1.6.8-1.1 2-1.6 3.2-1.6 1.8 0 3.1 1.2 3.1 3.3v5.7h-2.4v-5.2c0-1.1-.6-1.8-1.6-1.8-1 0-1.7.8-1.7 2v5h-2.4v-5.2c0-1.1-.6-1.8-1.6-1.8-1 0-1.7.8-1.7 2v5H27v-8.8z" />
    </g>
  </svg>
);

export const UpiGenericLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="48" height="48" rx="14" fill="#FFFFFF" />
    <rect
      x="1"
      y="1"
      width="46"
      height="46"
      rx="13"
      stroke="#E2E8F0"
      strokeWidth="1.5"
    />
    {/* NPCI UPI Chevrons / Arrows */}
    <path d="M21 14l6 10-6 10h5.5l6-10-6-10H21z" fill="#097939" />
    <path d="M14 14l6 10-6 10h5.5l6-10-6-10H14z" fill="#ED752E" />
  </svg>
);

