// src/plugins/piniaLogger.ts
import { PiniaPluginContext } from 'pinia';

function isObject(obj: any) {
  return obj !== null && typeof obj === 'object';
}

function isDate(obj: any) {
  return obj instanceof Date;
}

function deepClone(obj: any): any {
  if (isDate(obj)) {
    return new Date(obj.getTime());
  } else if (isObject(obj)) {
    return Array.isArray(obj)
      ? obj.map((item) => deepClone(item))
      : Object.keys(obj).reduce((acc, key) => {
          acc[key] = deepClone(obj[key]);
          return acc;
        }, {} as any);
  }
  return obj;
}

function deepDiff(obj1: any, obj2: any, path: string[] = []): string[] {
  const changes: string[] = [];

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  allKeys.forEach((key) => {
    const currentPath = path.concat(key);
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (isDate(val1) && isDate(val2)) {
      if (val1.getTime() !== val2.getTime()) {
        changes.push(currentPath.join('.'));
      }
    } else if (
      isObject(val1) &&
      isObject(val2) &&
      !isDate(val1) &&
      !isDate(val2)
    ) {
      changes.push(...deepDiff(val1, val2, currentPath));
    } else if (val1 !== val2) {
      changes.push(currentPath.join('.'));
    }
  });

  return changes;
}

function piniaLogger({ store }: PiniaPluginContext) {
  let previousState = deepClone(store.$state);

  store.$subscribe((mutation, state) => {
    const changes = deepDiff(previousState, state);

    if (changes.length > 0) {
      //   console.log(`\x1b[33m[Pinia Logger] Store: ${store.$id}\x1b[0m`);
      changes.forEach((field) => {
        const prevValue = field
          .split('.')
          .reduce((o, i) => (o ? o[i] : undefined), previousState);
        const newValue = field
          .split('.')
          .reduce((o, i) => (o ? o[i] : undefined), state);

        // 过滤掉 undefined 到 undefined 的变化
        if (!(prevValue === undefined && newValue === undefined)) {
          console.log(
            `\x1b[32m[Pinia Logger] ${field}\x1b[0m changed from \x1b[31m${JSON.stringify(prevValue)}\x1b[0m to \x1b[32m${JSON.stringify(newValue)}\x1b[0m`
          );
        }
      });
    }

    previousState = deepClone(state);
  });
}

export default piniaLogger;
