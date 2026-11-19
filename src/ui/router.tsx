import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { MaterialsPage } from './features/materials/MaterialsPage/index.ts';

function RootLayout() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, element: <Navigate to="/materials" replace /> },
      { path: 'materials', Component: MaterialsPage },
    ],
  },
]);
