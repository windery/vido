<template>
    <div class="date-input">
        <div 
            :class="['datetime-display', { editing: isActive }]"
            @keydown="handleInputKeydown" 
            :tabindex="isActive ? 0 : -1" 
            ref="dateInput"
        >
            <span 
                :class="['datetime-part', { active: isActive && activePart === 0 }]"
                @click="setActivePart(0)"
            >{{ getDisplayValue(0, 4) }}</span>
            <span class="separator">-</span>
            <span 
                :class="['datetime-part', { active: isActive && activePart === 1 }]"
                @click="setActivePart(1)"
            >{{ getDisplayValue(1, 2) }}</span>
            <span class="separator">-</span>
            <span 
                :class="['datetime-part', { active: isActive && activePart === 2 }]"
                @click="setActivePart(2)"
            >{{ getDisplayValue(2, 2) }}</span>
            <span class="separator space"> </span>
            <span 
                :class="['datetime-part', { active: isActive && activePart === 3 }]"
                @click="setActivePart(3)"
            >{{ getDisplayValue(3, 2) }}</span>
            <span class="separator">:</span>
            <span 
                :class="['datetime-part', { active: isActive && activePart === 4 }]"
                @click="setActivePart(4)"
            >{{ getDisplayValue(4, 2) }}</span>
            <span class="separator">:</span>
            <span 
                :class="['datetime-part', { active: isActive && activePart === 5 }]"
                @click="setActivePart(5)"
            >{{ getDisplayValue(5, 2) }}</span>
        </div>
        
        <div v-if="!isActive" class="enter-hint">
            <span class="hint-icon">📅</span>
            <span>按 Enter 进入时间输入</span>
        </div>
        
        <div v-if="isActive" class="input-hint">
            h/l 切换部分，j/k 调整数值，数字键直接输入，Backspace 删除，Enter 保存，Esc 取消
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { logger } from '../../../utils/logger';

interface Props {
    isActive: boolean;
    editValues: { schedule: string };
    currentValue?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'activate': [];
    'save': [value: string];
    'deactivate': [];
}>();

const dateInput = ref();
const activePart = ref(0); // 0: year, 1: month, 2: day, 3: hour, 4: minute, 5: second
const inputBuffer = ref(''); // 用于数字输入缓冲
const inputTimeout = ref<any>(null);

// 日期时间各部分的响应式数据
const dateTimeParts = ref({
    year: 2025,
    month: 8,
    day: 1,
    hour: 8,
    minute: 0,
    second: 0
});

// 初始化为明天8点
const initializeTomorrowEight = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    
    dateTimeParts.value = {
        year: tomorrow.getFullYear(),
        month: tomorrow.getMonth() + 1,
        day: tomorrow.getDate(),
        hour: 8,
        minute: 0,
        second: 0
    };
};

// 从当前值解析日期时间
const parseCurrentValue = (value: string) => {
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            dateTimeParts.value = {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: date.getHours(),
                minute: date.getMinutes(),
                second: date.getSeconds()
            };
            return true;
        }
    } catch {
        // 忽略解析错误
    }
    return false;
};

// 初始化显示值
const initializeDisplayValue = () => {
    // 如果有当前值，尝试解析；否则使用明天8点作为默认值
    if (props.currentValue && props.currentValue !== 'No schedule set') {
        if (!parseCurrentValue(props.currentValue)) {
            initializeTomorrowEight();
        }
    } else {
        initializeTomorrowEight();
    }
};

// 监听currentValue变化，更新显示值
watch(() => props.currentValue, () => {
    initializeDisplayValue();
}, { immediate: true });

// Watch for activation to focus input and initialize value
watch(() => props.isActive, (isActive) => {
    if (isActive) {
        // 重置状态
        activePart.value = 0;
        inputBuffer.value = '';
        
        // 确保显示正确的值
        initializeDisplayValue();
        
        nextTick(() => {
            dateInput.value?.focus();
        });
    } else {
        // 退出编辑时清空状态
        inputBuffer.value = '';
        if (inputTimeout.value) {
            clearTimeout(inputTimeout.value);
            inputTimeout.value = null;
        }
    }
});

// 格式化数字显示（补零）
const formatPart = (value: number, length: number): string => {
    return value.toString().padStart(length, '0');
};

// 获取显示值（输入缓冲优先）
const getDisplayValue = (partIndex: number, length: number): string => {
    if (activePart.value === partIndex && inputBuffer.value) {
        // 当前部分正在输入，显示输入缓冲（右对齐，用空格填充）
        return inputBuffer.value.padStart(length, ' ');
    } else {
        // 显示实际值
        const parts = dateTimeParts.value;
        const values = [parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second];
        return formatPart(values[partIndex], length);
    }
};


// 设置活动部分
const setActivePart = (index: number) => {
    // 只在编辑模式下响应点击
    if (!props.isActive) return;
    
    activePart.value = index;
    inputBuffer.value = '';
};

// 获取当前部分的值
const getCurrentPartValue = (): number => {
    const parts = dateTimeParts.value;
    switch (activePart.value) {
        case 0: return parts.year;
        case 1: return parts.month;
        case 2: return parts.day;
        case 3: return parts.hour;
        case 4: return parts.minute;
        case 5: return parts.second;
        default: return 0;
    }
};

// 设置当前部分的值
const setCurrentPartValue = (value: number) => {
    const parts = dateTimeParts.value;
    switch (activePart.value) {
        case 0:
            parts.year = Math.max(1900, Math.min(2100, value));
            break;
        case 1:
            parts.month = Math.max(1, Math.min(12, value));
            break;
        case 2: {
            // 获取当前年月的最大天数
            const maxDay = new Date(parts.year, parts.month, 0).getDate();
            parts.day = Math.max(1, Math.min(maxDay, value));
            break;
        }
        case 3:
            parts.hour = Math.max(0, Math.min(23, value));
            break;
        case 4:
            parts.minute = Math.max(0, Math.min(59, value));
            break;
        case 5:
            parts.second = Math.max(0, Math.min(59, value));
            break;
    }
};

// 调整当前部分的值
const adjustCurrentPart = (delta: number) => {
    const currentValue = getCurrentPartValue();
    let newValue = currentValue + delta;
    
    // 循环处理边界值
    switch (activePart.value) {
        case 0: // 年
            if (newValue < 1900) newValue = 2100;
            if (newValue > 2100) newValue = 1900;
            break;
        case 1: // 月
            if (newValue < 1) newValue = 12;
            if (newValue > 12) newValue = 1;
            break;
        case 2: { // 日
            const maxDay = new Date(dateTimeParts.value.year, dateTimeParts.value.month, 0).getDate();
            if (newValue < 1) newValue = maxDay;
            if (newValue > maxDay) newValue = 1;
            break;
        }
        case 3: // 时
            if (newValue < 0) newValue = 23;
            if (newValue > 23) newValue = 0;
            break;
        case 4: // 分
            if (newValue < 0) newValue = 59;
            if (newValue > 59) newValue = 0;
            break;
        case 5: // 秒
            if (newValue < 0) newValue = 59;
            if (newValue > 59) newValue = 0;
            break;
    }
    
    setCurrentPartValue(newValue);
};

// 处理数字输入
const handleNumberInput = (digit: string) => {
    // 清除之前的超时（如果有的话）
    if (inputTimeout.value) {
        clearTimeout(inputTimeout.value);
        inputTimeout.value = null;
    }
    
    const maxLengths = [4, 2, 2, 2, 2, 2]; // 年月日时分秒的最大长度
    const currentMaxLength = maxLengths[activePart.value];
    
    // 如果已经达到最大长度，替换最后一个字符
    if (inputBuffer.value.length >= currentMaxLength) {
        inputBuffer.value = inputBuffer.value.slice(0, -1) + digit;
    } else {
        inputBuffer.value += digit;
    }
    
    // 根据输入长度立即应用值
    if (inputBuffer.value.length === currentMaxLength) {
        const value = parseInt(inputBuffer.value);
        if (!isNaN(value)) {
            setCurrentPartValue(value);
        }
        inputBuffer.value = '';
    }
};

// 生成最终的日期时间字符串  
const generateDateTimeString = (): string => {
    const parts = dateTimeParts.value;
    return `${formatPart(parts.year, 4)}-${formatPart(parts.month, 2)}-${formatPart(parts.day, 2)} ${formatPart(parts.hour, 2)}:${formatPart(parts.minute, 2)}:${formatPart(parts.second, 2)}`;
};

const handleInputKeydown = (event: KeyboardEvent) => {
    // 只在编辑模式下处理键盘事件
    if (!props.isActive) return;
    
    logger.debug('DateInputTab', `handleInputKeydown: ${event.key}`);
    event.preventDefault();
    event.stopPropagation();
    
    switch (event.key) {
        case 'h':
            // 左切换
            activePart.value = Math.max(0, activePart.value - 1);
            inputBuffer.value = '';
            break;
        case 'l':
            // 右切换
            activePart.value = Math.min(5, activePart.value + 1);
            inputBuffer.value = '';
            break;
        case 'j':
            // 减少
            adjustCurrentPart(-1);
            inputBuffer.value = '';
            break;
        case 'k':
            // 增加
            adjustCurrentPart(1);
            inputBuffer.value = '';
            break;
        case 'Enter':
            logger.debug('DateInputTab', 'Saving date input');
            // 如果有未完成的输入，先应用它
            if (inputBuffer.value) {
                const value = parseInt(inputBuffer.value);
                if (!isNaN(value)) {
                    setCurrentPartValue(value);
                }
                inputBuffer.value = '';
            }
            {
                const dateTimeString = generateDateTimeString();
                emit('save', dateTimeString);
            }
            break;
        case 'Escape':
            logger.debug('DateInputTab', 'Canceling date input');
            // 清空输入缓冲
            inputBuffer.value = '';
            if (inputTimeout.value) {
                clearTimeout(inputTimeout.value);
                inputTimeout.value = null;
            }
            // 触发deactivate事件让父组件处理
            emit('deactivate');
            break;
        case 'Backspace':
            // 删除当前部分的数值或输入缓冲
            if (inputBuffer.value) {
                inputBuffer.value = inputBuffer.value.slice(0, -1);
            } else {
                // 将当前部分重置为0（或合适的默认值）
                const defaultValues = [new Date().getFullYear(), 1, 1, 0, 0, 0];
                setCurrentPartValue(defaultValues[activePart.value]);
            }
            break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            handleNumberInput(event.key);
            break;
        default:
            // 忽略其他按键
            break;
    }
};
</script>

<style scoped>
.date-input {
    padding: 12px 0;
}

.datetime-display {
    padding: 8px 12px;
    background: #2a2a2e;
    border-radius: 4px;
    color: #b8b8b8;
    font-size: 13px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-weight: 400;
    text-align: center;
    border: 1px solid #373737;
    outline: none;
}

.datetime-display.editing {
    cursor: pointer;
}

.datetime-display.editing:focus {
    border-color: #0969da;
    box-shadow: 0 0 0 1px #0969da40;
}

.enter-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 10px;
    color: #6e7681;
    opacity: 0.6;
    margin-top: 6px;
}

.hint-icon {
    font-size: 10px;
    opacity: 0.7;
}

.datetime-part {
    padding: 0;
    border-radius: 2px;
    transition: all 0.15s ease;
    cursor: pointer;
    user-select: none;
    text-align: center;
    background: transparent;
}

.datetime-part:hover {
    background: #373737;
}

.datetime-part.active {
    background: #0969da;
    color: white;
    padding: 0 2px;
}

.separator {
    color: #6e7681;
    margin: 0;
    font-weight: 400;
}

.separator.space {
    margin: 0 4px;
}


.config-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #3e3e42;
    border-radius: 6px;
    background: #2e2e32;
    color: #e6e6e6;
    font-size: 14px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.config-input:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 2px #0969da40;
}

.input-hint {
    color: #6e7681;
    font-size: 10px;
    margin-top: 6px;
    font-style: normal;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    opacity: 0.7;
    text-align: center;
}
</style>