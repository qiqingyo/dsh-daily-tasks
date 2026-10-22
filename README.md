# Daily Tasks for DeepSeek Harness

一个按日期组织的每日任务清单插件，运行在 DeepSeek Harness Web UI 中。左侧栏会新增日历图标，打开后可以按天添加、完成和删除任务；日历与当天日期自动同步，并支持切换到任意日期。

A calendar-synced daily checklist plugin for the DeepSeek Harness Web UI.

Repository: <https://github.com/qiqingyo/dsh-daily-tasks>

## Features

- **按天记录**：每天拥有独立的任务清单，互不混淆。
- **日历同步**：打开页面时定位到今天；跨过午夜后，如果仍停留在今天，会自动切换到新的一天。
- **自由增删**：输入任务后按 Enter 或点「添加」；悬停任务行可删除，键盘也能操作。
- **完成勾选**：勾选后任务显示删除线，顶部进度条和完成数量实时更新。
- **月历导航**：切换月份、点选任意日期；有任务的日期会显示圆点，全部完成的日期显示绿色圆点。
- **中英双语**：跟随 Harness 当前界面语言即时切换。
- **本地优先**：数据保存在浏览器 `localStorage`，不上传服务器，不需要额外依赖或构建步骤。

## Install

This package is a DSH bundle with a `dsh.bundle.patch` manifest. Install the package directory through the DSH Plugin Manager (`install_bundle` with the absolute package directory as the target).

```text
dsh-daily-tasks/
```

After installation, open the calendar icon in the left sidebar. If the page is already open, refresh it once so the new Client bundle is loaded.

### Manual bundle row

`cordis.patch.yml` inserts:

```yaml
- insert:
    - id: daily-tasks
      name: dsh-daily-tasks
```

## Usage

1. Open **Daily tasks** from the sidebar calendar icon.
2. The current date is selected automatically.
3. Type a task and press **Enter** or click **Add**.
4. Tick the checkbox when the task is done.
5. Hover a task and click the trash icon to delete it.
6. Use the arrows to change month, or click any date to see that day's list.

## Data and privacy

- Storage key: `dsh.daily-tasks.v1`.
- Stored shape: `{ version: 1, days: { "YYYY-MM-DD": [{ id, text, done, createdAt }] } }`.
- All data stays in the current browser profile. Clearing site data removes the tasks.
- No network requests, analytics, or Host-side persistence are used.

## Project layout

```text
.
├── package.json          # bundle manifest and Client entry declaration
├── cordis.patch.yml      # inserts the daily-tasks plugin row
├── index.js              # Host half (no-op; state lives in the browser)
├── client.js             # Web UI page, calendar, task list, locale dictionaries
├── locale/
│   ├── en.json           # Plugin Manager display metadata
│   └── zh.json
└── icon.svg              # original plugin icon
```

## Development

The plugin is plain JavaScript, loaded by the Harness Client module loader. There is no build step and no runtime dependency besides React, which the Host provides.

```powershell
node --check client.js
node --check index.js
```

## License

[MIT](./LICENSE)
