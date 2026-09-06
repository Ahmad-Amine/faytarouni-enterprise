import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services/authService';
import { ErrorBanner, SuccessBanner } from '../../components/Feedback';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: () => authService.forgotPassword(email) });
  return <div className="container auth-shell" style={{ padding:'70px 24px', maxWidth:420 }}><h1 style={{color:'var(--accent)',fontSize:28}}>{t('auth.resetTitle')}</h1><form className="card" onSubmit={(e)=>{e.preventDefault();mutation.mutate();}} style={{marginTop:24}}><ErrorBanner message={mutation.error?.message}/>{mutation.isSuccess&&<SuccessBanner message={t('auth.resetSent')}/>}<div className="field"><label>{t('auth.email')}</label><input className="input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></div><button type="submit" className="btn btn-primary btn-block" disabled={mutation.isPending}>{mutation.isPending?t('auth.sending'):t('auth.sendReset')}</button></form></div>;
}
