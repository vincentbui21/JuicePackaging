import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import LoginPage from './pages/LoginPage'
import { Routes, Route } from 'react-router-dom'

function App() {

  return (
    <main className='main-content'>
      <Routes>
        <Route path='/' element={<LoginPage />}/>
      </Routes>
    </main>
  )
}

export default App
