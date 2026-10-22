window.__ModuleLoader__.load({
  id: 'dsh-daily-tasks',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const STORAGE_KEY = 'dsh.daily-tasks.v1';
    const LOCALE_NS = 'daily-tasks';

    const DICTS = {
      zh: {
        nav: '每日任务',
        pageTitle: '每日任务',
        subtitle: '按日期记录今天要完成的事，做完一件就勾掉一件。',
        todayBadge: '今天',
        todayAction: '回到今天',
        previousMonth: '上个月',
        nextMonth: '下个月',
        calendarLabel: '月历',
        calendarHint: '有任务的日期会显示圆点',
        addPlaceholder: '添加一项今天想完成的事…',
        addTask: '添加',
        taskInputLabel: '新任务内容',
        emptyTitle: '今天还没有任务',
        emptyBody: '在下面输入想完成的事，按 Enter 或点「添加」。',
        deleteTask: '删除任务',
        progressLabel: '完成进度',
        progressSummary: '已完成 {done} / {total} 项，还剩 {remaining} 项',
        noTasksSummary: '从一件小事开始，今天也会很有进展。',
        allDone: '今天全部完成，做得漂亮！',
        storageError: '无法保存到浏览器存储，本次修改可能不会保留。',
        storageNote: '任务只保存在当前浏览器中。',
      },
      en: {
        nav: 'Daily tasks',
        pageTitle: 'Daily tasks',
        subtitle: 'A checklist for each day. Tick things off as you go.',
        todayBadge: 'Today',
        todayAction: 'Go to today',
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        calendarLabel: 'Calendar',
        calendarHint: 'Dots mark days with tasks',
        addPlaceholder: 'Add something to finish today…',
        addTask: 'Add',
        taskInputLabel: 'New task',
        emptyTitle: 'No tasks yet',
        emptyBody: 'Add something you want to finish — press Enter or choose Add.',
        deleteTask: 'Delete task',
        progressLabel: 'Completion progress',
        progressSummary: '{done} of {total} completed · {remaining} left',
        noTasksSummary: 'Start with one small thing; today can still add up.',
        allDone: 'All done for today — nice work!',
        storageError: "Couldn't save to browser storage; changes may be lost.",
        storageNote: 'Tasks are saved in this browser only.',
      },
    };

    function formatText(t, key, vars) {
      let text = t(key);
      if (!vars) return text;
      for (const name of Object.keys(vars)) {
        text = text.split('{' + name + '}').join(String(vars[name]));
      }
      return text;
    }

    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    function dateKey(date) {
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function parseDateKey(key) {
      const parts = String(key).split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    }

    function startOfMonth(date) {
      return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
    }

    function shiftMonth(date, delta) {
      return new Date(date.getFullYear(), date.getMonth() + delta, 1, 12, 0, 0, 0);
    }

    function monthCells(month) {
      const first = startOfMonth(month);
      const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay(), 12, 0, 0, 0);
      const cells = [];
      for (let index = 0; index < 42; index += 1) {
        cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12, 0, 0, 0));
      }
      return cells;
    }

    function makeId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    }

    function normalizeData(input) {
      const empty = { version: 1, days: {} };
      if (!input || typeof input !== 'object' || !input.days || typeof input.days !== 'object') {
        return empty;
      }
      const days = {};
      for (const key of Object.keys(input.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(input.days[key])) continue;
        const tasks = [];
        for (const task of input.days[key]) {
          if (!task || typeof task !== 'object' || typeof task.text !== 'string') continue;
          const text = task.text.trim();
          if (!text) continue;
          tasks.push({
            id: typeof task.id === 'string' && task.id ? task.id : makeId(),
            text,
            done: task.done === true,
            createdAt: typeof task.createdAt === 'number' ? task.createdAt : Date.now(),
          });
        }
        if (tasks.length) days[key] = tasks;
      }
      return { version: 1, days };
    }

    function loadData() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: 1, days: {} };
        return normalizeData(JSON.parse(raw));
      } catch (_error) {
        return { version: 1, days: {} };
      }
    }

    function localeTag(active) {
      if (!active) return undefined;
      if (active === 'zh') return 'zh-CN';
      if (active === 'en') return 'en-US';
      return active;
    }

    function formatIntl(active, date, options) {
      const tag = localeTag(active);
      try {
        return new Intl.DateTimeFormat(tag, options).format(date);
      } catch (_error) {
        return new Intl.DateTimeFormat('en-US', options).format(date);
      }
    }

    function useLocaleTick(locale) {
      const [, setRevision] = React.useState(0);
      React.useEffect(
        () => locale.subscribe(() => setRevision((value) => value + 1)),
        [locale],
      );
    }

    function useTodayKey() {
      const [today, setToday] = React.useState(() => dateKey(new Date()));
      React.useEffect(() => {
        let timer = 0;
        let disposed = false;
        const sync = () => {
          if (!disposed) setToday(dateKey(new Date()));
        };
        const schedule = () => {
          if (disposed) return;
          const now = new Date();
          const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 2, 0);
          timer = window.setTimeout(() => {
            sync();
            schedule();
          }, Math.max(1000, next.getTime() - now.getTime()));
        };
        const onVisibility = () => {
          if (document.visibilityState === 'visible') sync();
        };
        schedule();
        window.addEventListener('focus', sync);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          disposed = true;
          window.clearTimeout(timer);
          window.removeEventListener('focus', sync);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, []);
      return today;
    }

    function CalendarCheckIcon(props) {
      const size = props && props.size ? props.size : 24;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('rect', { x: 3.5, y: 5, width: 17, height: 15.5, rx: 3 }),
        h('path', { d: 'M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17' }),
        h('path', { d: 'm8.5 14.5 2.2 2.2 4.8-4.8' }),
      );
    }

    function ChevronIcon(props) {
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { d: props.direction === 'left' ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7' }),
      );
    }

    function TrashIcon() {
      return h(
        'svg',
        {
          width: 16,
          height: 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('path', { d: 'M4 7h16M9 7V4.8h6V7M7 7l.8 12.2h8.4L17 7' }),
        h('path', { d: 'M10 11v5M14 11v5' }),
      );
    }

    function CheckCircleIcon(props) {
      const size = props && props.size ? props.size : 18;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('circle', { cx: 12, cy: 12, r: 8.5 }),
        h('path', { d: 'm8.4 12.1 2.3 2.3 4.9-5' }),
      );
    }

    function SidebarIcon(props) {
      const size = props && props.size ? props.size : 18;
      const active = Boolean(props && props.active);
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: active ? 2.1 : 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          style: { display: 'block' },
        },
        h('rect', { x: 3.5, y: 4.5, width: 17, height: 16, rx: 3 }),
        h('path', { d: 'M7 3v3M17 3v3M3.5 8.5h17' }),
        h('path', { d: 'm8 14 2 2 5.5-5.5' }),
      );
    }

    const CSS = `
.dt-page {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}
.dt-page *, .dt-page *::before, .dt-page *::after { box-sizing: border-box; }
.dt-shell {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding: 34px clamp(18px, 4vw, 46px) 48px;
}
.dt-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}
.dt-mark {
  width: 48px;
  height: 48px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent);
}
.dt-heading-copy { min-width: 0; }
.dt-title {
  margin: 0;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 650;
  letter-spacing: -0.015em;
}
.dt-subtitle {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dt-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 9%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12.5px;
  line-height: 1.5;
}
.dt-layout {
  display: grid;
  grid-template-columns: minmax(280px, 338px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.dt-card {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  padding: 18px;
}
.dt-calendar {
  position: sticky;
  top: 24px;
  padding-bottom: 14px;
}
.dt-month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
}
.dt-month-title {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.4;
}
.dt-month-actions { display: flex; align-items: center; gap: 4px; }
.dt-icon-btn {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.dt-icon-btn:hover {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
}
.dt-icon-btn:focus-visible, .dt-link:focus-visible, .dt-add:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dt-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin: 12px 0 5px;
}
.dt-weekday {
  padding: 3px 0;
  text-align: center;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.03em;
  color: var(--dsw-alias-label-secondary);
}
.dt-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dt-day {
  position: relative;
  height: 39px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dt-day:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.dt-day:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -1px;
}
.dt-day.is-outside {
  color: color-mix(in srgb, var(--dsw-alias-label-primary) 34%, transparent);
}
.dt-day.is-today { box-shadow: inset 0 0 0 1.5px var(--dsw-alias-brand-primary); }
.dt-day.is-selected {
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  box-shadow: none;
}
.dt-day.is-selected:hover { background: var(--dsw-alias-brand-primary); }
.dt-dot {
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: var(--dsw-alias-brand-primary);
  opacity: 0.72;
}
.dt-day.is-complete .dt-dot {
  background: var(--dsw-alias-state-success-primary);
  opacity: 1;
}
.dt-day.is-selected .dt-dot { background: var(--dsw-alias-bg-base); opacity: 1; }
.dt-calendar-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.dt-hint {
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}
.dt-link {
  flex: none;
  padding: 3px 5px;
  margin: -3px -5px -3px 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.dt-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.dt-tasks {
  min-height: 470px;
  display: flex;
  flex-direction: column;
}
.dt-task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.dt-eyebrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 18px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
}
.dt-pill {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-size: 10.5px;
  font-weight: 650;
}
.dt-date-title {
  margin: 7px 0 0;
  font-size: 21px;
  line-height: 1.25;
  font-weight: 650;
  letter-spacing: -0.015em;
}
.dt-count {
  flex: none;
  padding-top: 3px;
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dt-progress {
  height: 6px;
  margin: 16px 0 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
}
.dt-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--dsw-alias-brand-primary);
  transition: width 220ms ease;
}
.dt-progress-meta {
  min-height: 18px;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dt-celebrate {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 0;
  padding: 9px 11px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
  color: var(--dsw-alias-state-success-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.dt-form {
  display: flex;
  gap: 8px;
  margin: 18px 0 10px;
}
.dt-input {
  flex: 1;
  min-width: 0;
  height: 42px;
  padding: 0 13px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 11px;
  outline: none;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13.5px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.dt-input::placeholder {
  color: color-mix(in srgb, var(--dsw-alias-label-secondary) 82%, transparent);
}
.dt-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
}
.dt-add {
  flex: none;
  height: 42px;
  padding: 0 17px;
  border: 0;
  border-radius: 11px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  font: inherit;
  font-size: 12.5px;
  font-weight: 650;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}
.dt-add:hover:not(:disabled) { opacity: 0.9; }
.dt-add:active:not(:disabled) { transform: translateY(1px); }
.dt-add:disabled { opacity: 0.42; cursor: default; }
.dt-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  padding: 0;
}
.dt-task {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 7px 8px 9px;
  border-radius: 11px;
  transition: background 120ms ease;
}
.dt-task:hover { background: var(--dsw-alias-bg-layer-2); }
.dt-task:focus-within { background: var(--dsw-alias-bg-layer-2); }
.dt-task-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 3px 0;
  cursor: pointer;
}
.dt-check {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  flex: none;
  display: grid;
  place-items: center;
  margin: 0;
  border: 1.5px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dt-check:hover { border-color: var(--dsw-alias-brand-primary); }
.dt-check:checked {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
}
.dt-check:checked::after {
  content: '';
  width: 5px;
  height: 9px;
  margin-top: -2px;
  border: solid var(--dsw-alias-bg-base);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.dt-check:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dt-text {
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  transition: color 120ms ease;
}
.dt-task.is-done .dt-text {
  color: var(--dsw-alias-label-secondary);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);
}
.dt-delete {
  width: 29px;
  height: 29px;
  flex: none;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity 120ms ease, background 120ms ease, color 120ms ease;
}
.dt-task:hover .dt-delete, .dt-task:focus-within .dt-delete, .dt-delete:focus-visible {
  opacity: 1;
}
.dt-delete:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.dt-delete:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dt-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 36px 18px 28px;
  text-align: center;
}
.dt-empty-art {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  margin-bottom: 3px;
  border-radius: 17px;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
}
.dt-empty-title {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.4;
}
.dt-empty-body {
  max-width: 290px;
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--dsw-alias-label-secondary);
}
.dt-note {
  margin: 16px 0 0;
  text-align: center;
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.85;
}
@media (max-width: 760px) {
  .dt-shell { padding-top: 24px; }
  .dt-layout { grid-template-columns: minmax(0, 1fr); }
  .dt-calendar { position: static; }
  .dt-tasks { min-height: 390px; }
}
@media (hover: none) {
  .dt-delete { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .dt-progress-fill, .dt-add, .dt-day, .dt-check, .dt-text, .dt-delete { transition: none; }
}
`;

    function DailyTasksPage() {
      const localeService = ctxLocale;
      useLocaleTick(localeService);
      const activeLocale = localeService.getLocale().active;
      const t = localeBind;

      const today = useTodayKey();
      const [data, setData] = React.useState(loadData);
      const [storageFailed, setStorageFailed] = React.useState(false);
      const [selectedKey, setSelectedKey] = React.useState(today);
      const [followToday, setFollowToday] = React.useState(true);
      const [month, setMonth] = React.useState(() => startOfMonth(parseDateKey(today)));
      const [draft, setDraft] = React.useState('');

      React.useEffect(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          setStorageFailed(false);
        } catch (_error) {
          setStorageFailed(true);
        }
      }, [data]);

      React.useEffect(() => {
        if (!followToday) return;
        setSelectedKey(today);
        setMonth(startOfMonth(parseDateKey(today)));
      }, [today, followToday]);

      React.useEffect(() => {
        const onStorage = (event) => {
          if (event.key === STORAGE_KEY) setData(loadData());
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
      }, []);

      const selectedDate = parseDateKey(selectedKey);
      const tasks = data.days[selectedKey] || [];
      const total = tasks.length;
      const done = tasks.filter((task) => task.done).length;
      const remaining = total - done;
      const percent = total ? Math.round((done / total) * 100) : 0;
      const cells = monthCells(month);
      const monthTitle = formatIntl(activeLocale, month, { year: 'numeric', month: 'long' });
      const dateTitle = formatIntl(activeLocale, selectedDate, { month: 'long', day: 'numeric' });
      const yearWeekday = selectedDate.getFullYear() + ' · ' + formatIntl(activeLocale, selectedDate, { weekday: 'long' });
      const weekdayLabels = [];
      for (let index = 0; index < 7; index += 1) {
        const day = new Date(2024, 0, 7 + index, 12, 0, 0, 0);
        weekdayLabels.push(formatIntl(activeLocale, day, { weekday: 'short' }));
      }

      const chooseDate = (date) => {
        const key = dateKey(date);
        setSelectedKey(key);
        setFollowToday(key === today);
        setMonth(startOfMonth(date));
        setDraft('');
      };

      const goToday = () => {
        setSelectedKey(today);
        setFollowToday(true);
        setMonth(startOfMonth(parseDateKey(today)));
        setDraft('');
      };

      const updateDay = (updater) => {
        setData((previous) => {
          const nextTasks = updater(previous.days[selectedKey] || []);
          const nextDays = { ...previous.days };
          if (nextTasks.length) nextDays[selectedKey] = nextTasks;
          else delete nextDays[selectedKey];
          return { ...previous, version: 1, days: nextDays };
        });
      };

      const addTask = (event) => {
        event.preventDefault();
        const text = draft.trim();
        if (!text) return;
        updateDay((existing) => [
          ...existing,
          { id: makeId(), text, done: false, createdAt: Date.now() },
        ]);
        setDraft('');
      };

      const toggleTask = (id) => {
        updateDay((existing) =>
          existing.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
        );
      };

      const deleteTask = (id) => {
        updateDay((existing) => existing.filter((task) => task.id !== id));
      };

      const summary = total
        ? formatText(t, 'progressSummary', { done, total, remaining })
        : t('noTasksSummary');

      const calendar = h(
        'section',
        { className: 'dt-card dt-calendar', 'aria-label': t('calendarLabel') },
        h(
          'div',
          { className: 'dt-month-bar' },
          h('h2', { className: 'dt-month-title' }, monthTitle),
          h(
            'div',
            { className: 'dt-month-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dt-icon-btn',
                'aria-label': t('previousMonth'),
                title: t('previousMonth'),
                onClick: () => setMonth((current) => shiftMonth(current, -1)),
              },
              h(ChevronIcon, { direction: 'left' }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dt-icon-btn',
                'aria-label': t('nextMonth'),
                title: t('nextMonth'),
                onClick: () => setMonth((current) => shiftMonth(current, 1)),
              },
              h(ChevronIcon, { direction: 'right' }),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dt-weekdays', 'aria-hidden': 'true' },
          weekdayLabels.map((label, index) => h('div', { key: index, className: 'dt-weekday' }, label)),
        ),
        h(
          'div',
          { className: 'dt-days' },
          cells.map((date) => {
            const key = dateKey(date);
            const dayTasks = data.days[key] || [];
            const dayDone = dayTasks.filter((task) => task.done).length;
            const outside = date.getMonth() !== month.getMonth();
            const classes = ['dt-day'];
            if (outside) classes.push('is-outside');
            if (key === today) classes.push('is-today');
            if (key === selectedKey) classes.push('is-selected');
            if (dayTasks.length && dayDone === dayTasks.length) classes.push('is-complete');
            return h(
              'button',
              {
                key,
                type: 'button',
                className: classes.join(' '),
                'aria-label': formatIntl(activeLocale, date, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                }),
                'aria-pressed': key === selectedKey,
                'aria-current': key === today ? 'date' : undefined,
                onClick: () => chooseDate(date),
              },
              h('span', null, date.getDate()),
              dayTasks.length
                ? h('span', { className: 'dt-dot', 'aria-hidden': 'true' })
                : null,
            );
          }),
        ),
        h(
          'div',
          { className: 'dt-calendar-foot' },
          h('span', { className: 'dt-hint' }, t('calendarHint')),
          h(
            'button',
            { type: 'button', className: 'dt-link', onClick: goToday },
            t('todayAction'),
          ),
        ),
      );

      const addForm = h(
        'form',
        { className: 'dt-form', onSubmit: addTask },
        h('input', {
          className: 'dt-input',
          type: 'text',
          value: draft,
          maxLength: 300,
          placeholder: t('addPlaceholder'),
          'aria-label': t('taskInputLabel'),
          onChange: (event) => setDraft(event.target.value),
        }),
        h(
          'button',
          {
            className: 'dt-add',
            type: 'submit',
            disabled: !draft.trim(),
          },
          t('addTask'),
        ),
      );

      const taskList = total
        ? h(
            'ul',
            { className: 'dt-list' },
            tasks.map((task) =>
              h(
                'li',
                {
                  key: task.id,
                  className: 'dt-task' + (task.done ? ' is-done' : ''),
                },
                h(
                  'label',
                  { className: 'dt-task-main' },
                  h('input', {
                    className: 'dt-check',
                    type: 'checkbox',
                    checked: task.done,
                    onChange: () => toggleTask(task.id),
                  }),
                  h('span', { className: 'dt-text' }, task.text),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dt-delete',
                    title: t('deleteTask'),
                    'aria-label': t('deleteTask') + ': ' + task.text,
                    onClick: () => deleteTask(task.id),
                  },
                  h(TrashIcon),
                ),
              ),
            ),
          )
        : h(
            'div',
            { className: 'dt-empty' },
            h('div', { className: 'dt-empty-art' }, h(CalendarCheckIcon, { size: 28 })),
            h('div', { className: 'dt-empty-title' }, t('emptyTitle')),
            h('p', { className: 'dt-empty-body' }, t('emptyBody')),
          );

      const taskPanel = h(
        'section',
        { className: 'dt-card dt-tasks', 'aria-labelledby': 'dt-date-heading' },
        h(
          'div',
          { className: 'dt-task-head' },
          h(
            'div',
            null,
            h(
              'div',
              { className: 'dt-eyebrow' },
              selectedKey === today
                ? h('span', { className: 'dt-pill' }, t('todayBadge'))
                : null,
              h('span', null, yearWeekday),
            ),
            h('h2', { id: 'dt-date-heading', className: 'dt-date-title' }, dateTitle),
          ),
          h(
            'div',
            {
              className: 'dt-count',
              title: summary,
              'aria-label': total ? formatText(t, 'progressSummary', { done, total, remaining }) : summary,
            },
            total ? done + ' / ' + total : '—',
          ),
        ),
        h(
          'div',
          {
            className: 'dt-progress',
            role: 'progressbar',
            'aria-label': t('progressLabel'),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': percent,
          },
          h('div', { className: 'dt-progress-fill', style: { width: percent + '%' } }),
        ),
        h('div', { className: 'dt-progress-meta' }, summary),
        total && remaining === 0
          ? h(
              'div',
              { className: 'dt-celebrate' },
              h(CheckCircleIcon, { size: 17 }),
              h('span', null, t('allDone')),
            )
          : null,
        addForm,
        taskList,
      );

      return h(
        'div',
        { className: 'dt-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'dt-shell' },
          h(
            'header',
            { className: 'dt-heading' },
            h('div', { className: 'dt-mark' }, h(CalendarCheckIcon, { size: 27 })),
            h(
              'div',
              { className: 'dt-heading-copy' },
              h('h1', { className: 'dt-title' }, t('pageTitle')),
              h('p', { className: 'dt-subtitle' }, t('subtitle')),
            ),
          ),
          storageFailed
            ? h('div', { className: 'dt-error', role: 'alert' }, t('storageError'))
            : null,
          h('div', { className: 'dt-layout' }, calendar, taskPanel),
          h('p', { className: 'dt-note' }, t('storageNote')),
        ),
      );
    }

    let ctxLocale;
    let localeBind;

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctxLocale = ctx.locale;
        ctx.effect(
          () => ctx.locale.register(LOCALE_NS, DICTS),
          'daily-tasks: locale dictionaries',
        );
        localeBind = ctx.locale.bind(LOCALE_NS);
        const t = localeBind;

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            { name: 'main', key: 'daily-tasks' },
            DailyTasksPage,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: 'daily-tasks',
              order: 20,
              label: () => t('nav'),
            },
            SidebarIcon,
          ),
        );
      },
    };
  },
});
