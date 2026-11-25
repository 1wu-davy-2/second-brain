/**
 * 计算 textarea 中某个字符位置的屏幕坐标，用于把补全面板贴到光标下方。
 * 用隐藏镜像节点复制排版参数，避免手工累加换行高度。
 */
const COPIED_STYLES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "wordSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
] as const;

export interface CaretRect {
  top: number;
  left: number;
  lineHeight: number;
}

export function getCaretRect(
  textarea: HTMLTextAreaElement,
  position: number,
): CaretRect | null {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");

  for (const prop of COPIED_STYLES) {
    mirror.style[prop as never] = computed[prop as never];
  }
  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.clientWidth}px`;

  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  document.body.removeChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();
  const lineHeight = Number.parseFloat(computed.lineHeight) || 24;
  const offsetTop = markerRect.top - mirrorRect.top - textarea.scrollTop;
  const caretTop = textareaRect.top + offsetTop;
  const caretLeft = Math.min(
    textareaRect.left + (markerRect.left - mirrorRect.left),
    textareaRect.right - 268,
  );

  // 预估面板高度，靠近视口底部时向上翻转，避免被裁掉
  const PANEL_HEIGHT = 236;
  const below = caretTop + lineHeight + 4;
  const top =
    below + PANEL_HEIGHT > window.innerHeight
      ? Math.max(8, caretTop - PANEL_HEIGHT - 4)
      : below;

  return { top, left: Math.max(8, caretLeft), lineHeight };
}
