import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NotePage from './pages/NotePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/note/:shareId" element={<NotePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  )
}
