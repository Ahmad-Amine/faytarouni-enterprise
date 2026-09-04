import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { ErrorBanner } from '../../components/Feedback';

export default function ResetPassword() {
  const { t } = useTranslation(); const [params]=useSearchParams(); const token=params.get('token'); const [password,setPassword]=useState(''); const navigate=useNavigate();
  const mutation=useMutation({mutationFn:()=>authService.resetPassword(token,password),onSuccess:()=>navigate('/login')});
  if(!token)return <div className="container auth-shell" style={{padding:'70px 24px',maxWidth:420}}><ErrorBanner message={t('auth.missingReset')}/><Link to="/forgot-password" className="btn btn-primary">{t('auth.requestNewLink')}</Link></div>;
  return <div className="container auth-shell" style={{padding:'70px 24px',maxWidth:420}}><h1 style={{color:'var(--accent)',fontSize:28}}>{t('auth.setNewPassword')}</h1><form className="card" onSubmit={(e)=>{e.preventDefault();mutation.mutate();}} style={{marginTop:24}}><ErrorBanner message={mutation.error?.message}/><div className="field"><label>{t('auth.newPassword')}</label><input className="input" type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)}/></div><button type="submit" className="btn btn-primary btn-block" disabled={mutation.isPending}>{mutation.isPending?t('auth.saving'):t('auth.resetPassword')}</button></form></div>;
}
