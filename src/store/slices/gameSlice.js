import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Chess } from 'chess.js';

// Initial state
const initialState = {
  // Chess game state
  chess: null,
  gameFEN: '',
  currentTurn: 'w',
  selectedSquare: null,
  validMoves: [],
  kingInCheck: null,
  
  // Game status
  isGameOver: false,
  gameOverMessage: '',
  gameOverModalVisible: false,
  
  // Game settings
  gameMode: 'classic', // classic, blitz, unlimited, rush
  isPlay: true,
  pauseName: 'Pause',
  
  // Timers
  whiteTimer: 60,
  blackTimer: 60,
  
  // Captured pieces
  capturedPieces: { white: [], black: [] },
  
  // Move history
  moveHistory: [],
  
  // Board settings
  selectedColor: { light: '#EDEDED', dark: '#8B5A5A' },
  showMoves: true,
  isBoardFlipped: false,
  
  // UI state
  promotionModalVisible: false,
  promotionMove: null,
  exitModalVisible: false,
  showBlackCaptured: false,
  showWhiteCaptured: false,
  
  // Loading states
  loading: false,
  error: null,
};

// Async thunks
export const initializeGame = createAsyncThunk(
  'game/initializeGame',
  async (mode = 'classic', { rejectWithValue }) => {
    try {
      const chess = new Chess();
      const initialTime = getInitialTime(mode);
      
      return {
        chess: chess.fen(),
        gameFEN: chess.fen(),
        currentTurn: 'w',
        gameMode: mode,
        whiteTimer: initialTime,
        blackTimer: initialTime,
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const makeMove = createAsyncThunk(
  'game/makeMove',
  async ({ from, to, promotion = 'q' }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const chess = new Chess(state.game.gameFEN);
      
      const move = chess.move({ from, to, promotion });
      if (!move) {
        throw new Error('Invalid move');
      }
      
      const newCapturedPieces = calculateCapturedPieces(chess);
      const moveHistory = chess.history({ verbose: true });
      
      return {
        gameFEN: chess.fen(),
        currentTurn: chess.turn(),
        move,
        capturedPieces: newCapturedPieces,
        moveHistory,
        isGameOver: chess.isGameOver(),
        gameOverMessage: getGameOverMessage(chess),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const undoMove = createAsyncThunk(
  'game/undoMove',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const chess = new Chess(state.game.gameFEN);
      
      const undoneMove = chess.undo();
      if (!undoneMove) {
        throw new Error('No moves to undo');
      }
      
      const newCapturedPieces = calculateCapturedPieces(chess);
      const moveHistory = chess.history({ verbose: true });
      
      return {
        gameFEN: chess.fen(),
        currentTurn: chess.turn(),
        capturedPieces: newCapturedPieces,
        moveHistory,
        isGameOver: false,
        gameOverMessage: '',
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const resetGame = createAsyncThunk(
  'game/resetGame',
  async (mode = 'classic', { rejectWithValue }) => {
    try {
      const chess = new Chess();
      const initialTime = getInitialTime(mode);
      
      return {
        chess: chess.fen(),
        gameFEN: chess.fen(),
        currentTurn: 'w',
        gameMode: mode,
        whiteTimer: initialTime,
        blackTimer: initialTime,
        moveHistory: [],
        capturedPieces: { white: [], black: [] },
        isGameOver: false,
        gameOverMessage: '',
        selectedSquare: null,
        kingInCheck: null,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Helper functions
const getInitialTime = (mode) => {
  switch (mode) {
    case 'classic': return 60;
    case 'blitz': return 30;
    case 'unlimited': return 999999;
    case 'rush': return 20;
    default: return 60;
  }
};

const calculateCapturedPieces = (chess) => {
  const currentPieces = { white: [], black: [] };
  const board = chess.board();

  // Count current pieces on the board
  board.forEach(row => {
    row.forEach(square => {
      if (square) {
        if (square.color === 'w') {
          currentPieces.white.push(square.type.toUpperCase());
        } else {
          currentPieces.black.push(square.type);
        }
      }
    });
  });

  // Calculate captured pieces by comparing with initial pieces
  const capturedWhite = [];
  const capturedBlack = [];

  // Count initial pieces
  const initialWhiteCount = { 'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1, 'K': 1 };
  const initialBlackCount = { 'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1, 'k': 1 };

  // Count current pieces
  const currentWhiteCount = {};
  const currentBlackCount = {};
  
  currentPieces.white.forEach(piece => {
    currentWhiteCount[piece] = (currentWhiteCount[piece] || 0) + 1;
  });
  
  currentPieces.black.forEach(piece => {
    currentBlackCount[piece] = (currentBlackCount[piece] || 0) + 1;
  });

  // Calculate captured pieces
  Object.keys(initialWhiteCount).forEach(piece => {
    const initialCount = initialWhiteCount[piece];
    const currentCount = currentWhiteCount[piece] || 0;
    const capturedCount = initialCount - currentCount;
    for (let i = 0; i < capturedCount; i++) {
      capturedWhite.push(piece);
    }
  });

  Object.keys(initialBlackCount).forEach(piece => {
    const initialCount = initialBlackCount[piece];
    const currentCount = currentBlackCount[piece] || 0;
    const capturedCount = initialCount - currentCount;
    for (let i = 0; i < capturedCount; i++) {
      capturedBlack.push(piece);
    }
  });

  return {
    white: capturedBlack, // White player captured black pieces
    black: capturedWhite, // Black player captured white pieces
  };
};

const getGameOverMessage = (chess) => {
  if (chess.isCheckmate()) {
    return `${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`;
  } else if (chess.isStalemate()) {
    return 'Draw by stalemate!';
  } else if (chess.isInsufficientMaterial()) {
    return 'Draw by insufficient material!';
  } else if (chess.isThreefoldRepetition()) {
    return 'Draw by threefold repetition!';
  } else if (chess.isDraw()) {
    return 'Draw by fifty-move rule!';
  }
  return '';
};

// Game slice
const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Square selection
    setSelectedSquare: (state, action) => {
      state.selectedSquare = action.payload;
      if (action.payload) {
        const chess = new Chess(state.gameFEN);
        state.validMoves = chess.moves({ square: action.payload, verbose: true }).map(move => move.to);
      } else {
        state.validMoves = [];
      }
    },
    
    // King in check
    setKingInCheck: (state, action) => {
      state.kingInCheck = action.payload;
    },
    
    // Game controls
    togglePlayPause: (state) => {
      state.isPlay = !state.isPlay;
      state.pauseName = state.isPlay ? 'Pause' : 'Resume';
    },
    
    // Timer updates
    updateTimers: (state, action) => {
      const { whiteTimer, blackTimer } = action.payload;
      state.whiteTimer = whiteTimer;
      state.blackTimer = blackTimer;
    },
    
    // UI state
    setPromotionModalVisible: (state, action) => {
      state.promotionModalVisible = action.payload;
    },
    
    setPromotionMove: (state, action) => {
      state.promotionMove = action.payload;
    },
    
    setGameOverModalVisible: (state, action) => {
      state.gameOverModalVisible = action.payload;
    },
    
    setExitModalVisible: (state, action) => {
      state.exitModalVisible = action.payload;
    },
    
    setShowBlackCaptured: (state, action) => {
      state.showBlackCaptured = action.payload;
    },
    
    setShowWhiteCaptured: (state, action) => {
      state.showWhiteCaptured = action.payload;
    },
    
    // Board settings
    setSelectedColor: (state, action) => {
      state.selectedColor = action.payload;
    },
    
    setShowMoves: (state, action) => {
      state.showMoves = action.payload;
    },
    
    setBoardFlipped: (state, action) => {
      state.isBoardFlipped = action.payload;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize game
      .addCase(initializeGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeGame.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(initializeGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Make move
      .addCase(makeMove.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(makeMove.fulfilled, (state, action) => {
        state.loading = false;
        state.gameFEN = action.payload.gameFEN;
        state.currentTurn = action.payload.currentTurn;
        state.capturedPieces = action.payload.capturedPieces;
        state.moveHistory = action.payload.moveHistory;
        state.isGameOver = action.payload.isGameOver;
        state.gameOverMessage = action.payload.gameOverMessage;
        state.selectedSquare = null;
        state.validMoves = [];
        
        if (action.payload.isGameOver) {
          state.gameOverModalVisible = true;
        }
      })
      .addCase(makeMove.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Undo move
      .addCase(undoMove.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(undoMove.fulfilled, (state, action) => {
        state.loading = false;
        state.gameFEN = action.payload.gameFEN;
        state.currentTurn = action.payload.currentTurn;
        state.capturedPieces = action.payload.capturedPieces;
        state.moveHistory = action.payload.moveHistory;
        state.isGameOver = action.payload.isGameOver;
        state.gameOverMessage = action.payload.gameOverMessage;
        state.selectedSquare = null;
        state.validMoves = [];
        state.gameOverModalVisible = false;
      })
      .addCase(undoMove.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Reset game
      .addCase(resetGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetGame.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
        state.gameOverModalVisible = false;
        state.exitModalVisible = false;
        state.promotionModalVisible = false;
        state.promotionMove = null;
        state.showBlackCaptured = false;
        state.showWhiteCaptured = false;
      })
      .addCase(resetGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setSelectedSquare,
  setKingInCheck,
  togglePlayPause,
  updateTimers,
  setPromotionModalVisible,
  setPromotionMove,
  setGameOverModalVisible,
  setExitModalVisible,
  setShowBlackCaptured,
  setShowWhiteCaptured,
  setSelectedColor,
  setShowMoves,
  setBoardFlipped,
  clearError,
} = gameSlice.actions;

export default gameSlice.reducer;
