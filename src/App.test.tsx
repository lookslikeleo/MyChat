import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

test('requires entering username and display name before showing contacts', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /create your profile/i })).toBeInTheDocument();
  expect(screen.queryByText(/maya chen/i)).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'Looks Dev' },
  });
  fireEvent.change(screen.getByLabelText(/display name/i), {
    target: { value: 'Looks Developer' },
  });
  fireEvent.click(screen.getByRole('button', { name: /continue to chats/i }));

  expect(screen.getByRole('heading', { name: /looks developer's chats/i })).toBeInTheDocument();
  expect(screen.getByText('@looksdev')).toBeInTheDocument();
  expect(screen.getByText(/maya chen/i)).toBeInTheDocument();
  expect(window.localStorage.getItem('mychat-user-profile')).toBe(
    JSON.stringify({ username: 'looksdev', displayName: 'Looks Developer' })
  );
});

test('renders chats directly when a user profile was already saved', () => {
  window.localStorage.setItem(
    'mychat-user-profile',
    JSON.stringify({ username: 'samrivera', displayName: 'Sam Rivera' })
  );

  render(<App />);

  expect(screen.getByRole('heading', { name: /sam rivera's chats/i })).toBeInTheDocument();
  expect(screen.getByText('@samrivera')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /daniel brooks/i }));

  expect(screen.getByRole('heading', { name: 'Daniel Brooks' })).toBeInTheDocument();
  expect(screen.queryByText(/sam rivera's chats/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /back/i }));

  expect(screen.getByRole('heading', { name: /sam rivera's chats/i })).toBeInTheDocument();
});
