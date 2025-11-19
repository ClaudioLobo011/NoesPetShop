import React from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Cart from './components/Cart'
import { CartProvider } from './context/CartContext'

function App() {
  return (
    <CartProvider>
      <div className="app">
        <Header />
        <Cart />
        <main className="main-content">
          <Home />
        </main>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App
