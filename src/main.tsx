import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { LangProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <LangProvider>
      <App />
    </LangProvider>
  </HashRouter>,
)
