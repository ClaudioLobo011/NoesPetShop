import React, { useEffect, useState } from 'react'

const banners = [
  {
    id: 1,
    title: 'Bem-vindo ao Noe\'s PetShop',
    subtitle: 'Tudo para o seu melhor amigo em um só lugar.',
  },
  {
    id: 2,
    title: 'Rações Premium',
    subtitle: 'Nutrição completa para cães e gatos.',
  },
  {
    id: 3,
    title: 'Banho & Tosa',
    subtitle: 'Agende um horário e deixe seu pet ainda mais lindo.',
  },
  {
    id: 4,
    title: 'Brinquedos e Acessórios',
    subtitle: 'Diversão garantida para o seu pet.',
  },
  {
    id: 5,
    title: 'Atendimento Especializado',
    subtitle: 'Equipe apaixonada por animais.',
  },
]

function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="carousel">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={
            index === activeIndex ? 'carousel-item active' : 'carousel-item'
          }
        >
          <div className="carousel-content">
            <h2>{banner.title}</h2>
            <p>{banner.subtitle}</p>
          </div>
        </div>
      ))}

      <div className="carousel-dots">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={index === activeIndex ? 'dot active' : 'dot'}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

export default Carousel