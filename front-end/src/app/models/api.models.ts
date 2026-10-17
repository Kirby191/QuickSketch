// Modelli restituiti dall'API e condivisi tra componenti e servizi.
export interface User {
  id: number;
  username: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
}

export interface AuthResponse {
  message?: string;
  user: User;
  token: string;
}

export interface WordItem {
  id: number;
  text: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface SketchUserContext {
  isAuthor: boolean;
  canPlay: boolean;
  status: 'AUTHOR' | 'NOT_STARTED' | 'IN_PROGRESS' | 'WON' | 'LOST';
  attemptsCount: number;
  remainingAttempts: number;
  guessedWords: string[];
  closeWords: string[];
}

// Dettaglio di uno sketch, con dati pubblici e contesto della partita corrente.
export interface Sketch {
  id: number;
  category: string;
  imageData: string;
  drawingTime: number;
  createdAt: string;
  author: {
    id: number;
    username: string;
  };
  wordLength: number;
  word: string | null; // null se la parola è segreta per l'utente corrente
  stats: {
    totalPlayers: number;
    solvedCount: number;
  };
  userContext: SketchUserContext | null;
}

export interface GuessResponse {
  message: string;
  isCorrect: boolean;
  isCloseGuess?: boolean;
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  attemptsCount: number;
  remainingAttempts: number;
  guessedWords: string[];
  solution: string | null;
}

// Dati aggregati usati dalle due classifiche dell'applicazione.
export interface LeaderboardPlayer {
  rank: number;
  userId: number;
  username: string;
  wordsGuessedCount: number;
  wordsNotGuessedCount: number;
  totalAttemptsUsed: number;
  avgAttemptsPerWin: number;
}

export interface LeaderboardArtist {
  rank: number;
  userId: number;
  username: string;
  sketchesCreatedCount: number;
  solvedSketchesCount: number;
  totalWinsReceived: number;
  totalAttemptsReceived: number;
  successRate: number;
}

export interface LeaderboardsResponse {
  bestPlayers: LeaderboardPlayer[];
  bestArtists: LeaderboardArtist[];
}

export interface UserStatsResponse {
  user: {
    id: number;
    username: string;
    memberSince: string;
  };
  playerStats: {
    wordsGuessedCount: number;
    wordsNotGuessedCount: number;
    gamesInProgressCount: number;
    totalAttemptsUsed: number;
    attemptsUsedForWins: number;
    avgAttemptsPerWin: number;
    winRatePercentage: number;
  };
  artistStats: {
    sketchesCreatedCount: number;
    sketchesSolvedByAtLeastOne: number;
    totalPlayersOnMySketches: number;
    successfulGuessesOnMySketches: number;
    artistSuccessRate: number;
    avgDrawingTime: number;
  };
  recentGames: Array<{
    attemptId: number;
    sketchId: number;
    category: string;
    author: string;
    status: 'IN_PROGRESS' | 'WON' | 'LOST';
    attemptsCount: number;
    word: string | null;
    updatedAt: string;
  }>;
}