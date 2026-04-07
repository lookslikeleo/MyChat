import React, { FormEvent, useEffect, useState } from 'react';
import './App.css';

type Message = {
  id: number;
  text: string;
  time: string;
  sender: 'me' | 'contact';
};

type Contact = {
  id: number;
  name: string;
  status: string;
  phone: string;
  lastSeen: string;
  accent: string;
  messages: Message[];
};

type UserProfile = {
  username: string;
  displayName: string;
};

const STORAGE_KEY = 'mychat-user-profile';

const contacts: Contact[] = [
  {
    id: 1,
    name: 'Maya Chen',
    status: 'Online now',
    phone: '+49 152 1448 2291',
    lastSeen: 'Seen 2 min ago',
    accent: '#ff8a5b',
    messages: [
      { id: 1, text: 'Hey, are we still meeting after work?', time: '18:04', sender: 'contact' },
      { id: 2, text: 'Yes, let us do 7:30 near the station.', time: '18:06', sender: 'me' },
      { id: 3, text: 'Perfect. I will send the table number when I get there.', time: '18:08', sender: 'contact' },
    ],
  },
  {
    id: 2,
    name: 'Daniel Brooks',
    status: 'Typing a lot',
    phone: '+49 176 9012 4731',
    lastSeen: 'Seen just now',
    accent: '#4bb7a8',
    messages: [
      { id: 1, text: 'Can you review the homepage copy later?', time: '15:20', sender: 'contact' },
      { id: 2, text: 'Sure, send me the draft and I will mark it up.', time: '15:24', sender: 'me' },
      { id: 3, text: 'Nice, I am cleaning it up now.', time: '15:27', sender: 'contact' },
    ],
  },
  {
    id: 3,
    name: 'Sofia Alvarez',
    status: 'Last active today',
    phone: '+49 157 3388 6190',
    lastSeen: 'Seen 45 min ago',
    accent: '#6c8cff',
    messages: [
      { id: 1, text: 'I dropped the photos into the shared folder.', time: '11:42', sender: 'contact' },
      { id: 2, text: 'Amazing, I will pull the best ones for the post.', time: '11:46', sender: 'me' },
    ],
  },
  {
    id: 4,
    name: 'Liam Foster',
    status: 'Offline',
    phone: '+49 162 7799 5021',
    lastSeen: 'Seen yesterday',
    accent: '#ff6fa8',
    messages: [
      { id: 1, text: 'Movie night at mine on Friday?', time: 'Yesterday', sender: 'contact' },
      { id: 2, text: 'I am in. Bring snacks and I will bring the bad opinions.', time: 'Yesterday', sender: 'me' },
    ],
  },
];

function App() {
  const [activeContactId, setActiveContactId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');

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
          displayName: parsedProfile.displayName.trim(),
        });
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const activeContact = contacts.find((contact) => contact.id === activeContactId) ?? null;

  const handleCreateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = usernameInput.trim().replace(/\s+/g, '').toLowerCase();
    const normalizedDisplayName = displayNameInput.trim();

    if (!normalizedUsername || !normalizedDisplayName) {
      return;
    }

    const nextProfile = {
      username: normalizedUsername,
      displayName: normalizedDisplayName,
    };

    setUserProfile(nextProfile);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
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
                      background: `linear-gradient(135deg, ${activeContact.accent}, #ffffff)`,
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
                    <p>{activeContact.status}</p>
                  </div>
                </div>
              </div>

              <div className="conversation-actions">
                <span>{activeContact.phone}</span>
                <span>{activeContact.lastSeen}</span>
              </div>
            </header>

            <div className="message-thread">
              <div className="thread-date">Today</div>

              {activeContact.messages.map((message) => (
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
            </div>

            <footer className="composer">
              <label className="composer-field">
                <span className="sr-only">Message input</span>
                <input
                  type="text"
                  value=""
                  readOnly
                  placeholder={`Message ${activeContact.name}...`}
                />
              </label>
              <button type="button">Send</button>
            </footer>
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
                </>
              )}
            </div>

            {!isSettingsOpen ? (
              <div className="contact-list" aria-label="Contact list">
                {contacts.map((contact) => {
                  const lastMessage = contact.messages[contact.messages.length - 1];

                  return (
                    <button
                      key={contact.id}
                      className="contact-card"
                      onClick={() => setActiveContactId(contact.id)}
                      type="button"
                    >
                      <span
                        className="avatar"
                        style={{ background: `linear-gradient(135deg, ${contact.accent}, #ffffff)` }}
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
                          <span className="contact-time">{lastMessage.time}</span>
                        </span>
                        <span className="contact-preview">{lastMessage.text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
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
