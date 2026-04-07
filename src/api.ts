export type ApiProfile = {
  username: string;
  displayName: string;
};

export type ApiContact = {
  id: number;
  username: string;
  name: string;
  lastMessageText: string;
  lastMessageTime: string;
  updatedAt: string;
};

export type ApiMessage = {
  id: number;
  text: string;
  time: string;
  sender: 'me' | 'contact';
};

const API_BASE = 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function registerProfile(profile: ApiProfile) {
  return request<ApiProfile>('/profile', {
    method: 'POST',
    body: JSON.stringify(profile)
  });
}

export function fetchChats(username: string) {
  return request<ApiContact[]>(`/chats?username=${encodeURIComponent(username)}`);
}

export function createChat(username: string, contactUsername: string) {
  return request<ApiContact>('/chats', {
    method: 'POST',
    body: JSON.stringify({ username, contactUsername })
  });
}

export function fetchMessages(chatId: number, username: string) {
  return request<ApiMessage[]>(
    `/chats/${chatId}/messages?username=${encodeURIComponent(username)}`
  );
}

export function sendMessage(chatId: number, senderUsername: string, text: string) {
  return request<ApiMessage>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderUsername, text })
  });
}
