import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/api', () => ({ api: vi.fn(() => Promise.resolve({})) }));
import { api } from '../../services/api';
import { chatApi } from './chatApi';

describe('chatApi', () => {
  beforeEach(() => api.mockClear());

  it("bo'sh parametrlarni tushirib qoldiradi", () => {
    chatApi.contacts(undefined, 'ali');
    chatApi.conversations();
    chatApi.messages(7, { after: 12 });
    expect(api.mock.calls.map((c) => c[0])).toEqual([
      '/chat/contacts?q=ali',
      '/chat/conversations',
      '/chat/conversations/7/messages?after=12',
    ]);
  });

  it('suhbat ochish va xabar yuborish', () => {
    chatApi.open({ role: 'OPERATOR' });
    chatApi.send(3, 'salom');
    expect(api).toHaveBeenNthCalledWith(1, '/chat/conversations', { method: 'POST', body: { participantId: undefined, role: 'OPERATOR', orderId: undefined } });
    expect(api).toHaveBeenNthCalledWith(2, '/chat/conversations/3/messages', { method: 'POST', body: { text: 'salom' } });
  });
});
