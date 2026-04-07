const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const PORT = process.env.PORT || 4000;

function sortUsernames(a, b) {
  return [a, b].sort((left, right) => left.localeCompare(right));
}

function deriveDisplayName(username) {
  return username
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function startServer() {
  const db = await initDb();
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/profile', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const displayName = String(req.body.displayName || '').trim();

    if (!username || !displayName) {
      res.status(400).json({ error: 'username and displayName are required' });
      return;
    }

    await db.run(
      `
        INSERT INTO users (username, display_name)
        VALUES (?, ?)
        ON CONFLICT(username) DO UPDATE SET
          display_name = excluded.display_name,
          updated_at = CURRENT_TIMESTAMP
      `,
      [username, displayName]
    );

    res.json({
      username,
      displayName
    });
  });

  app.get('/api/chats', async (req, res) => {
    const username = String(req.query.username || '').trim().toLowerCase();

    if (!username) {
      res.status(400).json({ error: 'username is required' });
      return;
    }

    const chats = await db.all(
      `
        SELECT
          chats.id,
          CASE
            WHEN chats.user_one = ? THEN chats.user_two
            ELSE chats.user_one
          END AS contactUsername,
          users.display_name AS contactName,
          chats.updated_at AS updatedAt,
          (
            SELECT messages.text
            FROM messages
            WHERE messages.chat_id = chats.id
            ORDER BY messages.id DESC
            LIMIT 1
          ) AS lastMessageText,
          (
            SELECT messages.created_at
            FROM messages
            WHERE messages.chat_id = chats.id
            ORDER BY messages.id DESC
            LIMIT 1
          ) AS lastMessageAt
        FROM chats
        JOIN users
          ON users.username = CASE
            WHEN chats.user_one = ? THEN chats.user_two
            ELSE chats.user_one
          END
        WHERE chats.user_one = ? OR chats.user_two = ?
        ORDER BY COALESCE(lastMessageAt, chats.updated_at) DESC, chats.id DESC
      `,
      [username, username, username, username]
    );

    res.json(
      chats.map((chat) => ({
        id: chat.id,
        username: chat.contactUsername,
        name: chat.contactName,
        lastMessageText: chat.lastMessageText || '',
        lastMessageTime: chat.lastMessageAt ? formatTime(chat.lastMessageAt) : '',
        updatedAt: chat.updatedAt
      }))
    );
  });

  app.post('/api/chats', async (req, res) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const contactUsername = String(req.body.contactUsername || '').trim().toLowerCase();

    if (!username || !contactUsername) {
      res.status(400).json({ error: 'username and contactUsername are required' });
      return;
    }

    if (username === contactUsername) {
      res.status(400).json({ error: 'cannot create a chat with yourself' });
      return;
    }

    const [userOne, userTwo] = sortUsernames(username, contactUsername);

    await db.run(
      `
        INSERT INTO users (username, display_name)
        VALUES (?, ?)
        ON CONFLICT(username) DO NOTHING
      `,
      [username, deriveDisplayName(username) || username]
    );

    await db.run(
      `
        INSERT INTO users (username, display_name)
        VALUES (?, ?)
        ON CONFLICT(username) DO NOTHING
      `,
      [contactUsername, deriveDisplayName(contactUsername) || contactUsername]
    );

    await db.run(
      `
        INSERT INTO chats (user_one, user_two)
        VALUES (?, ?)
        ON CONFLICT(user_one, user_two) DO UPDATE SET
          updated_at = chats.updated_at
      `,
      [userOne, userTwo]
    );

    const chat = await db.get(
      `
        SELECT
          chats.id,
          users.username AS contactUsername,
          users.display_name AS contactName
        FROM chats
        JOIN users
          ON users.username = CASE
            WHEN chats.user_one = ? THEN chats.user_two
            ELSE chats.user_one
          END
        WHERE chats.user_one = ? AND chats.user_two = ?
      `,
      [username, userOne, userTwo]
    );

    res.json({
      id: chat.id,
      username: chat.contactUsername,
      name: chat.contactName
    });
  });

  app.get('/api/chats/:chatId/messages', async (req, res) => {
    const chatId = Number(req.params.chatId);
    const username = String(req.query.username || '').trim().toLowerCase();

    if (!chatId || !username) {
      res.status(400).json({ error: 'chatId and username are required' });
      return;
    }

    const chat = await db.get(
      `
        SELECT *
        FROM chats
        WHERE id = ? AND (user_one = ? OR user_two = ?)
      `,
      [chatId, username, username]
    );

    if (!chat) {
      res.status(404).json({ error: 'chat not found' });
      return;
    }

    const messages = await db.all(
      `
        SELECT id, sender_username AS senderUsername, text, created_at AS createdAt
        FROM messages
        WHERE chat_id = ?
        ORDER BY id ASC
      `,
      [chatId]
    );

    res.json(
      messages.map((message) => ({
        id: message.id,
        text: message.text,
        time: formatTime(message.createdAt),
        sender: message.senderUsername === username ? 'me' : 'contact'
      }))
    );
  });

  app.post('/api/chats/:chatId/messages', async (req, res) => {
    const chatId = Number(req.params.chatId);
    const senderUsername = String(req.body.senderUsername || '').trim().toLowerCase();
    const text = String(req.body.text || '').trim();

    if (!chatId || !senderUsername || !text) {
      res.status(400).json({ error: 'chatId, senderUsername and text are required' });
      return;
    }

    const chat = await db.get(
      `
        SELECT *
        FROM chats
        WHERE id = ? AND (user_one = ? OR user_two = ?)
      `,
      [chatId, senderUsername, senderUsername]
    );

    if (!chat) {
      res.status(404).json({ error: 'chat not found' });
      return;
    }

    const result = await db.run(
      `
        INSERT INTO messages (chat_id, sender_username, text)
        VALUES (?, ?, ?)
      `,
      [chatId, senderUsername, text]
    );

    await db.run(
      `
        UPDATE chats
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [chatId]
    );

    const message = await db.get(
      `
        SELECT id, sender_username AS senderUsername, text, created_at AS createdAt
        FROM messages
        WHERE id = ?
      `,
      [result.lastID]
    );

    res.status(201).json({
      id: message.id,
      text: message.text,
      time: formatTime(message.createdAt),
      sender: message.senderUsername === senderUsername ? 'me' : 'contact'
    });
  });

  app.listen(PORT, () => {
    console.log(`MyChat local backend running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start MyChat backend:', error);
  process.exit(1);
});
