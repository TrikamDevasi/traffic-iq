import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../store/api/apiSlice';
import { setCredentials } from '../store/slices/authSlice';
import { Activity, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await login({ email, password }).unwrap();
      dispatch(setCredentials({
        user: response.data.user,
        token: response.data.accessToken
      }));
      navigate('/');
    } catch (err) {
      console.error('Failed to log in', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg p-4 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-dark-panel p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-dark-border">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-primary-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
            TrafficIQ
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to the Command Center
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-500 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 placeholder-slate-500 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              Invalid credentials or server error.
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-primary-500 group-hover:text-primary-400" />
            </span>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="text-center text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
