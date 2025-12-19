import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Function to render LaTeX formulas
  const renderWithMarkdown = (text: string) => {
    if (!text) return null;
    
    // Process LaTeX inline formulas: $...$
    const latexInline = text.replace(/\$(.*?)\$/g, (match, formula) => {
      return `<span class="latex-inline">${formula}</span>`;
    });
    
    // Process LaTeX block formulas: $$...$$
    const latexBlock = latexInline.replace(/\$\$(.*?)\$\$/g, (match, formula) => {
      return `<div class="latex-block">${formula}</div>`;
    });
    
    // Process markdown headers
    let processed = latexBlock
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      
      // Process bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      
      // Process italic *text*
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Process italic _text_
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      
      // Process code blocks ```
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg my-3 overflow-x-auto text-sm"><code>$1</code></pre>')
      
      // Process inline code `code`
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Process unordered lists
      .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/(<li.*?>.*?<\/li>\n?)+/g, '<ul class="my-2 pl-5 space-y-1">$&</ul>')
      
      // Process ordered lists
      .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/(<li class="ml-4 list-decimal".*?>.*?<\/li>\n?)+/g, '<ol class="my-2 pl-5 space-y-1">$&</ol>')
      
      // Process links [text](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-600 hover:underline">$1</a>')
      
      // Process line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    
    // Wrap list items properly
    processed = processed.replace(/<ul class="my-2 pl-5 space-y-1">\s*/g, '<ul class="my-2 pl-5 space-y-1">');
    processed = processed.replace(/<ol class="my-2 pl-5 space-y-1">\s*/g, '<ol class="my-2 pl-5 space-y-1">');
    
    // Remove duplicate list wrappers
    processed = processed.replace(/<\/ul>\s*<ul/g, '</ul><ul');
    processed = processed.replace(/<\/ol>\s*<ol/g, '</ol><ol');
    
    return { __html: processed };
  };

  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={renderWithMarkdown(content)}
    />
  );
};

export default MarkdownRenderer;