
export interface Event {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  attendees: string[]; // List of user names like "@Kuroda"
}

export interface User {
  id: string;
  name: string;
  handle: string; // e.g. "@Kuroda"
  avatar: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
