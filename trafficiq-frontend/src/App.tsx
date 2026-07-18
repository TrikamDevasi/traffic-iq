import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import IntersectionDetail from './pages/IntersectionDetail';
import Alerts from './pages/Alerts';
import Simulation from './pages/Simulation';

import Admin from './pages/Admin';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'map',
            element: <LiveMap />,
          },
          {
            path: 'intersections/:id',
            element: <IntersectionDetail />,
          },
          {
            path: 'alerts',
            element: <Alerts />,
          },
          {
            path: 'simulation',
            element: <Simulation />,
          },
          {
            path: 'admin',
            element: <Admin />,
          },
          // Future routes will go here
        ],
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
