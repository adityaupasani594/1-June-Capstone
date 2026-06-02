export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                surface: {
                    base: '#070B11',
                    panel: '#0F172A',
                    panelAlt: '#111C2E',
                    line: 'rgba(148, 163, 184, 0.14)',
                    muted: '#94A3B8',
                },
            },
            boxShadow: {
                panel: '0 18px 50px rgba(0, 0, 0, 0.35)',
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};
