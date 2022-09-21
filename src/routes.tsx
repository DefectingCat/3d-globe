import { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router';

const App = lazy(() => import('App'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <Suspense fallback>
        <App />
      </Suspense>
    ),
  },
];

export default routes;
