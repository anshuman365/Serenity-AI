
import React, { useMemo } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const processedContent = useMemo(() => {
    if (!content) return null;

    let html = content
      // Escape HTML to prevent XSS but keep our injections
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      
      // Code Blocks with IDs for copying
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const id = Math.random().toString(36).substr(2, 9);
        return `
          <div class="relative group my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
            <div class="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-white/5 text-[10px] text-gray-400 font-mono">
              <span>${lang.toUpperCase() || 'CODE'}</span>
              <button onclick="window.dispatchEvent(new CustomEvent('copy-code', {detail: {text: \`${code.trim()}\`, id: '${id}'}}))" class="hover:text-white transition-colors flex items-center gap-1">
                Copy
              </button>
            </div>
            <pre class="p-4 bg-gray-950 text-gray-300 text-sm overflow-x-auto font-mono"><code>${code.trim()}</code></pre>
          </div>`;
      })

      // Tables
      .replace(/\|(.+)\|/g, (match) => {
        if (match.includes('---')) return '';
        const cells = match.split('|').filter(c => c.trim() !== '');
        return `<tr class="border-b border-gray-100 dark:border-gray-800">${cells.map(c => `<td class="p-2">${c.trim()}</td>`).join('')}</tr>`;
      })

      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white">$1</h1>')

      // Bold/Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

      // Lists
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="ml-4 list-disc text-gray-700 dark:text-gray-300">$1</li>')
      .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-gray-700 dark:text-gray-300">$1</li>')

      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline font-medium">$1</a>')

      // Paragraphs (Double newlines)
      .replace(/\n\n/g, '<p class="mb-4"></p>')
      .replace(/\n/g, '<br/>');

    // Wrap tables
    html = html.replace(/(<tr.*?>.*?<\/tr>)+/g, '<div class="overflow-x-auto my-4"><table class="w-full text-left border border-gray-100 dark:border-gray-800 rounded-lg"><tbody>$&</tbody></table></div>');

    return { __html: html };
  }, [content]);

  // Global handler for copy events from generated HTML
  React.useEffect(() => {
    const handler = (e: any) => {
      const { text, id } = e.detail;
      navigator.clipboard.writeText(text);
      // We could use state here to show toast
    };
    window.addEventListener('copy-code', handler);
    return () => window.removeEventListener('copy-code', handler);
  }, []);

  return (
    <div 
      className={`markdown-body prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={processedContent || { __html: '' }}
    />
  );
};

export default MarkdownRenderer;
