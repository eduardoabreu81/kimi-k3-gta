import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Game from './pages/Game'
import ComoJogar from './pages/ComoJogar'

export default function App() {
  return (
    <Routes>
      {/* páginas do site: dentro do Layout (Navbar + Footer + Lenis) */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="como-jogar" element={<ComoJogar />} />
      </Route>
      {/* jogo: fullscreen, fora do Layout */}
      <Route path="/jogar" element={<Game />} />
    </Routes>
  )
}
