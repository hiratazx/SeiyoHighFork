/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';

interface SegmentLoadingOverlayProps {
  isVisible: boolean;
  message: string;
}

export const SegmentLoadingOverlay: React.FC<SegmentLoadingOverlayProps> = ({ isVisible, message }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center transition-opacity duration-500 animate-fade-in">
      <p className="text-white text-2xl font-serif animate-pulse">
        {message}
      </p>
    </div>
  );
};
