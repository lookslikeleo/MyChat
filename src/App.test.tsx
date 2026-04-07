import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

type MockUser = {
  username: string;
  displayName: string;
};

type MockChat = {
  id: number;
  userOne: string;
  userTwo: string;
  updatedAt: string;
};

type MockMessage = {
  id: number;
  chatId: number;
  senderUsername: string;
  text: string;
  createdAt: string;
};

function createJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response;
}

function installFetchMock() {
  const users = new Map<string, MockUser>();
  const chats: MockChat[] = [];
  const messages: MockMessage[] = [];

  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const path = url.pathname;
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;

    if (path === '/api/profile' && method === 'POST') {
      users.set(body.username, {
        username: body.username,
        displayName: body.displayName
      });

      return createJsonResponse(body);
    }

    if (path === '/api/chats' && method === 'GET') {
      const username = String(url.searchParams.get('username') || '');
      const result = chats
        .filter((chat) => chat.userOne === username || chat.userTwo === username)
        .map((chat) => {
          const contactUsername = chat.userOne === username ? chat.userTwo : chat.userOne;
          const latestMessage = [...messages]
            .filter((message) => message.chatId === chat.id)
            .sort((left, right) => right.id - left.id)[0];

          return {
            id: chat.id,
            username: contactUsername,
            name: users.get(contactUsername)?.displayName || contactUsername,
            lastMessageText: latestMessage?.text || '',
            lastMessageTime: latestMessage ? '12:00' : '',
            updatedAt: chat.updatedAt
          };
        });

      return createJsonResponse(result);
    }

    if (path === '/api/chats' && method === 'POST') {
      const first = body.username;
      const second = body.contactUsername;
      const [userOne, userTwo] = [first, second].sort();

      if (!users.has(first)) {
        users.set(first, { username: first, displayName: first });
      }

      if (!users.has(second)) {
        users.set(second, {
          username: second,
          displayName: second
            .split(/[._-]/)
            .filter(Boolean)
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        });
      }

      let chat = chats.find((item) => item.userOne === userOne && item.userTwo === userTwo);

      if (!chat) {
        chat = {
          id: chats.length + 1,
          userOne,
          userTwo,
          updatedAt: new Date().toISOString()
        };
        chats.push(chat);
      }

      return createJsonResponse({
        id: chat.id,
        username: first === userOne ? userTwo : userOne,
        name: users.get(first === userOne ? userTwo : userOne)?.displayName
      });
    }

    const messageGetMatch = path.match(/^\/api\/chats\/(\d+)\/messages$/);

    if (messageGetMatch && method === 'GET') {
      const chatId = Number(messageGetMatch[1]);
      const username = String(url.searchParams.get('username') || '');
      const result = messages
        .filter((message) => message.chatId === chatId)
        .map((message) => ({
          id: message.id,
          text: message.text,
          time: '12:00',
          sender: message.senderUsername === username ? 'me' : 'contact'
        }));

      return createJsonResponse(result);
    }

    if (messageGetMatch && method === 'POST') {
      const chatId = Number(messageGetMatch[1]);
      const nextMessage = {
        id: messages.length + 1,
        chatId,
        senderUsername: body.senderUsername,
        text: body.text,
        createdAt: new Date().toISOString()
      };
      messages.push(nextMessage);
      const chat = chats.find((item) => item.id === chatId);

      if (chat) {
        chat.updatedAt = nextMessage.createdAt;
      }

      return createJsonResponse({
        id: nextMessage.id,
        text: nextMessage.text,
        time: '12:00',
        sender: 'me'
      });
    }

    return createJsonResponse({ error: 'not found' }, 404);
  }) as jest.Mock;
}

beforeEach(() => {
  window.localStorage.clear();
  installFetchMock();
});

afterEach(() => {
  jest.resetAllMocks();
});

test('requires entering username and display name before showing chats', async () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'Looks Dev' }
  });
  fireEvent.change(screen.getByLabelText(/display name/i), {
    target: { value: 'Looks Developer' }
  });
  fireEvent.click(screen.getByRole('button', { name: /continue to chats/i }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /looks developer's chats/i })).toBeInTheDocument();
  });

  expect(screen.getByText('@looksdev')).toBeInTheDocument();
  expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
});

test('adding a username creates a synced chat visible to the other user', async () => {
  window.localStorage.setItem(
    'mychat-user-profile',
    JSON.stringify({ username: 'alice', displayName: 'Alice' })
  );

  const firstView = render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /alice's chats/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /add contact/i }));
  fireEvent.change(screen.getByLabelText(/^username$/i), {
    target: { value: 'bob' }
  });
  fireEvent.click(screen.getByRole('button', { name: /add chat/i }));

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Bob' })).toBeInTheDocument();
  });

  firstView.unmount();

  window.localStorage.setItem(
    'mychat-user-profile',
    JSON.stringify({ username: 'bob', displayName: 'Bob' })
  );

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /bob's chats/i })).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
