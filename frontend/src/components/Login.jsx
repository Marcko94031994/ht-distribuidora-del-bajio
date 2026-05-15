import React from 'react';

export default function Login({user,setUser,onLogin}){
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="brand">
          <div style={{ width: 44, height: 44, background: '#fff', borderRadius: '8px', position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--primary)', fontWeight: '900', fontSize: '20px' }}>
            HT
            <div style={{ position: 'absolute', bottom: -10, right: -10, width: 25, height: 25, background: 'var(--primary)', transform: 'rotate(45deg)' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>HT DISTRIBUIDORA</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>del BAJÍO</span>
          </div>
        </div>
        <div>
          <h1>Sistema de Logística y Distribución</h1>
          <p>Gestiona rutas, inventarios y cierres de caja en tiempo real para HT Distribuidora del Bajío.</p>
        </div>
        <p>Usuario demo: demo@abarrotera.mx · Contraseña: 123456</p>
      </div>
      <div className="login-card-wrap">
        <form className="login-card" onSubmit={e=>{e.preventDefault();onLogin();}}>
          <h2>Iniciar sesión</h2>
          <p className="muted">Acceso de ejemplo para presentar el flujo.</p>
          <div className="field">
            <label>Correo</label>
            <input className="input" value={user.email} onChange={e=>setUser({...user,email:e.target.value})}/>
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" value={user.pass} onChange={e=>setUser({...user,pass:e.target.value})}/>
          </div>
          <button className="btn" style={{width:'100%', marginTop: '10px'}}>Entrar al sistema</button>
        </form>
      </div>
    </div>
  );
}
