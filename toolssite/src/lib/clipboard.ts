export async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard is unavailable');
  }

  await navigator.clipboard.writeText(text);
}
