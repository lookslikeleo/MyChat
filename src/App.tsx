import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  ApiContact,
  ApiMessage,
  createChat,
  fetchChats,
  fetchMessages,
  registerProfile,
  sendMessage
} from './api';

type UserProfile = {
  username: string;
  displayName: string;
};

const STORAGE_KEY = 'mychat-user-profile';
const accents = ['#58a6ff', '#ff8a5b', '#4bb7a8', '#c587ff', '#ff6fa8', '#6c8cff'];

function accentForUsername(username: string) {
  const total = username.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return accents[total % accents.length];
}

function App() {
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [contactUsernameInput, setContactUsernameInput] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(STORAGE_KEY);

    if (!savedProfile) {
      return;
    }

    try {
      const parsedProfile = JSON.parse(savedProfile) as Partial<UserProfile>;

      if (
        typeof parsedProfile.username === 'string' &&
        typeof parsedProfile.displayName === 'string' &&
        parsedProfile.username.trim() &&
        parsedProfile.displayName.trim()
      ) {
        setUserProfile({
          username: parsedProfile.username.trim(),
          displayName: parsedProfile.displayName.trim()
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeContact = contacts.find((contact) => contact.id === activeContactId) ?? null;

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    registerProfile(userProfile).catch(() => {
      setConnectionError('Could not sync your profile with the local backend.');
    });
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    let cancelled = false;

    const loadChats = async () => {
      try {
        const nextContacts = await fetchChats(userProfile.username);

        if (!cancelled) {
          setContacts(nextContacts);
          setConnectionError('');
          setActiveContactId((currentId) => {
            if (!currentId) {
              return currentId;
            }

            return nextContacts.some((contact) => contact.id === currentId) ? currentId : null;
          });
        }
      } catch {
        if (!cancelled) {
          setConnectionError('Local backend not reachable. Start `npm run server`.');
        }
      }
    };

    loadChats();
    const intervalId = window.setInterval(loadChats, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile || !activeContactId) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const nextMessages = await fetchMessages(activeContactId, userProfile.username);

        if (!cancelled) {
          setMessages(nextMessages);
          setConnectionError('');
        }
      } catch {
        if (!cancelled) {
          setConnectionError('Could not load messages from the local backend.');
        }
      }
    };

    loadMessages();
    const intervalId = window.setInterval(loadMessages, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeContactId, userProfile]);

  const conversationSubtitle = useMemo(() => {
    if (!activeContact) {
      return '';
    }

    return `@${activeContact.username}`;
  }, [activeContact]);

  const handleCreateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = usernameInput.trim().replace(/\s+/g, '').toLowerCase();
    const normalizedDisplayName = displayNameInput.trim();

    if (!normalizedUsername || !normalizedDisplayName) {
      return;
    }

    const nextProfile = {
      username: normalizedUsername,
      displayName: normalizedDisplayName
    };

    try {
      await registerProfile(nextProfile);
      setUserProfile(nextProfile);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
      setConnectionError('');
    } catch {
      setConnectionError('Could not save your profile. Make sure the local backend is running.');
    }
  };

  const handleAddContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userProfile) {
      return;
    }

    const normalizedUsername = contactUsernameInput.trim().replace(/\s+/g, '').toLowerCase();

    if (!normalizedUsername) {
      return;
    }

    try {
      const chat = await createChat(userProfile.username, normalizedUsername);
      setIsAddContactOpen(false);
      setContactUsernameInput('');
      setActiveContactId(chat.id);
      setConnectionError('');
      setContacts((currentContacts) => {
        const exists = currentContacts.some((contact) => contact.id === chat.id);

        if (exists) {
          return currentContacts;
        }

        return [
          {
            ...chat,
            lastMessageText: '',
            lastMessageTime: '',
            updatedAt: new Date().toISOString()
          },
          ...currentContacts
        ];
      });
    } catch {
      setConnectionError('Could not create the chat. Make sure the backend is running.');
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeContact || !userProfile || !draftMessage.trim()) {
      return;
    }

    try {
      await sendMessage(activeContact.id, userProfile.username, draftMessage.trim());
      setDraftMessage('');
      setConnectionError('');
      setMessages(await fetchMessages(activeContact.id, userProfile.username));
      setContacts(await fetchChats(userProfile.username));
    } catch {
      setConnectionError('Could not send the message. Make sure the backend is running.');
    }
  };

  if (!userProfile) {
    return (
      <main className="messenger-shell">
        <section className="device-frame onboarding-frame">
          <section className="onboarding-panel">
            <p className="eyebrow">MyChat</p>
            <h1>Create your profile</h1>
            <p className="sidebar-copy">
              This browser-based chat app needs a username and display name before showing your
              contacts.
            </p>

            <form className="profile-form" onSubmit={handleCreateProfile}>
              <label className="profile-field">
                <span>Username</span>
                <input
                  autoComplete="username"
                  onChange={(event) => setUsernameInput(event.target.value)}
                  placeholder="yourname"
                  type="text"
                  value={usernameInput}
                />
              </label>

              <label className="profile-field">
                <span>Display name</span>
                <input
                  onChange={(event) => setDisplayNameInput(event.target.value)}
                  placeholder="Your Name"
                  type="text"
                  value={displayNameInput}
                />
              </label>

              <button className="primary-button" type="submit">
                Continue to chats
              </button>
            </form>

            {connectionError ? <p className="error-copy">{connectionError}</p> : null}
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="messenger-shell">
      <section className={`device-frame${activeContact ? ' chat-open' : ''}`}>
        {activeContact ? (
          <section className="conversation-panel">
            <header className="conversation-header">
              <div className="conversation-main">
                <button
                  className="back-button"
                  onClick={() => setActiveContactId(null)}
                  type="button"
                >
                  Back
                </button>

                <div className="conversation-title">
                  <span
                    className="avatar large"
                    style={{
                      background: `linear-gradient(135deg, ${accentForUsername(
                        activeContact.username
                      )}, #ffffff)`
                    }}
                    aria-hidden="true"
                  >
                    {activeContact.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)}
                  </span>

                  <div>
                    <h2>{activeContact.name}</h2>
                    <p>{conversationSubtitle}</p>
                  </div>
                </div>
              </div>

              <div className="conversation-actions">
                <span>@{activeContact.username}</span>
                <span>Local backend sync</span>
              </div>
            </header>

            <div className="message-thread">
              {messages.length > 0 ? (
                <>
                  <div className="thread-date">Now</div>

                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`message-row ${message.sender === 'me' ? 'outgoing' : 'incoming'}`}
                    >
                      <div className="message-bubble">
                        <p>{message.text}</p>
                        <span>{message.time}</span>
                      </div>
                    </article>
                  ))}
                </>
              ) : (
                <div className="chat-empty-state">
                  <h3>Start chatting with @{activeContact.username}</h3>
                  <p>This chat is synced through your local SQLite backend.</p>
                </div>
              )}
            </div>

            <form className="composer" onSubmit={handleSendMessage}>
              <label className="composer-field">
                <span className="sr-only">Message input</span>
                <input
                  type="text"
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder={`Message @${activeContact.username}...`}
                />
              </label>
              <button type="submit">Send</button>
            </form>
          </section>
        ) : (
          <aside className="sidebar">
            <div className="brand-panel">
              {isSettingsOpen ? (
                <div className="settings-placeholder">
                  <p className="eyebrow">Settings</p>
                  <h1>Coming soon</h1>
                  <p className="sidebar-copy">
                    Settings do not exist yet, but this is where they will open.
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => setIsSettingsOpen(false)}
                    type="button"
                  >
                    Back to chats
                  </button>
                </div>
              ) : (
                <>
                  <div className="sidebar-toolbar">
                    <p className="eyebrow">MyChat</p>
                    <button
                      aria-label="Open settings"
                      className="icon-button"
                      onClick={() => setIsSettingsOpen(true)}
                      type="button"
                    >
                      <span aria-hidden="true">{'\u2699'}</span>
                    </button>
                  </div>
                  <h1>{userProfile.displayName}'s chats</h1>
                  <p className="sidebar-copy">@{userProfile.username}</p>
                  {connectionError ? <p className="error-copy">{connectionError}</p> : null}
                </>
              )}
            </div>

            {!isSettingsOpen ? (
              <>
                <div className="contact-list" aria-label="Contact list">
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <button
                        key={contact.id}
                        className="contact-card"
                        onClick={() => setActiveContactId(contact.id)}
                        type="button"
                      >
                        <span
                          className="avatar"
                          style={{
                            background: `linear-gradient(135deg, ${accentForUsername(
                              contact.username
                            )}, #ffffff)`
                          }}
                          aria-hidden="true"
                        >
                          {contact.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </span>

                        <span className="contact-meta">
                          <span className="contact-topline">
                            <span className="contact-name">{contact.name}</span>
                            <span className="contact-time">
                              {contact.lastMessageTime || 'New'}
                            </span>
                          </span>
                          <span className="contact-preview">
                            {contact.lastMessageText || '@' + contact.username}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-contacts">
                      <h2>No contacts yet</h2>
                      <p>Tap the plus button to add a username and start a synced chat.</p>
                    </div>
                  )}
                </div>

                <button
                  aria-label="Add contact"
                  className="floating-action-button"
                  onClick={() => setIsAddContactOpen(true)}
                  type="button"
                >
                  +
                </button>

                {isAddContactOpen ? (
                  <div className="modal-overlay" role="dialog" aria-modal="true">
                    <form className="add-contact-modal" onSubmit={handleAddContact}>
                      <h2>Add by username</h2>
                      <p>Enter a username to create a synced local chat for that person.</p>

                      <label className="profile-field">
                        <span>Username</span>
                        <input
                          autoFocus
                          onChange={(event) => setContactUsernameInput(event.target.value)}
                          placeholder="friendname"
                          type="text"
                          value={contactUsernameInput}
                        />
                      </label>

                      <div className="modal-actions">
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setIsAddContactOpen(false);
                            setContactUsernameInput('');
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button className="primary-button" type="submit">
                          Add chat
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="settings-empty-panel" aria-label="Settings placeholder" />
            )}
          </aside>
        )}
      </section>
    </main>
  );
}

export default App;
