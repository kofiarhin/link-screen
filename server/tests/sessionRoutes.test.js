const mockSave = jest.fn();

jest.mock('../models/Session', () => {
  function Session(data) {
    Object.assign(this, data);
    this.save = mockSave;
  }

  Session.findById = jest.fn();
  return Session;
});

const request = require('supertest');
const app = require('../app');
const Session = require('../models/Session');

describe('session routes', () => {
  test('create session', async () => {
    mockSave.mockResolvedValueOnce({});

    const res = await request(app).post('/api/sessions');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(res.body.data.hostToken).toBeDefined();
    expect(res.body.data.hostUrl).toContain('hostToken=');
    expect(res.body.data.viewerUrl).toContain(`/session/${res.body.data.sessionId}`);
  });

  test('validate session', async () => {
    Session.findById.mockResolvedValueOnce({
      _id: 'session-id',
      active: true,
      status: 'waiting',
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await request(app).get('/api/sessions/session-id');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBe('session-id');
  });

  test('expired session rejected', async () => {
    Session.findById.mockResolvedValueOnce({
      _id: 'expired',
      active: true,
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).get('/api/sessions/expired');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Session not found or expired' });
  });

  test('inactive session rejected', async () => {
    Session.findById.mockResolvedValueOnce({
      _id: 'inactive',
      active: false,
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await request(app).get('/api/sessions/inactive');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Session not found or expired' });
  });

  test('invalid session returns error', async () => {
    Session.findById.mockResolvedValueOnce(null);

    const res = await request(app).get('/api/sessions/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Session not found or expired' });
  });
});
