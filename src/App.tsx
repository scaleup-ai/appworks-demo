import React from 'react'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import LoginForm from './components/LoginForm'
import SuccessScreen from './components/SuccessScreen'

const App: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <>
      {isAuthenticated ? <SuccessScreen /> : <LoginForm />}
    </>
  )
}

export default App