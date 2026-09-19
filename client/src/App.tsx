import { useEffect, useState } from 'react'
import Home from './Home'
import Playground from './Playground'

// Each style is its own page, listed on the home menu in this order
const styles = [{ name: 'Apple', path: '/apple', Page: Playground }]

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(to: string) {
    window.history.pushState(null, '', to)
    setPath(to)
  }

  const current = styles.find((style) => style.path === path)
  return current ? (
    <current.Page />
  ) : (
    <Home items={styles} onNavigate={navigate} />
  )
}
