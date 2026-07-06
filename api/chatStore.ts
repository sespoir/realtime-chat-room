import fs from 'node:fs';
import path from 'node:path';
import type { ChatMessage } from '../shared/chat.js';

type StoredRooms = Record<string, ChatMessage[]>;

const dataDir = path.resolve(process.cwd(), '.data');
const storePath = path.join(dataDir, 'chat-history.json');

export function loadChatHistory(): StoredRooms {
  try {
    if (!fs.existsSync(storePath)) {
      return {};
    }

    const rawData = fs.readFileSync(storePath, 'utf-8');
    return JSON.parse(rawData) as StoredRooms;
  } catch (error) {
    console.error('Failed to load chat history', error);
    return {};
  }
}

export function saveChatHistory(rooms: StoredRooms) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(rooms, null, 2));
  } catch (error) {
    console.error('Failed to save chat history', error);
  }
}
