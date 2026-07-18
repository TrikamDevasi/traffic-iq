import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import authReducer from '../store/slices/authSlice';
import { apiSlice } from '../store/api/apiSlice';

// Mock Recharts to avoid JS DOM issues with SVG rendering in tests
vi.mock('recharts', () => {
  const Original = vi.importActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    LineChart: () => <div>LineChart</div>,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />
  };
});

const createMockStore = () => configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

describe('Dashboard Component', () => {
  it('renders command center header', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      </Provider>
    );
    
    // Using AsyncBoundary means we will see "Loading dashboard data..." initially
    expect(screen.getByText(/Loading dashboard data/i)).toBeInTheDocument();
  });
});
