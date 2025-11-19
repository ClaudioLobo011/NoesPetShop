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
        <p>Telefone: (21) 0000-0000</p>
        <p>E-mail: contato@noespetshop.com.br</p>
        <p>Endereço: Rua Exemplo, 123 - Bairro - Cidade/RJ</p>
      </div>

      <div className="footer-section">
        <h4>Redes sociais</h4>
        <ul className="social-list">
          <li>
            <a href="#" target="_blank" rel="noreferrer">
              Instagram
            </a>
          </li>
          <li>
            <a href="#" target="_blank" rel="noreferrer">
              Facebook
            </a>
          </li>
          <li>
            <a href="#" target="_blank" rel="noreferrer">
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