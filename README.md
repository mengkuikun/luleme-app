<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 鹿了么（Lulemo）

一个基于 `React + Vite + Capacitor(Android)` 的本地隐私记录应用。

## 本地运行（Web）

前置条件：`Node.js`

1. 安装依赖：`npm install`
2. 启动开发服务：`npm run dev`

## Android 构建（JDK 17）

前置条件：
1. `JDK 17`
2. 已安装 Android SDK / Android Studio

PowerShell 临时切换 JDK 17（仅当前终端生效）：

```powershell
$env:JAVA_HOME='F:\Java\jdk-17'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
```

构建命令：

```powershell
npm run build
npx cap sync android
.\android\gradlew.bat -p android clean assembleDebug
```

## Git 分支发布建议（不影响 JDK 21 版本）

如果你希望保留 `origin/main` 上的旧版本（如 JDK 21）不受影响，请只在新分支提交和推送：

```bash
git fetch origin
git switch -c feature/jdk17-cap6
git add package.json package-lock.json android/build.gradle android/app/build.gradle android/app/capacitor.build.gradle android/gradle.properties android/gradle/wrapper/gradle-wrapper.properties docs/review-2026-02-07.md README.md
git commit -m "chore(android): downgrade toolchain to JDK17 + Capacitor 6"
git push -u origin feature/jdk17-cap6
```

说明：
1. 这不会改动 `main` 分支。
2. 旧版本代码仍保留在 `main`（或你指定的旧分支）。
3. 后续通过 PR 决定是否合并到目标分支。

详细检查项见：`docs/pr-checklist-jdk17.md`
