import { useState } from 'react';
import WhatsAppSendModal, { useWhatsAppAccess } from './WhatsAppSendModal';

export default function WhatsAppButton(
  { phone, vars = {}, fallbackMessage = '', label = 'WhatsApp', className = 'btn btn-secondary btn-sm', style, appointmentId }
) {
  const [open, setOpen] = useState(false);
  const { connected, canSendThroughApi } = useWhatsAppAccess(appointmentId);

  if (connected && !canSendThroughApi) return null;

  return (
    <>
      <button type="button" className={className} style={style} onClick={() => setOpen(true)}>
        {label}
      </button>
      <WhatsAppSendModal
        open={open}
        onClose={() => setOpen(false)}
        phone={phone}
        vars={vars}
        initialMessage={fallbackMessage}
        appointmentId={appointmentId}
      />
    </>
  );
}
