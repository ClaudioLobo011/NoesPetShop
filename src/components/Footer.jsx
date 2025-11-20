import React from 'react'
import logo from '../assets/logo.png'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-section">
        <img src={logo} alt="Noe's PetShop" className="footer-logo" />
        <p>Noe&apos;s PetShop - Cuidando com carinho de quem cuida de você.</p>
      </div>

      <div className="footer-section">
        <h4>Contato</h4>
        <p>Telefone: (21) 99332-8054</p>
        <p>E-mail: contato@noespetshop.com.br</p>
        <p>Endereço: R. Antônio João Mendonça, 1424 - Centro Nilópolis, Rio de Janeiro</p>
      </div>

      <div className="footer-section">
        <h4>Redes sociais</h4>
        <ul className="social-list">
          <li>
            <a href="https://www.instagram.com/noespetshop/" target="_blank" rel="noreferrer">
              Instagram
            </a>
          </li>
          <li>
            <a href="https://www.facebook.com/doggybrasilcariocarj/" target="_blank" rel="noreferrer">
              Facebook
            </a>
          </li>
          <li>
            <a href="https://wa.me/5521993328054?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Noe%27s%20PetShop%20e%20gostaria%20de%20falar%20com%20voc%C3%AAs%20😊" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </li>
        </ul>
      </div>

      <div className="footer-section">
        <h4>Políticas</h4>
        <ul className="policy-list">
          <li>
            <a href="#">Política de Privacidade</a>
          </li>
          <li>
            <a href="#">Termos de Uso</a>
          </li>
          <li>
            <a href="#">Política de Entrega</a>
          </li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer