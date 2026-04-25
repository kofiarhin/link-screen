const Session = require('../models/Session');

describe('Session model', () => {
  test('tracks session state fields', () => {
    const expiresAt = new Date(Date.now() + 60000);
    const session = new Session({
      _id: 'model-session',
      hostToken: 'token-123',
      hostSocketId: 'host-a',
      viewerSocketId: 'viewer-a',
      status: 'connected',
      active: true,
      expiresAt,
    });

    expect(session._id).toBe('model-session');
    expect(session.hostToken).toBe('token-123');
    expect(session.hostSocketId).toBe('host-a');
    expect(session.viewerSocketId).toBe('viewer-a');
    expect(session.status).toBe('connected');
    expect(session.active).toBe(true);
    expect(session.expiresAt.toISOString()).toBe(expiresAt.toISOString());
  });

  test('defaults status and active correctly', () => {
    const session = new Session({
      _id: 'model-default-session',
      hostToken: 'token-default',
      expiresAt: new Date(Date.now() + 60000),
    });

    expect(session.status).toBe('created');
    expect(session.active).toBe(true);
    expect(session.hostSocketId).toBeNull();
    expect(session.viewerSocketId).toBeNull();
  });
});
