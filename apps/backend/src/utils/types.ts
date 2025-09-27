export interface User {
    id: string;
    handle: string;
    wins: number;
    losses: number;
    streak: number;
    elo: number;
    createdAt: Date;
  }
  
  export interface Room {
    id: string;
    inviteCode: string;
    hostUserId: string;
    state: 'waiting' | 'ready' | 'active' | 'finished' | 'abandoned';
    bestOf: number;
    createdAt: Date;
    startedAt?: Date;
    endedAt?: Date;
  }
  
  export interface Battle {
    id: string;
    roomId: string;
    p1UserId: string;
    p2UserId: string;
    p1Score: number;
    p2Score: number;
    winnerUserId?: string;
    status: 'pending' | 'running' | 'done';
    createdAt: Date;
  }