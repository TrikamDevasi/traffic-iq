import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || '/api/v1', // Uses VITE_API_URL if defined, otherwise defaults to relative path (caught by vercel.json rewrite)
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Intersection', 'Alert', 'Traffic', 'Simulation', 'User'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
    }),
    getIntersections: builder.query({
      query: () => '/intersections',
      providesTags: ['Intersection'],
    }),
    getKpis: builder.query({
      query: () => '/analytics/kpis',
      providesTags: ['Traffic'],
    }),
    getTrends: builder.query({
      query: (period = '24h') => `/analytics/trends?period=${period}`,
      providesTags: ['Traffic'],
    }),
    getIntersectionById: builder.query({
      query: (id) => `/intersections/${id}`,
      providesTags: (result, error, id) => [{ type: 'Intersection', id }],
    }),
    getTrafficHistory: builder.query({
      query: (id) => `/traffic/${id}/history`,
      providesTags: (result, error, id) => [{ type: 'Traffic', id }],
    }),
    predictOptimalPhase: builder.mutation({
      query: (id) => ({
        url: `/signals/${id}/optimal`,
        method: 'GET',
      }),
      // Even though it's a GET, it's triggered on demand, so mutation is convenient
    }),
    overrideSignal: builder.mutation({
      query: ({ id, phase, duration }) => ({
        url: `/signals/${id}/override`,
        method: 'POST',
        body: { phase, duration },
      }),
    }),
    getAlerts: builder.query({
      query: (params) => {
        let qs = '?';
        if (params?.isResolved !== undefined) qs += `isResolved=${params.isResolved}&`;
        return `/alerts${qs.slice(0, -1)}`;
      },
      providesTags: ['Alert'],
    }),
    getAlertStats: builder.query({
      query: () => '/alerts/stats',
      providesTags: ['Alert'],
    }),
    resolveAlert: builder.mutation({
      query: (id) => ({
        url: `/alerts/${id}/resolve`,
        method: 'PATCH',
      }),
      // Optimistic update for resolve
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const patchResultAll = dispatch(
          apiSlice.util.updateQueryData('getAlerts', undefined, (draft) => {
            const alert = draft?.data?.find((a: any) => a._id === id || a.id === id);
            if (alert) alert.isResolved = true;
          })
        );
        const patchResultActive = dispatch(
          apiSlice.util.updateQueryData('getAlerts', { isResolved: false }, (draft) => {
            if (draft?.data) {
              draft.data = draft.data.filter((a: any) => a._id !== id && a.id !== id);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResultAll.undo();
          patchResultActive.undo();
        }
      },
      invalidatesTags: ['Alert'],
    }),
    runSimulation: builder.mutation({
      query: (body) => ({
        url: '/simulations/run',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Simulation'],
    }),
    getSimulationById: builder.query({
      query: (runId) => `/simulations/${runId}`,
      providesTags: (result, error, arg) => [{ type: 'Simulation', id: arg }],
    }),
    getSimulationHistory: builder.query({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.status) p.append('status', params.status);
        if (params?.limit) p.append('limit', params.limit.toString());
        return `/simulations?${p.toString()}`;
      },
      providesTags: ['Simulation'],
    }),
    getSystemHealth: builder.query({
      query: () => '/admin/health',
    }),
    getAdminStats: builder.query({
      query: () => '/admin/stats',
    }),
    getAuditLogs: builder.query({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.append('page', params.page.toString());
        if (params?.limit) p.append('limit', params.limit.toString());
        return `/admin/audit?${p.toString()}`;
      },
    }),
    getUsers: builder.query({
      query: (params) => {
        const p = new URLSearchParams();
        if (params?.page) p.append('page', params.page.toString());
        if (params?.limit) p.append('limit', params.limit.toString());
        return `/admin/users?${p.toString()}`;
      },
      providesTags: ['User'],
    }),
    updateUserRole: builder.mutation({
      query: ({ id, role }) => ({
        url: `/admin/users/${id}`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['User'],
    }),
    deactivateUser: builder.mutation({
      query: (id) => ({
        url: `/admin/users/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const { 
  useLoginMutation, 
  useRegisterMutation, 
  useGetMeQuery,
  useGetIntersectionsQuery,
  useGetKpisQuery,
  useGetTrendsQuery,
  useGetIntersectionByIdQuery,
  useGetTrafficHistoryQuery,
  usePredictOptimalPhaseMutation,
  useOverrideSignalMutation,
  useGetAlertsQuery,
  useGetAlertStatsQuery,
  useResolveAlertMutation,
  useRunSimulationMutation,
  useGetSimulationByIdQuery,
  useGetSimulationHistoryQuery,
  useGetSystemHealthQuery,
  useGetAdminStatsQuery,
  useGetAuditLogsQuery,
  useGetUsersQuery,
  useUpdateUserRoleMutation,
  useDeactivateUserMutation
} = apiSlice;
