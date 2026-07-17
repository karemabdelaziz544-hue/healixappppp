export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  messages: AIMessage[];
  createdAt: string;
}
