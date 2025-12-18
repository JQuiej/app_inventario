'use client'
import { useState, Suspense, useTransition } from 'react' // <--- Importamos useTransition
import { login, signup } from './actions'
import styles from './login.module.css'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react' // <--- Importamos Loader2

// 1. Lógica del formulario
function LoginForm() {
  const [isRegistering, setIsRegistering] = useState(false)
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition() // <--- Hook para estado de carga
  
  const message = searchParams.get('message')
  const error = searchParams.get('error')

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
  }

  // Wrapper para manejar el envío con transición
  const handleSubmit = (action: (formData: FormData) => Promise<void>) => {
    return (formData: FormData) => {
      startTransition(async () => {
        await action(formData)
      })
    }
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

      {/* Usamos action={handleSubmit(...)} en lugar de formAction en el botón */}
      <form action={isRegistering ? handleSubmit(signup) : handleSubmit(login)} className={styles.form}>
        
        {isRegistering && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre del Negocio</label>
            <input 
              name="business_name" 
              type="text" 
              placeholder="Ej. Tienda" 
              className={styles.input} 
              required={isRegistering}
              disabled={isPending} // Bloquear input
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
            disabled={isPending} // Bloquear input
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
              disabled={isPending} // Bloquear input
            />
            
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className={styles.passwordToggle}
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              disabled={isPending}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isPending} // Deshabilitar botón mientras carga
          style={{ opacity: isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {isRegistering ? 'Registrando...' : 'Iniciando...'}
            </>
          ) : (
            isRegistering ? 'Registrarse' : 'Iniciar Sesión'
          )}
        </button>
      </form>

      <div className={styles.toggleText}>
        {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
        <button 
            onClick={toggleMode} 
            className={styles.toggleLink} 
            type="button"
            disabled={isPending}
        >
          {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
        </button>
      </div>
    </div>
  )
}

// 2. Componente principal
export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div>Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}