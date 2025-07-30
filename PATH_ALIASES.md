# 🎯 路径别名使用指南

## 📁 可用的路径别名

```typescript
// 根目录
import something from '@/file'           // src/file

// 渲染进程
import Component from '@components/Component.vue'  // src/renderer/components/Component.vue
import useHook from '@composables/useHook'         // src/renderer/composables/useHook.ts
import { helper } from '@utils/helper'             // src/renderer/utils/helper.ts
import { Task } from '@renderer/domain/task'      // src/renderer/domain/task.ts

// 主进程
import { api } from '@main/api'                    // src/main/api.ts

// 共享代码
import { type } from '@shared/types'               // src/shared/types.ts
import { domain } from '@domain/core'              // src/shared/domain/core (如果存在)
```

## 🔄 迁移示例

### 之前 (相对路径)
```typescript
import { Task } from '../../../domain/task'
import Component from '../../components/Component.vue'
import { logger } from '../utils/logger'
```

### 现在 (路径别名)
```typescript
import { Task } from '@renderer/domain/task'
import Component from '@components/Component.vue'
import { logger } from '@utils/logger'
```

## ✨ 优势

- ✅ **更简洁** - 不再需要计算相对路径深度
- ✅ **更清晰** - 一眼就能看出文件来源
- ✅ **更稳定** - 文件移动时不需要更新导入路径
- ✅ **更好的IDE支持** - 自动补全和跳转更准确

## 🛠️ 配置文件

配置已添加到：
- `vite.config.ts` - Vite构建时路径解析
- `tsconfig.json` - TypeScript类型检查时路径解析

现在您可以在整个项目中使用这些路径别名！🎉