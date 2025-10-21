
export enum StorytellerStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface Turn {
  speaker: 'user' | 'ai';
  text: string;
}
