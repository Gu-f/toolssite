import { useEffect, useRef, useState } from 'react';
import CopyButton from '../../../components/CopyButton';
import OptionToggle from '../../../components/OptionToggle';
import { useTranslation } from '../../../i18n/LanguageContext';
import { translateMessage } from '../../../i18n/translations';
import ToolField from '../../../components/ToolField';
import ToolHeader from '../../../components/ToolHeader';
import {
  calculateMd5,
  calculateSha1,
  calculateSha256,
  HASH_ALGORITHMS,
  type HashAlgorithm,
  type HashResults,
} from '../../../lib/hash';
import { TOOL_STATE_DEFINITIONS } from '../workspace/toolStates';
import { useToolTabState } from '../workspace/useToolTabState';

type HashSource = 'text' | 'file';

const NO_ALGORITHM_ERROR = 'No hash algorithm is selected';
const MISSING_FILE_ERROR = 'Choose a file to hash';

// File verification commonly requires only MD5, while text use cases often need stronger hashes.
export default function HashTool() {
  const { t } = useTranslation();
  const [state, setState] = useToolTabState(TOOL_STATE_DEFINITIONS.hash);
  const {
    mode,
    input,
    textAlgorithms,
    fileAlgorithms,
    textResults,
    fileResults,
    error,
  } = state;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const requestRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const requestToken = requestRef;

    return () => {
      requestToken.current += 1;
    };
  }, []);

  const selectedAlgorithms = mode === 'text' ? textAlgorithms : fileAlgorithms;

  const updateAlgorithms = (source: HashSource, algorithm: HashAlgorithm, checked: boolean) => {
    setState((current) => {
      const algorithms = source === 'text' ? current.textAlgorithms : current.fileAlgorithms;
      const nextAlgorithms = checked
        ? [...algorithms, algorithm]
        : algorithms.filter((item) => item !== algorithm);

      return source === 'text'
        ? { ...current, textAlgorithms: nextAlgorithms }
        : { ...current, fileAlgorithms: nextAlgorithms };
    });
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    setState((current) => ({
      ...current,
      fileResults: { 'SHA-256': '', 'SHA-1': '', MD5: '' },
      error: '',
    }));
  };

  const run = () => {
    if (selectedAlgorithms.length === 0) {
      setState((current) => ({ ...current, error: NO_ALGORITHM_ERROR }));
      return;
    }

    if (mode === 'file' && !selectedFile) {
      setState((current) => ({ ...current, error: MISSING_FILE_ERROR }));
      return;
    }

    setState((current) => ({ ...current, error: '' }));
    setIsCalculating(true);
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    const calculateSource = async (source: string | Uint8Array<ArrayBuffer>) => {
      const hashEntries = await Promise.all(selectedAlgorithms.map(async (algorithm) => {
        const value = algorithm === 'SHA-256'
          ? await calculateSha256(source)
          : algorithm === 'SHA-1'
            ? await calculateSha1(source)
            : calculateMd5(source);

        return [algorithm, value] as const;
      }));

      const hashes: HashResults = { 'SHA-256': '', 'SHA-1': '', MD5: '' };

      for (const [algorithm, value] of hashEntries) {
        hashes[algorithm] = value;
      }

      return hashes;
    };

    const calculate = async () => {
      if (mode === 'file') {
        const file = selectedFile;

        if (!file) {
          throw new Error(MISSING_FILE_ERROR);
        }

        return calculateSource(new Uint8Array(await file.arrayBuffer()));
      }

      return calculateSource(input);
    };

    calculate().then((hashes) => {
      if (requestRef.current !== requestId) {
        return;
      }

      setState((current) => ({
        ...current,
        ...(mode === 'text' ? { textResults: hashes } : { fileResults: hashes }),
      }));
    }).catch(() => {
      if (requestRef.current !== requestId) {
        return;
      }

      setState((current) => ({
        ...current,
        error: 'Hash generation is unavailable in this browser context',
      }));
    }).finally(() => {
      if (requestRef.current === requestId) {
        setIsCalculating(false);
      }
    });
  };

  const clear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setSelectedFile(null);
    setState((current) => ({
      ...current,
      input: '',
      textResults: { 'SHA-256': '', 'SHA-1': '', MD5: '' },
      fileResults: { 'SHA-256': '', 'SHA-1': '', MD5: '' },
      error: '',
    }));
  };

  const sourceOptions = [
    { value: 'text', label: t('tools.hash.text') },
    { value: 'file', label: t('tools.hash.file') },
  ] as const satisfies ReadonlyArray<{ value: HashSource; label: string } >;
  const activeResults = mode === 'text' ? textResults : fileResults;
  // File objects are not persisted, so old file hashes stay hidden until a file is selected again.
  const shouldShowResults = mode === 'text' || Boolean(selectedFile);

  return (
    <div className="tool-page">
      <ToolHeader
        title={t('tools.hash.title')}
      />
      <div className="inline-controls hash-controls">
        <OptionToggle<HashSource>
          label={t('tools.hash.source')}
          value={mode}
          options={sourceOptions}
          onChange={(nextMode) => setState((current) => ({
            ...current,
            mode: nextMode,
            error: '',
          }))}
        />
        <fieldset className="hash-algorithms">
          <legend className="control-label">{t('tools.hash.algorithms')}</legend>
          {HASH_ALGORITHMS.map((algorithm) => (
            <label
              key={algorithm}
              className="hash-algorithm"
            >
              <input
                type="checkbox"
                checked={selectedAlgorithms.includes(algorithm)}
                onChange={(event) => updateAlgorithms(mode, algorithm, event.target.checked)}
              />
              <span>{algorithm}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {mode === 'text' ? (
        <ToolField id="hash-input" label={t('tools.hash.input')}>
          <textarea
            id="hash-input"
            className="code-area code-area-medium"
            value={input}
            onChange={(event) => setState((current) => ({
              ...current,
              input: event.target.value,
            }))}
            placeholder={t('tools.hash.inputPlaceholder')}
          />
        </ToolField>
      ) : (
        <ToolField id="hash-file" label={t('tools.hash.upload')}>
          <div className="hash-file-control">
            <input
              id="hash-file"
              ref={(element) => {
                fileInputRef.current = element;
              }}
              className="hash-file-input"
              type="file"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            <label
              htmlFor="hash-file"
              className="button button-secondary hash-file-button"
            >
              {t('tools.hash.chooseFile')}
            </label>
            <span
              className="hash-file-name"
              aria-live="polite"
            >
              {selectedFile?.name ?? t('tools.hash.noFile')}
            </span>
          </div>
        </ToolField>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button button-primary"
          disabled={isCalculating}
          onClick={run}
        >
          {isCalculating ? t('common.loading') : t('tools.hash.calculate')}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={clear}
        >
          {t('common.clear')}
        </button>
      </div>
      {shouldShowResults && HASH_ALGORITHMS
        .filter((algorithm) => selectedAlgorithms.includes(algorithm)
          && activeResults[algorithm].length > 0)
        .map((algorithm) => (
          <ToolField
            key={algorithm}
            id={`hash-${algorithm}`}
            label={algorithm}
            overlay={<CopyButton value={activeResults[algorithm]} />}
          >
            <output
              id={`hash-${algorithm}`}
              className="code-area code-area-minimal code-area-output hash-output"
            >
              {activeResults[algorithm]}
            </output>
          </ToolField>
      ))}
      {error && (
        <p
          className="status-message status-error"
          role="alert"
        >
          {translateMessage(error, t)}
        </p>
      )}
    </div>
  );
}
