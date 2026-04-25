import React from 'react';
import { render, screen } from '@testing-library/react';
import BrowserGuard from '../../src/components/BrowserGuard';

describe('BrowserGuard', () => {
  const originalRTC = window.RTCPeerConnection;
  const originalMediaDevices = navigator.mediaDevices;

  afterEach(() => {
    window.RTCPeerConnection = originalRTC;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    });
  });

  test('host requires getDisplayMedia', () => {
    window.RTCPeerConnection = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      configurable: true,
    });

    render(
      <BrowserGuard role="host">
        <div>child</div>
      </BrowserGuard>
    );

    expect(screen.queryByText('child')).not.toBeTruthy();
    expect(screen.getByText('Browser not supported')).toBeTruthy();
  });

  test('viewer does NOT require getDisplayMedia', () => {
    window.RTCPeerConnection = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {},
      configurable: true,
    });

    render(
      <BrowserGuard role="viewer">
        <div>viewer child</div>
      </BrowserGuard>
    );

    expect(screen.getByText('viewer child')).toBeTruthy();
  });
});
