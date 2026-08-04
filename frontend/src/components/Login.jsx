import React from 'react';

export default function Login({ user, setUser, onLogin }) {
  return (
    <div className="login-wrap">
      {/* Left Branding Hero Section */}
      <div className="login-hero">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/logo.png" 
            alt="HT Distribuidora del Bajío" 
            style={{ height: '70px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="brand-fallback" style={{ display: 'none', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: '1.5px solid #fecdd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '20px',
              letterSpacing: '-0.05em'
            }}>
              <span style={{ color: '#d81921' }}>H</span>
              <span style={{ color: '#111111' }}>T</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>HT DISTRIBUIDORA</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#d81921', letterSpacing: '0.04em' }}>DEL BAJÍO</span>
            </div>
          </div>
        </div>

        <div className="login-hero-content">
          <h1>
            Soluciones eficientes,<br />
            distribución <span className="highlight">confiable.</span>
          </h1>
          <p>
            Sistema integral para la gestión de pedidos, rutas, inventarios y clientes de HT Distribuidora del Bajío.
          </p>
        </div>

        <div style={{ fontSize: '13px', color: '#94a3b8', zmdIndex: 2, position: 'relative' }}>
          Demo: <b>admin@htdistribuidora.mx</b> · Pass: <b>123456</b>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="login-card-wrap">
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <form className="login-card" onSubmit={e => { e.preventDefault(); onLogin(); }}>
            <div className="login-card-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
                <img 
                  src="/logo.png" 
                  alt="HT Logo" 
                  style={{ height: '75px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="brand-fallback" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#fff1f2',
                    border: '1.5px solid #fecdd3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '18px'
                  }}>
                    <span style={{ color: '#d81921' }}>H</span>
                    <span style={{ color: '#111111' }}>T</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#111827' }}>HT DISTRIBUIDORA</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#d81921' }}>DEL BAJÍO</span>
                  </div>
                </div>
              </div>
              <h2>Bienvenido de nuevo</h2>
              <p>Inicia sesión para continuar en la plataforma</p>
            </div>

            <div className="field">
              <label>Usuario o Correo</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input 
                  className="input" 
                  placeholder="ejemplo@htdistribuidora.mx"
                  value={user.email} 
                  onChange={e => setUser({ ...user, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Contraseña</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input 
                  className="input" 
                  type="password" 
                  placeholder="••••••••"
                  value={user.pass} 
                  onChange={e => setUser({ ...user, pass: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn full-width" style={{ marginTop: '12px', padding: '14px', fontSize: '15px' }}>
              Iniciar sesión
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12.5px', color: '#64748b' }}>
            © {new Date().getFullYear()} <span style={{ color: '#d81921', fontWeight: 700 }}>Distribuidora del Bajío</span>. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}

