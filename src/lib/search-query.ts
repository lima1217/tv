/**
 * 搜索关键词清洗与标题匹配。
 * 下游源站常对「第 X 季 / 国语 / 标点」等噪声敏感，原样查询会空结果。
 */

const SEASON_NOISE =
  /第[0-9一二三四五六七八九十百零两]+[季部弹]|[Ss]eason\s*\d+|\b[Ss]\d{1,2}\b/g;

const TAG_NOISE =
  /国语|粤语|台语|中字|英字|双语|配音|无删减|完整版|剧场版|特别篇|番外|预告|花絮|4[Kk]|1080[Pp]|720[Pp]|蓝光|高清|超清|HDR/g;

const PUNCT_NOISE = /[·・:：\-—_/\\|.,，。!！?？~～…*#@（）()[\]【】「」『』<>《》"'“”‘’]/g;

/** 折叠空白并去掉首尾空格 */
export function collapseSpaces(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * 去掉季数、清晰度、语种等噪声，保留更利于源站命中的核心词。
 */
export function cleanSearchQuery(query: string): string {
  let q = collapseSpaces(query);
  if (!q) return '';

  q = q.replace(SEASON_NOISE, ' ');
  q = q.replace(TAG_NOISE, ' ');
  q = q.replace(PUNCT_NOISE, ' ');
  // 去掉独立年份 token（保留标题内嵌数字不处理，这里只清空格分隔的 19xx/20xx）
  q = q
    .split(/\s+/)
    .filter((token) => !/^(19|20)\d{2}$/.test(token))
    .join(' ');

  return collapseSpaces(q);
}

/**
 * 生成按优先级排列的查询变体：原词 → 清洗词 → 去空格。
 * 下游应依次尝试，有结果即可停止，避免多余请求。
 */
export function buildSearchQueries(query: string): string[] {
  const trimmed = collapseSpaces(query);
  if (!trimmed) return [];

  const cleaned = cleanSearchQuery(trimmed);
  const variants: string[] = [trimmed];

  if (cleaned && cleaned !== trimmed) {
    variants.push(cleaned);
  }

  const noSpace = cleaned.replace(/\s+/g, '');
  if (noSpace && !variants.includes(noSpace)) {
    variants.push(noSpace);
  }

  return variants;
}

/** 标题比对用的规范化 key：小写、去空白与常见标点 */
export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(PUNCT_NOISE, '')
    .replace(TAG_NOISE, '')
    .replace(SEASON_NOISE, '');
}

/**
 * 宽松标题匹配：全等，或较长标题包含较短核心（最短 2 字，避免单字误伤）。
 */
export function titlesLooselyMatch(a: string, b: string): boolean {
  const na = normalizeTitleKey(a);
  const nb = normalizeTitleKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const [longer, shorter] = na.length >= nb.length ? [na, nb] : [nb, na];
  if (shorter.length < 2) return false;
  return longer.includes(shorter);
}
