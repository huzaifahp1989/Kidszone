/** Browser download helper for text/SVG blobs. */
export function downloadTextFile(filename: string, text: string, mimeType = 'text/plain') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSvgFile(filename: string, svgMarkup: string) {
  const xml = svgMarkup.includes('<?xml') ? svgMarkup : `<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup}`;
  downloadTextFile(filename.endsWith('.svg') ? filename : `${filename}.svg`, xml, 'image/svg+xml');
}
