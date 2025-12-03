import React, { useState } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import AdminPage from './pages/Admin'
import Cart from './components/Cart'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'

function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home' | 'admin'

  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          <Header
            onGoToAdmin={() => setCurrentPage('admin')}
            onGoToHome={() => setCurrentPage('home')}
          />
          <Cart />
          <main
            className={
              currentPage === 'home'
                ? 'main-content'
                : 'main-content admin-content-full'
            }
          >
            {currentPage === 'home' ? <Home /> : <AdminPage />}
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
