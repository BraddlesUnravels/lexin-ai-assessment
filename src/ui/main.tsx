import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('The UI root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <main>
      <h1>Material Register scaffold</h1>
    </main>
  </StrictMode>,
);
