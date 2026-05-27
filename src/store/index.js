import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// ── Notes slice ──────────────────────────────────────────────────────────────
const notesSlice = createSlice({
  name: 'notes',
  initialState: {
    current: null,
    status: 'idle', // idle | loading | success | error
    error: null,
    globalStats: null,
  },
  reducers: {
    setNote: (state, a) => { state.current = a.payload },
    clearNote: (state) => { state.current = null; state.status = 'idle' },
    setStatus: (state, a) => { state.status = a.payload },
    setGlobalStats: (state, a) => { state.globalStats = a.payload },
    updateSlugLocal: (state, a) => {
      if (state.current) state.current.shareId = a.payload
    }
  },
})

export const { setNote, clearNote, setStatus, setGlobalStats, updateSlugLocal } = notesSlice.actions

// ── UI slice ─────────────────────────────────────────────────────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    shareModalOpen: false,
    activeUsers: [],
    savedAt: null,
    isSaving: false,
  },
  reducers: {
    toggleShareModal: (state) => { state.shareModalOpen = !state.shareModalOpen },
    closeShareModal: (state) => { state.shareModalOpen = false },
    setActiveUsers: (state, a) => { state.activeUsers = a.payload },
    setSavedAt: (state, a) => { state.savedAt = a.payload },
    setIsSaving: (state, a) => { state.isSaving = a.payload },
  },
})

export const { toggleShareModal, closeShareModal, setActiveUsers, setSavedAt, setIsSaving } = uiSlice.actions

export const store = configureStore({
  reducer: {
    notes: notesSlice.reducer,
    ui: uiSlice.reducer,
  },
})
