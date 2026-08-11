import React from 'react';

export default function LoadingOverlay({ 
  show = false, 
  title = "Procesando Datos...", 
  message = "Por favor espere un momento mientras se actualizan los registros de forma segura.",
  progressText = null,
  isSuccess = false
}) {
  if (!show) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '20px',
        boxSizing: 'border-box',
        cursor: 'wait'
      }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div 
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '36px 40px',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Animated Spinner Ring or Success Icon */}
        <div style={{ position: 'relative', width: '64px', height: '64px', margin: '4px 0 8px' }}>
          {!isSuccess ? (
            <>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '4px solid #e2e8f0',
                  borderTopColor: '#d81921',
                  borderRightColor: '#d81921',
                  animation: 'spin 0.85s linear infinite'
                }}
              />
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}
              >
                ⚡
              </div>
            </>
          ) : (
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: 'white',
                animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              ✓
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b', lineHeight: 1.5 }}>
            {message}
          </p>
          {progressText && (
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', alignSelf: 'center' }}>
              {progressText}
            </div>
          )}
        </div>

        {/* Security Badge */}
        {!isSuccess && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#475569',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '6px 14px',
              borderRadius: '999px',
              marginTop: '4px'
            }}
          >
            <span>🔒</span> Bloqueo de seguridad de pantalla activo
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scaleIn {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
