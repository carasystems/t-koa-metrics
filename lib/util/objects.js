/* eslint-disable no-param-reassign */
function safeGet(object, property) {
  return property === '__proto__' ? undefined : object[property];
}

function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}

function isObject(obj) {
  return typeof obj === 'object';
}

function isBuffer(val) {
  return val instanceof Buffer;
}

function isDate(val) {
  return val instanceof Date;
}

function isRegExp(val) {
  return val instanceof RegExp;
}

function handleForBuffer(val) {
  const x = Buffer.alloc(val.length);
  val.copy(x);
  return x;
}

function handleForDate(val) {
  return new Date(val.getTime());
}

function handleForRegExp(val) {
  return new RegExp(val);
}

function handleForObjectTypes(val) {
  if (isBuffer(val)) {
    return handleForBuffer(val);
  }
  if (isDate(val)) {
    return handleForDate(val);
  }
  if (isRegExp(val)) {
    return handleForRegExp(val);
  }
  throw new Error('Unexpected situation');
}

function cloneArray(arr, objExtend) {
  const cloned = [];
  arr.forEach((item, idx) => {
    if (isObject(item) && item !== null) {
      if (Array.isArray(item)) {
        cloned[idx] = cloneArray(item, objExtend);
      } else if (isBuffer(item) || isDate(item) || isRegExp(item)) {
        cloned[idx] = handleForObjectTypes(item);
      } else {
        cloned[idx] = objExtend({}, item);
      }
    } else {
      cloned[idx] = item;
    }
  });
  return cloned;
}

function deepExtend(target, source) {
  if (!source) {
    return target;
  }

  Object.keys(source).forEach((key) => {
    const oldVal = safeGet(target, key);
    const newVal = safeGet(source, key);
    if (!isObject(newVal) || newVal === null) {
      // overwrite it
      target[key] = newVal;
    } else if (Array.isArray(newVal)) {
      target[key] = cloneArray(newVal, deepExtend);
    } else if (isBuffer(newVal) || isDate(newVal) || isRegExp(newVal)) {
      target[key] = handleForObjectTypes(newVal);
    } else if (!isObject(oldVal) || oldVal === null || Array.isArray(oldVal)) {
      target[key] = deepExtend({}, newVal);
    } else {
      target[key] = deepExtend(oldVal, newVal);
    }
  });

  return target;
}

function makeImmutable(obj) {
  if (isObject(obj)) {
    Object.freeze(obj);
  }

  if (!isObject(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => makeImmutable(item));
    return obj;
  }

  Object.keys(obj).forEach((key) => makeImmutable(obj[key]));

  return obj;
}

exports.isEmpty = isEmpty;
exports.deepExtend = deepExtend;
exports.makeImmutable = makeImmutable;
/* eslint-enable no-param-reassign */
