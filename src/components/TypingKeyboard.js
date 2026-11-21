import { FINGER_INFO, JAMO_TO_KEY_META, KEYBOARD_ROWS } from '@/data/typingData';
import styles from './TypingPractice.module.css';

function HandSvg({ side, activeFingers }) {
  const isLeft = side === 'left';
  const fingers = isLeft
    ? [
        { id: 'left-pinky', x: 24, y: 54, h: 48, label: '새끼' },
        { id: 'left-ring', x: 48, y: 34, h: 66, label: '약지' },
        { id: 'left-middle', x: 72, y: 24, h: 76, label: '중지' },
        { id: 'left-index', x: 96, y: 36, h: 64, label: '검지' },
      ]
    : [
        { id: 'right-index', x: 34, y: 36, h: 64, label: '검지' },
        { id: 'right-middle', x: 58, y: 24, h: 76, label: '중지' },
        { id: 'right-ring', x: 82, y: 34, h: 66, label: '약지' },
        { id: 'right-pinky', x: 106, y: 54, h: 48, label: '새끼' },
      ];

  const thumbActive = activeFingers.includes('thumb');

  return (
    <div className={styles.handBox}>
      <svg viewBox="0 0 150 150" className={styles.handSvg} aria-hidden="true">
        {/* Palm */}
        <rect
          x={isLeft ? 24 : 30}
          y="88"
          width="94"
          height="50"
          rx="22"
          fill="#e2e8f0"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Thumb */}
        <rect
          x={isLeft ? 114 : 14}
          y="90"
          width="20"
          height="42"
          rx="10"
          transform={isLeft ? 'rotate(24 124 111)' : 'rotate(-24 24 111)'}
          fill={thumbActive ? '#3b82f6' : '#e2e8f0'}
          stroke={thumbActive ? '#1d4ed8' : '#cbd5e1'}
          strokeWidth="2"
        />

        {/* 4 Fingers */}
        {fingers.map((finger) => {
          const isActive = activeFingers.includes(finger.id);
          const color = FINGER_INFO[finger.id]?.color ?? '#2563eb';

          return (
            <g key={finger.id}>
              <rect
                x={finger.x}
                y={finger.y}
                width="18"
                height={finger.h}
                rx="9"
                fill={isActive ? color : '#f1f5f9'}
                stroke={isActive ? '#0f172a' : '#cbd5e1'}
                strokeWidth={isActive ? '2.5' : '2'}
              />
              {isActive && (
                <circle cx={finger.x + 9} cy={finger.y + 10} r="4.5" fill="#ffffff" />
              )}
            </g>
          );
        })}
      </svg>
      <span className={styles.handCaption}>{isLeft ? '왼손' : '오른손'}</span>
    </div>
  );
}

export default function TypingKeyboard({
  nextJamo = '',
  allowedKeys = null,
  pressedFeedback = null,
  compact = false,
}) {
  const nextMeta = nextJamo ? JAMO_TO_KEY_META[nextJamo] : null;
  const activeFingerIds = [];

  if (nextMeta) {
    activeFingerIds.push(nextMeta.finger);
    if (nextMeta.needsShift && nextMeta.shiftSide) {
      activeFingerIds.push(nextMeta.shiftSide === 'left' ? 'left-pinky' : 'right-pinky');
    }
  }

  const allowedSet = allowedKeys ? new Set(allowedKeys) : null;
  const fingerInfo = nextMeta ? FINGER_INFO[nextMeta.finger] : null;

  return (
    <div className={`${styles.keyboardPanel}${compact ? ` ${styles.keyboardCompact}` : ''}`}>
      <div className={styles.keyboardGuideBar}>
        {nextMeta ? (
          <>
            <span
              className={styles.fingerPill}
              style={{ backgroundColor: fingerInfo?.color ?? '#2563eb' }}
            >
              {fingerInfo?.label}
            </span>
            <span className={styles.guideHint}>
              {nextMeta.needsShift ? (
                <>
                  <strong>{nextMeta.shiftSide === 'left' ? '왼쪽 Shift' : '오른쪽 Shift'}</strong>
                  {' + '}
                  <strong>{nextMeta.jamo}</strong> ({nextMeta.eng})
                </>
              ) : (
                <>
                  다음 글쇠 <strong>{nextMeta.jamo}</strong> ({nextMeta.eng})
                </>
              )}
            </span>
          </>
        ) : (
          <span className={styles.guideHint}>두벌식 표준 한글 키보드 가이드</span>
        )}
      </div>

      <div className={styles.keyboardRows} aria-label="두벌식 한글 키보드">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className={`${styles.keyboardRow} ${styles[`row${rowIndex}`]}`}>
            {row.map((key) => {
              const isShiftTarget =
                Boolean(nextMeta?.needsShift) &&
                ((key.modifier === 'left' && nextMeta.shiftSide === 'left') ||
                  (key.modifier === 'right' && nextMeta.shiftSide === 'right'));

              const isTarget = !key.modifier && nextMeta?.code === key.code;
              const isFeedbackKey =
                pressedFeedback && !key.modifier && pressedFeedback.code === key.code;

              const isAllowed =
                key.modifier ||
                !allowedSet ||
                allowedSet.has(key.base) ||
                (key.shift && allowedSet.has(key.shift));

              const fingerColor = FINGER_INFO[key.finger]?.color ?? '#64748b';

              const keyClassNames = [
                styles.keycap,
                key.wide ? styles.keycapWide : '',
                key.home ? styles.keycapHome : '',
                !isAllowed ? styles.keycapMuted : '',
                isTarget || isShiftTarget ? styles.keycapActive : '',
                isFeedbackKey && pressedFeedback.ok ? styles.keycapCorrect : '',
                isFeedbackKey && !pressedFeedback.ok ? styles.keycapWrong : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={key.code}
                  className={keyClassNames}
                  style={{ '--finger-color': fingerColor }}
                >
                  {key.shift && (
                    <span
                      className={`${styles.keyShiftChar}${
                        isTarget && nextMeta?.needsShift ? ` ${styles.keyShiftCharActive}` : ''
                      }`}
                    >
                      {key.shift}
                    </span>
                  )}
                  <span className={styles.keyMainChar}>{key.base}</span>
                  <span className={styles.keyEngChar}>{key.eng}</span>
                  {key.home && <span className={styles.homeBump} aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!compact && (
        <div className={styles.handsRow} aria-label="손가락 위치 안내">
          <HandSvg side="left" activeFingers={activeFingerIds} />
          <div className={styles.fingerLegend}>
            <div className={styles.legendRow}>
              <span style={{ '--dot': '#f43f5e' }}>새끼</span>
              <span style={{ '--dot': '#f59e0b' }}>약지</span>
              <span style={{ '--dot': '#10b981' }}>중지</span>
              <span style={{ '--dot': '#0ea5e9' }}>왼검지</span>
              <span style={{ '--dot': '#6366f1' }}>오검지</span>
            </div>
            <p className={styles.legendTip}>
              양손 검지를 <strong>ㄹ(F)</strong>과 <strong>ㅓ(J)</strong> 돌기 위에 올려두세요.
            </p>
          </div>
          <HandSvg side="right" activeFingers={activeFingerIds} />
        </div>
      )}
    </div>
  );
}
