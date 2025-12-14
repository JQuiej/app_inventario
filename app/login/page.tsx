'use client'
import { useState, Suspense } from 'react'
import { login, signup } from './actions'
import styles from './login.module.css'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

// 1. Spostiamo tutta la logica in un componente separato
function LoginForm() {
  const [isRegistering, setIsRegistering] = useState(false)
  const searchParams = useSearchParams() // Questo è ciò che causava l'errore
  const [showPassword, setShowPassword] = useState(false)
  
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        {isRegistering ? 'Crear Cuenta' : 'Manejo de Inventario'}
      </h1>
      <p className={styles.subtitle}>
        {isRegistering 
          ? 'Empieza a gestionar tu negocio hoy' 
          : 'Ingresa a tu cuenta para continuar'}
      </p>
      
      {/* Alertas */}
      {message === 'check_email' && (
        <div className={styles.alert}>
          ¡Registro exitoso! Revisa tu correo para verificar la cuenta.
        </div>
      )}
      {error && (
        <div style={{color: '#ef4444', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem'}}>
          {error === 'true' ? 'Credenciales incorrectas' : 'Ocurrió un error'}
        </div>
      )}

      <form className={styles.form}>
        {isRegistering && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre del Negocio</label>
            <input 
              name="business_name" 
              type="text" 
              placeholder="Ej. Tienda" 
              className={styles.input} 
              required={isRegistering}
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Correo Electrónico</label>
          <input 
            name="email" 
            type="email" 
            placeholder="nombre@ejemplo.com"
            required 
            className={styles.input} 
          />
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>Contraseña</label>
          <div className={styles.passwordWrapper}>
            <input 
              name="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              required 
              className={styles.input}
              style={{ paddingRight: '2.5rem' }} 
            />
            
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className={styles.passwordToggle}
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <button 
          formAction={isRegistering ? signup : login} 
          className={styles.submitButton}
        >
          {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
        </button>
      </form>

      <div className={styles.toggleText}>
        {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
        <button onClick={toggleMode} className={styles.toggleLink} type="button">
          {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
        </button>
      </div>
    </div>
  )
}

// 2. Il componente principale esportato avvolge tutto in Suspense
export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div>Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}