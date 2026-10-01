import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL = 60000;

export default function VersionWatcher() {
  const versionActual = useRef(null);
  const [actualizando, setActualizando] = useState(false);
  const [nuevaVersion, setNuevaVersion] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const forzarActualizacion = async (versionServidor) => {
    setIsUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (error) {
      console.warn("No fue posible limpiar cache:", error);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("v", versionServidor);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    let interval = null;

    const obtenerVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const versionServidor = data.version;
        
        if (!versionActual.current) {
          try {
            versionActual.current = __APP_VERSION__;
          } catch(e) {
            versionActual.current = versionServidor; // fallback
          }
          if (versionActual.current === versionServidor) return;
        }

        if (actualizando) return;

        if (versionActual.current !== versionServidor) {
          setActualizando(true);
          setNuevaVersion(versionServidor);
        }
      } catch (error) {
        console.warn("No se pudo validar version:", error);
      }
    };

    obtenerVersion();
    interval = setInterval(obtenerVersion, CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        obtenerVersion();
      }
    };

    window.addEventListener("online", obtenerVersion);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("online", obtenerVersion);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [actualizando]);

  if (!actualizando) return null;

  return (
    <>
      {/* Backdrop semi-transparente para llamar la atencion pero permitir ver el fondo */}
      <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.15)",
        zIndex: 999998,
        pointerEvents: "none"
      }}></div>
      
      {/* Modal/Toast de actualizacion */}
      <div
        style={{
          position: "fixed",
          bottom: "30px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          padding: "20px 24px",
          borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          zIndex: 999999,
          width: "90%",
          maxWidth: "360px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#1e293b",
          textAlign: "center"
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "17px" }}>
          Hay una nueva version
        </div>
        <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px", lineHeight: "1.4" }}>
          Termine la operacion actual para actualizar sin perder informacion.
        </div>
        
        <button 
          onClick={() => forzarActualizacion(nuevaVersion)}
          disabled={isUpdating}
          style={{
            width: "100%",
            backgroundColor: "#475569",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: isUpdating ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            opacity: isUpdating ? 0.7 : 1,
            transition: "all 0.2s"
          }}
        >
          {isUpdating ? (
            "Actualizando..."
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.27l5.58 5.58"/>
              </svg>
              Actualizar
            </>
          )}
        </button>
      </div>
    </>
  );
}

