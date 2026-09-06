import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { setUser, setLoading, clearUser, selectUser } from '../store/slices/authSlice';
import { pushToast } from '../store/slices/uiSlice';

export function useAuthInitialize() {
  const dispatch = useDispatch();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isLoading) dispatch(setLoading());
    else if (isError) dispatch(clearUser());
    else if (data) dispatch(setUser(data.user));
  }, [data, isLoading, isError, dispatch]);

  useEffect(() => {
    const handler = () => dispatch(clearUser());
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, [dispatch]);
}

export function useAuth() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => authService.login({ email, password }),
    onSuccess: (data) => {
      dispatch(setUser(data.user));
      queryClient.invalidateQueries();
      dispatch(pushToast('Welcome back.'));
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      dispatch(setUser(data.user));
      dispatch(pushToast('Account created. Check your email to verify.'));
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      dispatch(clearUser());
      queryClient.clear();
    },
  });

  return {
    user,
    isAuthenticated: !!user,
    permissions: user?.role?.permissions || [],
    roleName: user?.role?.name,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    registerPending: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
  };
}
