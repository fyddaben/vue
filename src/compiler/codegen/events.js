/* @flow */

const fnExpRE = /^\s*([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/
const simplePathRE = /^\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?']|\[".*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*\s*$/

// keyCode aliases
const keyCodes = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

const modifierCode = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: 'if($event.target !== $event.currentTarget)return;'
}

const isMouseEventRE = /^mouse|^pointer|^(click|dblclick|contextmenu|wheel)$/
const mouseEventModifierCode = {
  ctrl: 'if(!$event.ctrlKey)return;',
  shift: 'if(!$event.shiftKey)return;',
  alt: 'if(!$event.altKey)return;',
  meta: 'if(!$event.metaKey)return;'
}

export function genHandlers (events: ASTElementHandlers, native?: boolean): string {
  let res = native ? 'nativeOn:{' : 'on:{'
  for (const name in events) {
    res += `"${name}":${genHandler(name, events[name])},`
  }
  return res.slice(0, -1) + '}'
}

function genHandler (
  name: string,
  handler: ASTElementHandler | Array<ASTElementHandler>
): string {
  if (!handler) {
    return 'function(){}'
  } else if (Array.isArray(handler)) {
    return `[${handler.map(handler => genHandler(name, handler)).join(',')}]`
  } else if (!handler.modifiers) {
    return fnExpRE.test(handler.value) || simplePathRE.test(handler.value)
      ? handler.value
      : `function($event){${handler.value}}`
  } else {
    let code = ''
    const keys = []
    const isMouseEvnet = isMouseEventRE.test(name)
    for (const key in handler.modifiers) {
      if (modifierCode[key]) {
        code += modifierCode[key]
      } else if (isMouseEvnet && mouseEventModifierCode[key]) {
        code += mouseEventModifierCode[key]
      } else {
        keys.push(key)
      }
    }
    if (keys.length) {
      code = genKeyFilter(keys) + code
    }
    const handlerCode = simplePathRE.test(handler.value)
      ? handler.value + '($event)'
      : handler.value
    return 'function($event){' + code + handlerCode + '}'
  }
}

function genKeyFilter (keys: Array<string>): string {
  const code = keys.length === 1
    ? normalizeKeyCode(keys[0])
    : Array.prototype.concat.apply([], keys.map(normalizeKeyCode))
  if (Array.isArray(code)) {
    return `if(${code.map(c => `$event.keyCode!==${c}`).join('&&')})return;`
  } else {
    return `if($event.keyCode!==${code})return;`
  }
}

function normalizeKeyCode (key) {
  return (
    parseInt(key, 10) || // number keyCode
    keyCodes[key] || // built-in alias
    `_k(${JSON.stringify(key)})` // custom alias
  )
}
