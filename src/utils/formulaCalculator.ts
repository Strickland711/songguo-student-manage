// 公式计算工具
// 用于解析和计算基于自定义字段的公式表达式

/**
 * 解析公式表达式并计算结果
 * @param formula - 公式字符串，例如 "field_1 + field_2 * 2"
 * @param fieldValues - 字段值映射，key为字段ID，value为字段值
 * @returns 计算结果，如果计算失败返回null
 */
export function evaluateFormula(
  formula: string,
  fieldValues: Record<string, string | number>
): number | null {
  try {
    // 替换字段ID为实际值
    let expression = formula;
    
    // 将所有字段ID替换为对应的数值
    for (const [fieldId, value] of Object.entries(fieldValues)) {
      // 确保值是数字
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(numValue)) {
        console.warn(`字段 ${fieldId} 的值不是有效数字: ${value}`);
        return null;
      }
      
      // 使用正则表达式替换所有出现的字段ID
      const regex = new RegExp(`\\b${fieldId}\\b`, 'g');
      expression = expression.replace(regex, numValue.toString());
    }
    
    // 安全检查：只允许数字、运算符和括号
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      console.error('公式包含非法字符');
      return null;
    }
    
    // 使用Function构造器安全地计算表达式
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (error) {
    console.error('公式计算错误:', error);
    return null;
  }
}

/**
 * 验证公式表达式是否有效
 * @param formula - 公式字符串
 * @param availableFieldIds - 可用的字段ID列表
 * @returns 验证结果对象
 */
export function validateFormula(
  formula: string,
  availableFieldIds: string[]
): { valid: boolean; error?: string } {
  if (!formula || formula.trim() === '') {
    return { valid: false, error: '公式不能为空' };
  }
  
  // 创建测试用的字段值（都设为1）
  const testValues: Record<string, number> = {};
  availableFieldIds.forEach(id => {
    testValues[id] = 1;
  });
  
  // 尝试计算
  const result = evaluateFormula(formula, testValues);
  
  if (result === null) {
    return { valid: false, error: '公式无效或包含错误' };
  }
  
  return { valid: true };
}

/**
 * 从公式中提取依赖的字段ID
 * @param formula - 公式字符串
 * @param availableFieldIds - 可用的字段ID列表
 * @returns 依赖的字段ID数组
 */
export function extractDependencies(
  formula: string,
  availableFieldIds: string[]
): string[] {
  const dependencies: string[] = [];
  
  availableFieldIds.forEach(fieldId => {
    // 使用正则表达式检查字段ID是否在公式中
    const regex = new RegExp(`\\b${fieldId}\\b`);
    if (regex.test(formula)) {
      dependencies.push(fieldId);
    }
  });
  
  return dependencies;
}
