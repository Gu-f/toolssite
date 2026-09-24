import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';
import { copyTextToClipboard } from '../lib/clipboard';

type CopyButtonProps = {
  value: string;
};

const RESET_DELAY_MS = 1500;

export default function CopyButton({ value }: CopyButtonProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setStatus('idle');

    copyTextToClipboard(value)
      .then(() => {
        setStatus('copied');
        timeoutRef.current = window.setTimeout(() => setStatus('idle'), RESET_DELAY_MS);
      })
      .catch(() => {
        setStatus('error');
        timeoutRef.current = window.setTimeout(() => setStatus('idle'), RESET_DELAY_MS);
      });
  };

  return (
    <button
      type="button"
      className={`button button-secondary copy-button${status === 'error' ? ' has-error' : ''}`}
      onClick={handleClick}
    >
      {status === 'copied' ? t('common.copied') : status === 'error' ? t('common.copyFailed') : t('common.copy')}
    </button>
  );
}
