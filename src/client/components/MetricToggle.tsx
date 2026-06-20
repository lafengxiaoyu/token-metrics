import type { MetricMode } from '../../shared/types.js';

interface MetricToggleProps {
  mode: MetricMode;
  onToggle: () => void;
}

export function MetricToggle({ mode, onToggle }: MetricToggleProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '24px'
    }}>
      <button
        onClick={onToggle}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          backgroundColor: mode === 'tokens' ? '#3b82f6' : '#f3f4f6',
          color: mode === 'tokens' ? '#ffffff' : '#374151',
          transition: 'background-color 0.2s, color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = mode === 'tokens' ? '#2563eb' : '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = mode === 'tokens' ? '#3b82f6' : '#f3f4f6';
        }}
      >
        Tokens
      </button>
      <button
        onClick={onToggle}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          backgroundColor: mode === 'credits' ? '#3b82f6' : '#f3f4f6',
          color: mode === 'credits' ? '#ffffff' : '#374151',
          transition: 'background-color 0.2s, color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = mode === 'credits' ? '#2563eb' : '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = mode === 'credits' ? '#3b82f6' : '#f3f4f6';
        }}
      >
        AI Credits
      </button>
    </div>
  );
}
