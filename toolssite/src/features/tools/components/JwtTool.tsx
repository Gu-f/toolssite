import { useEffect, useRef, useState } from 'react';
import CopyButton from '../../../components/CopyButton';
import OptionToggle from '../../../components/OptionToggle';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import {
  JWT_ALGORITHMS,
  JWT_CUSTOM_ALGORITHM,
  createJwtHeaderText,
  decodeJwt,
  encodeJwt,
  isJwtAlgorithm,
  isJwtAlgorithmOption,
  importJwtKey,
  verifyJwtSignature,
  type JwtAlgorithm,
  type JwtAlgorithmOption,
  type JwtKey,
  type JwtToken,
} from '../../../lib/jwt';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type JwtMode = 'decode' | 'encode';

type JwtVerification = 'valid' | 'invalid';

type JwtFieldError = 'invalidFormat' | 'invalidJson';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: string, label: 'header' | 'payload'): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label} JSON`);
  }

  if (!isRecord(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return parsed;
}

function getDecodedAlgorithm(header: Record<string, unknown>): string {
  const algorithm = header.alg;

  return typeof algorithm === 'string' && algorithm.trim() ? algorithm : '—';
}

function setHeaderAlgorithm(
  headerText: string,
  algorithm: JwtAlgorithm,
): string {
  const header = parseJsonObject(headerText, 'header');

  return JSON.stringify({ ...header, alg: algorithm }, null, 2);
}

export default function JwtTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.jwt);
  const {
    mode,
    input,
    headerText,
    payloadText,
    algorithm,
    encodedToken,
    error,
  } = state;
  const [signingKey, setSigningKey] = useState('');
  const [isSigningKeyMissing, setIsSigningKeyMissing] = useState(false);
  const [headerError, setHeaderError] = useState<JwtFieldError | null>(null);
  const [payloadError, setPayloadError] = useState<JwtFieldError | null>(null);
  const [decodedToken, setDecodedToken] = useState<JwtToken | null>(null);
  const [decodeError, setDecodeError] = useState('');
  const [keyVerification, setKeyVerification] = useState<JwtVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const verificationRequestRef = useRef(0);
  const signingRequestRef = useRef(0);

  useEffect(() => {
    const requestToken = verificationRequestRef;

    return () => {
      requestToken.current += 1;
      signingRequestRef.current += 1;
    };
  }, []);

  const invalidateVerification = () => {
    verificationRequestRef.current += 1;
    setKeyVerification(null);
    setIsVerifying(false);
    setIsSigningKeyMissing(false);
  };

  const updateState = (changes: Partial<typeof state>) => {
    setState((current) => ({ ...current, ...changes }));
  };

  const decode = async () => {
    invalidateVerification();

    let token: JwtToken;

    try {
      token = decodeJwt(input);
      setDecodedToken(token);
      setDecodeError('');
    } catch (caught) {
      setDecodedToken(null);
      setDecodeError(caught instanceof Error ? caught.message : 'Decode error');
      return;
    }

    const tokenAlgorithm = token.header.alg;

    if (!signingKey.trim()) {
      setKeyVerification('invalid');
      return;
    }

    if (!isJwtAlgorithm(tokenAlgorithm)) {
      setKeyVerification('invalid');
      return;
    }

    const requestId = verificationRequestRef.current + 1;
    verificationRequestRef.current = requestId;
    setIsVerifying(true);

    try {
      const key = await importJwtKey(signingKey, tokenAlgorithm, 'verify');

      if (verificationRequestRef.current !== requestId) {
        return;
      }

      await verifyJwtSignature(input, key, tokenAlgorithm);

      if (verificationRequestRef.current !== requestId) {
        return;
      }

      setKeyVerification('valid');
    } catch {
      if (verificationRequestRef.current === requestId) {
        setKeyVerification('invalid');
      }
    } finally {
      if (verificationRequestRef.current === requestId) {
        setIsVerifying(false);
      }
    }
  };

  const updateToken = (value: string) => {
    invalidateVerification();
    setDecodedToken(null);
    setDecodeError('');

    updateState({ input: value });
  };

  const updateAlgorithm = (nextAlgorithm: JwtAlgorithmOption) => {
    invalidateVerification();
    signingRequestRef.current += 1;
    setIsSigning(false);

    if (nextAlgorithm === JWT_CUSTOM_ALGORITHM) {
      updateState({ algorithm: nextAlgorithm });
      return;
    }

    try {
      updateState({
        algorithm: nextAlgorithm,
        headerText: setHeaderAlgorithm(headerText, nextAlgorithm),
      });
      setHeaderError(null);
    } catch {
      // Leave invalid Header text untouched; the field already shows its error.
      updateState({ algorithm: nextAlgorithm });
    }
  };

  const updateSigningKey = (value: string) => {
    invalidateVerification();
    signingRequestRef.current += 1;
    setIsSigning(false);
    setSigningKey(value);
    setIsSigningKeyMissing(false);
  };

  const updateHeaderText = (value: string) => {
    setHeaderError(null);
    updateState({ headerText: value });
  };

  const updatePayloadText = (value: string) => {
    setPayloadError(null);
    updateState({ payloadText: value });
  };

  const validateHeader = () => {
    let parsedHeader: unknown;

    try {
      parsedHeader = JSON.parse(headerText);
    } catch {
      setHeaderError('invalidJson');
      return;
    }

    if (!isRecord(parsedHeader)) {
      setHeaderError('invalidFormat');
      return;
    }

    const header = parsedHeader;
    const algorithm = header.alg;

    if (typeof algorithm !== 'string' || !algorithm.trim()) {
      setHeaderError('invalidFormat');
      return;
    }

    setHeaderError(null);
    updateState({
      headerText: JSON.stringify(header, null, 2),
      algorithm: isJwtAlgorithm(algorithm) ? algorithm : JWT_CUSTOM_ALGORITHM,
    });
  };

  const validatePayload = () => {
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      setPayloadError('invalidJson');
      return;
    }

    if (!isRecord(parsedPayload)) {
      setPayloadError('invalidFormat');
      return;
    }

    const payload = parsedPayload;
    setPayloadError(null);
    updateState({ payloadText: JSON.stringify(payload, null, 2) });
  };

  const encode = async () => {
    const requestId = signingRequestRef.current + 1;

    if (!signingKey.trim()) {
      signingRequestRef.current += 1;
      setIsSigning(false);
      setIsSigningKeyMissing(true);
      updateState({ encodedToken: '', error: '' });
      return;
    }

    try {
      const header = parseJsonObject(headerText, 'header');
      const payload = parseJsonObject(payloadText, 'payload');
      const headerAlgorithm = header.alg;
      const signingAlgorithm = algorithm === JWT_CUSTOM_ALGORITHM
        ? (isJwtAlgorithm(headerAlgorithm) ? headerAlgorithm : null)
        : algorithm;

      if (!signingAlgorithm) {
        updateState({ encodedToken: '', error: 'Unsupported JWT algorithm' });
        return;
      }

      setIsSigning(true);
      signingRequestRef.current = requestId;
      const key: JwtKey = await importJwtKey(signingKey, signingAlgorithm, 'sign');

      if (signingRequestRef.current !== requestId) {
        return;
      }

      const token = await encodeJwt(header, payload, key, signingAlgorithm);

      if (signingRequestRef.current !== requestId) {
        return;
      }

      updateState({ encodedToken: token, error: '' });
    } catch (caught) {
      updateState({
        error: caught instanceof Error ? caught.message : 'Unable to encode JWT',
      });
    } finally {
      if (signingRequestRef.current === requestId) {
        setIsSigning(false);
      }
    }
  };

  const clear = () => {
    invalidateVerification();
    setDecodedToken(null);
    setDecodeError('');
    signingRequestRef.current += 1;
    setIsSigning(false);
    setSigningKey('');
    setIsSigningKeyMissing(false);
    setHeaderError(null);
    setPayloadError(null);
    setState((current) => ({
      ...current,
      algorithm: 'HS256',
      input: '',
      headerText: createJwtHeaderText('HS256'),
      payloadText: '{}',
      encodedToken: '',
      error: '',
    }));
  };

  const modeOptions = [
    { value: 'decode', label: t('tools.jwt.decode') },
    { value: 'encode', label: t('tools.jwt.encode') },
  ] as const satisfies ReadonlyArray<{ value: JwtMode; label: string }>;
  const keyLabel = mode === 'decode'
    ? t('tools.jwt.verificationKey')
    : t('tools.jwt.signingKey');
  const decodeKeyAlgorithm = decodedToken && isJwtAlgorithm(decodedToken.header.alg)
    ? decodedToken.header.alg
    : isJwtAlgorithm(algorithm)
      ? algorithm
      : null;

  return (
    <div className="tool-page">
      <ToolHeader title={t('tools.jwt.title')} />
      <div className="inline-controls">
        <OptionToggle<JwtMode>
          label={t('tools.jwt.mode')}
          value={mode}
          options={modeOptions}
          onChange={(nextMode) => {
            invalidateVerification();
            signingRequestRef.current += 1;
            setIsSigning(false);
            updateState({ mode: nextMode, error: '' });
          }}
        />
      </div>

      {mode === 'decode' ? (
        <>
          <ToolField id="jwt-input" label={t('tools.jwt.token')}>
            <textarea
              id="jwt-input"
              className="code-area code-area-compact"
              value={input}
              onChange={(event) => updateToken(event.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
              spellCheck={false}
            />
          </ToolField>
          <div className="field-grid jwt-controls jwt-decode-controls">
            <ToolField id="jwt-algorithm" label={t('tools.jwt.algorithm')}>
              <output
                id="jwt-algorithm"
                className="jwt-select jwt-algorithm-output"
              >
                {decodedToken ? getDecodedAlgorithm(decodedToken.header) : ''}
              </output>
            </ToolField>
            <ToolField
              id="jwt-signature"
              label={t('tools.jwt.signature')}
              overlay={decodedToken ? <CopyButton value={decodedToken.signature} /> : undefined}
            >
              <output
                id="jwt-signature"
                className="code-area code-area-minimal code-area-output signature-output"
              >
                {decodedToken?.signature}
              </output>
            </ToolField>
            <ToolField
              id="jwt-signing-key"
              label={keyLabel}
              extra={keyVerification && (
                <span
                  id="jwt-key-status"
                  className={`tag ${keyVerification === 'valid' ? 'tag-green' : 'tag-error'}`}
                  role="status"
                >
                  {keyVerification === 'valid'
                    ? t('tools.jwt.keyValid')
                    : t('tools.jwt.keyInvalid')}
                </span>
              )}
            >
              <textarea
                id="jwt-signing-key"
                className="code-area code-area-compact"
                value={signingKey}
                onChange={(event) => updateSigningKey(event.target.value)}
                placeholder={decodeKeyAlgorithm?.startsWith('HS')
                  ? 'your-256-bit-secret…'
                  : '-----BEGIN PUBLIC KEY-----…'}
                spellCheck={false}
                autoComplete="off"
                aria-describedby={keyVerification ? 'jwt-key-status' : undefined}
              />
            </ToolField>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              disabled={!input.trim() || isVerifying}
              onClick={decode}
            >
              {isVerifying ? t('common.loading') : t('tools.jwt.decode')}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={clear}
            >
              {t('common.clear')}
            </button>
          </div>
          {(decodeError || error) && (
            <p className="status-message status-error" role="alert">
              {translateMessage(decodeError || error, t)}
            </p>
          )}
          {decodedToken && (
            <div className="field-grid jwt-results">
              <ToolField id="jwt-header" label={t('tools.jwt.decodedHeader')}>
                <textarea
                  id="jwt-header"
                  className="code-area code-area-medium code-area-output"
                  readOnly
                  value={JSON.stringify(decodedToken.header, null, 2)}
                />
              </ToolField>
              <ToolField
                id="jwt-payload"
                label={t('tools.jwt.decodedPayload')}
              >
                <textarea
                  id="jwt-payload"
                  className="code-area code-area-medium code-area-output"
                  readOnly
                  value={JSON.stringify(decodedToken.payload, null, 2)}
                />
              </ToolField>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="field-grid">
            <ToolField id="jwt-encode-header" label={t('tools.jwt.header')}>
              <textarea
                id="jwt-encode-header"
                className={`code-area code-area-medium${headerError ? ' has-error' : ''}`}
                value={headerText}
                onChange={(event) => updateHeaderText(event.target.value)}
                onBlur={validateHeader}
                placeholder='{"alg": "HS256", "typ": "JWT"}'
                spellCheck={false}
                aria-invalid={Boolean(headerError) || undefined}
                aria-describedby={headerError ? 'jwt-header-error' : undefined}
              />
              {headerError && (
                <p
                  id="jwt-header-error"
                  className="field-error"
                  role="alert"
                >
                  {headerError === 'invalidJson'
                    ? t('tools.jwt.invalidHeaderJsonFormat')
                    : t('tools.jwt.invalidHeaderFormat')}
                </p>
              )}
            </ToolField>
            <ToolField id="jwt-encode-payload" label={t('tools.jwt.payload')}>
              <textarea
                id="jwt-encode-payload"
                className={`code-area code-area-medium${payloadError ? ' has-error' : ''}`}
                value={payloadText}
                onChange={(event) => updatePayloadText(event.target.value)}
                onBlur={validatePayload}
                placeholder='{"sub": "1234567890"}'
                spellCheck={false}
                aria-invalid={Boolean(payloadError) || undefined}
                aria-describedby={payloadError ? 'jwt-payload-error' : undefined}
              />
              {payloadError && (
                <p
                  id="jwt-payload-error"
                  className="field-error"
                  role="alert"
                >
                  {payloadError === 'invalidJson'
                    ? t('tools.jwt.invalidPayloadJsonFormat')
                    : t('tools.jwt.invalidPayloadFormat')}
                </p>
              )}
            </ToolField>
          </div>
          <div className="field-grid jwt-controls">
            <ToolField id="jwt-encode-algorithm" label={t('tools.jwt.algorithm')}>
              <select
                id="jwt-encode-algorithm"
                className="jwt-select"
                value={algorithm}
                onChange={(event) => {
                  const nextAlgorithm = event.target.value;

                  if (isJwtAlgorithmOption(nextAlgorithm)) {
                    updateAlgorithm(nextAlgorithm);
                  }
                }}
              >
                {JWT_ALGORITHMS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
                <option value={JWT_CUSTOM_ALGORITHM}>{t('tools.jwt.customAlgorithm')}</option>
              </select>
            </ToolField>
            <ToolField
              id="jwt-encode-key"
              label={keyLabel}
              extra={isSigningKeyMissing && (
                <span
                  id="jwt-signing-key-required"
                  className="tag tag-error"
                  role="alert"
                >
                  {t('tools.jwt.keyRequired')}
                </span>
              )}
            >
              <textarea
                id="jwt-encode-key"
                className={`code-area code-area-compact${isSigningKeyMissing ? ' has-error' : ''}`}
                value={signingKey}
                onChange={(event) => updateSigningKey(event.target.value)}
                placeholder={algorithm.startsWith('HS')
                  ? 'your-256-bit-secret…'
                  : '-----BEGIN PRIVATE KEY-----…'}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={isSigningKeyMissing || undefined}
                aria-describedby={isSigningKeyMissing ? 'jwt-signing-key-required' : undefined}
              />
            </ToolField>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              disabled={isSigning}
              onClick={encode}
            >
              {isSigning ? t('common.loading') : t('tools.jwt.encode')}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={clear}
            >
              {t('common.clear')}
            </button>
          </div>
          {error && (
            <p className="status-message status-error" role="alert">
              {translateMessage(error, t)}
            </p>
          )}
          {encodedToken && (
            <ToolField
              id="jwt-encoded-token"
              label={t('tools.jwt.token')}
              overlay={<CopyButton value={encodedToken} />}
            >
              <textarea
                id="jwt-encoded-token"
                className="code-area code-area-compact code-area-output"
                readOnly
                value={encodedToken}
              />
            </ToolField>
          )}
        </>
      )}
    </div>
  );
}
