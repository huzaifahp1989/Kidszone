import type { ReactNode } from 'react';
import { createElement } from 'react';
import { getTajweedRule } from '@/data/tajweed-rules';

export type TajweedNode =
  | { type: 'text'; value: string }
  | { type: 'rule'; ruleId: string; children: TajweedNode[] };

function tryParseTag(input: string, start: number): { node: TajweedNode; end: number } | null {
  if (input[start] !== '[') return null;

  let i = start + 1;
  if (i >= input.length) return null;

  const ruleChar = input[i];
  if (!/[a-z]/.test(ruleChar)) return null;
  i++;

  if (input[i] === ':') {
    i++;
    while (i < input.length && /[0-9]/.test(input[i])) i++;
  }

  if (input[i] !== '[') return null;
  i++;

  const children: TajweedNode[] = [];
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      children.push({ type: 'text', value: textBuf });
      textBuf = '';
    }
  };

  while (i < input.length) {
    if (input[i] === ']') {
      flushText();
      return {
        node: { type: 'rule', ruleId: ruleChar, children },
        end: i + 1,
      };
    }
    if (input[i] === '[') {
      const nested = tryParseTag(input, i);
      if (nested) {
        flushText();
        children.push(nested.node);
        i = nested.end;
        continue;
      }
    }
    textBuf += input[i];
    i++;
  }

  return null;
}

function parseSequence(input: string, start = 0): { nodes: TajweedNode[]; end: number } {
  const nodes: TajweedNode[] = [];
  let i = start;
  let textBuf = '';

  const flushText = () => {
    if (textBuf) {
      nodes.push({ type: 'text', value: textBuf });
      textBuf = '';
    }
  };

  while (i < input.length) {
    if (input[i] === '[') {
      const tag = tryParseTag(input, i);
      if (tag) {
        flushText();
        nodes.push(tag.node);
        i = tag.end;
        continue;
      }
    }
    textBuf += input[i];
    i++;
  }

  flushText();
  return { nodes, end: i };
}

export function parseTajweedMarkup(input: string): TajweedNode[] {
  if (!input || !input.includes('[')) {
    return input ? [{ type: 'text', value: input }] : [];
  }
  return parseSequence(input).nodes;
}

function renderNodes(nodes: TajweedNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === 'text') {
      return createElement('span', { key }, node.value);
    }

    const rule = getTajweedRule(node.ruleId);
    return createElement(
      'span',
      {
        key,
        className: 'tajweed-mark rounded-sm px-px transition-colors',
        style: rule ? { color: rule.color } : undefined,
        title: rule?.kidTip,
        'data-tajweed': node.ruleId,
      },
      renderNodes(node.children, key)
    );
  });
}

export function renderTajweedArabic(
  markup: string | undefined,
  fallback: string,
  className?: string
): ReactNode {
  const source = markup && markup.includes('[') ? markup : fallback;
  const nodes = parseTajweedMarkup(source);

  return createElement(
    'span',
    {
      className: className,
      dir: 'rtl',
    },
    renderNodes(nodes, 'tj')
  );
}
