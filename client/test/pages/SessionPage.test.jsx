import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionPage from '../../src/pages/SessionPage';
import { SOCKET_EVENTS } from '../../src/constants/constants';

const { mockUseSession, handlers, socketMock } = vi.hoisted(() => {
  const handlers = {};
  return {
    mockUseSession: vi.fn(),
    handlers,
    socketMock: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event, cb) => {
        handlers[event] = cb;
      }),
      off: vi.fn((event) => {
        delete handlers[event];
      }),
    },
  };
});

vi.mock('../../src/hooks/queries/useSession', () => ({
  useSession: (...args) => mockUseSession(...args),
}));

vi.mock('../../src/lib/socket', () => ({ default: socketMock }));
vi.mock('../../src/lib/webrtc', () => ({
  createPeerConnection: () => ({
    addTrack: vi.fn(),
    close: vi.fn(),
    createAnswer: vi.fn(async () => ({})),
    createOffer: vi.fn(async () => ({})),
    setLocalDescription: vi.fn(async () => {}),
    setRemoteDescription: vi.fn(async () => {}),
    addIceCandidate: vi.fn(async () => {}),
    localDescription: {},
    signalingState: 'stable',
    connectionState: 'new',
  }),
}));

vi.mock('../../src/services/sessionService', () => ({ endSession: vi.fn(async () => ({})) }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(handlers).forEach((key) => delete handlers[key]);
  window.RTCPeerConnection = vi.fn();
  window.RTCSessionDescription = vi.fn((value) => value);
  window.RTCIceCandidate = vi.fn((value) => value);
  window.MediaStream = vi.fn(() => ({ addTrack: vi.fn() }));
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getDisplayMedia: vi.fn(async () => ({
        getTracks: () => [{ stop: vi.fn() }],
        getVideoTracks: () => [{ addEventListener: vi.fn() }],
      })),
    },
    configurable: true,
  });
});

function renderRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/session/:id" element={<SessionPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SessionPage', () => {
  test('permission denied UI for host', async () => {
    navigator.mediaDevices.getDisplayMedia.mockRejectedValue({ name: 'NotAllowedError' });
    mockUseSession.mockReturnValue({ data: null, isLoading: false, isError: false });

    renderRoute('/session/abc?hostToken=token');

    await waitFor(() => {
      expect(screen.getByText('Screen sharing error')).toBeTruthy();
    });
  });

  test('invalid session UI for viewer', async () => {
    mockUseSession.mockReturnValue({ data: null, isLoading: false, isError: true });

    renderRoute('/session/invalid');

    expect(await screen.findByText('Invalid Session')).toBeTruthy();
  });

  test('session ended UI for viewer', async () => {
    mockUseSession.mockReturnValue({
      data: { sessionId: 'abc', active: true, status: 'waiting' },
      isLoading: false,
      isError: false,
    });

    renderRoute('/session/abc');

    await waitFor(() => {
      expect(socketMock.on).toHaveBeenCalledWith(SOCKET_EVENTS.SESSION_END, expect.any(Function));
    });

    handlers[SOCKET_EVENTS.SESSION_END]();

    expect(await screen.findByText('Session Ended')).toBeTruthy();
  });
});
