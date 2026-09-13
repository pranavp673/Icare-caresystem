import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

// Design system — load before any component CSS so tokens are available.
import "./styles/tokens.css"
import "./styles/base.css"

import App from "./App"
import { AuthProvider } from "./auth/AuthContext"
import { ToastProvider } from "./components/Toast/ToastProvider"
import PasscodeGate from "./components/PasscodeGate/PasscodeGate"

// Legacy page overrides — imported LAST so they win against the page-level
// SCSS that ships with the original Rota + ChildProfile screens.
import "./styles/legacy-overrides.scss"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <PasscodeGate>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </PasscodeGate>
)
