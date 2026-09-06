import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle',
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'guest';
    },
    setLoading(state) {
      state.status = 'loading';
    },
    clearUser(state) {
      state.user = null;
      state.status = 'guest';
    },
  },
});

export const { setUser, setLoading, clearUser } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (state) => state.auth.user;
export const selectPermissions = (state) => state.auth.user?.role?.permissions || [];
export const selectIsAdmin = (state) => ['admin', 'manager'].includes(state.auth.user?.role?.name);
export const hasPermission = (state, permission) => selectPermissions(state).includes(permission);
