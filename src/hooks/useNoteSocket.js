import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useDispatch } from 'react-redux'
import { setActiveUsers, updateContent } from '../store'
import { getFingerprint } from '../utils/fingerprint'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

export function useNoteSocket({ shareId, onRemoteUpdate, enabled = true }) {
  const socketRef = useRef(null)
  const dispatch  = useDispatch()

  useEffect(() => {
    if (!shareId || !enabled) return

    const socket = io(SOCKET_URL, {
      query: { shareId, fingerprint: getFingerprint() },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('note:request')
    })

    socket.on('note:update', ({ content, from }) => {
      if (from !== socket.id) onRemoteUpdate?.(content)
    })

    socket.on('presence:update', ({ users, count }) => {
      dispatch(setActiveUsers({ users, count }))
    })

    socket.on('disconnect', () => {
      dispatch(setActiveUsers({ users: [], count: 0 }))
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [shareId, enabled])

  const emitChange = useCallback((content) => {
    socketRef.current?.emit('note:change', { content, version: Date.now() })
  }, [])

  const emitCursor = useCallback((cursor) => {
    socketRef.current?.emit('cursor:move', { cursor })
  }, [])

  return { emitChange, emitCursor }
}
