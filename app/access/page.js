'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (res.ok) {
      router.replace('/');
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #222',
        borderRadius: '16px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: '14px',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>🔐</div>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            PH System AI
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            Ingresa tu código de acceso para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Código de acceso"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#1a1a1a',
              border: error ? '1px solid #ef4444' : '1px solid #2a2a2a',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '12px',
              textAlign: 'center',
              letterSpacing: '4px',
            }}
          />

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px' }}>
              Código incorrecto. Intenta de nuevo.
            </p>
          )}

          <button
            type="submit"
            disabled={!code || loading}
            style={{
              width: '100%',
              padding: '14px',
              background: code && !loading
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : '#222',
              border: 'none',
              borderRadius: '10px',
              color: code && !loading ? '#fff' : '#555',
              fontSize: '15px',
              fontWeight: 600,
              cursor: code && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
