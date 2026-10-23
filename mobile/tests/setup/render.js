/**
 * Minimal "render": funksiyali komponentlarni chaqirib, stub teglargacha
 * (Svg, Path, Text, View...) oddiy daraxtga yoyadi. Faqat `useId` hook'i
 * qo'llab-quvvatlanadi — sof chizuvchi komponentlar (Shirt, JerseyPreview) uchun yetarli.
 */
const React = require('react');

const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

function render(element) {
  let counter = 0;
  const dispatcher = { useId: () => `:t${counter++}:` };
  const expand = (node) => {
    if (node == null || typeof node === 'boolean') return [];
    if (Array.isArray(node)) return node.flatMap(expand);
    if (typeof node !== 'object') return [String(node)];
    if (node.type === React.Fragment) return expand(node.props.children);
    const { type, props } = node;
    if (typeof type === 'function' && !type.displayName) {
      const previous = internals.H;
      internals.H = dispatcher;
      try {
        return expand(type(props));
      } finally {
        internals.H = previous;
      }
    }
    const { children, ...rest } = props || {};
    return [{ type: type.displayName || String(type), props: rest, children: expand(children) }];
  };
  return expand(element);
}

/** Daraxtdan `type` bo'yicha tugunlarni qidiradi. */
function findAll(tree, type, predicate = () => true) {
  const out = [];
  const walk = (nodes) => nodes.forEach((n) => {
    if (typeof n !== 'object') return;
    if (n.type === type && predicate(n)) out.push(n);
    walk(n.children);
  });
  walk(Array.isArray(tree) ? tree : [tree]);
  return out;
}

const textOf = (node) => node.children.filter((c) => typeof c === 'string').join('');

module.exports = { render, findAll, textOf };
