# PR 标题

`chore(android): migrate toolchain to JDK17 + Capacitor 6`

# PR 描述

## 背景

当前 Android 构建链与本地/CI 的 JDK 版本存在不一致问题。  
本次调整将 Android 工具链统一到可稳定运行的 `JDK 17` 方案，并同步 Capacitor 主版本，确保构建可复现。

## 主要变更

1. Capacitor 依赖降级到 `6.x`
- `@capacitor/android` -> `6.2.1`
- `@capacitor/cli` -> `6.2.1`
- `@capacitor/core` -> `6.2.1`
- `@capacitor/filesystem` -> `6.0.4`
- `@capacitor/share` -> `6.0.4`

2. Android 构建链对齐 JDK 17
- AGP 调整为 `8.2.1`
- Gradle Wrapper 调整为 `8.2.1`
- `sourceCompatibility/targetCompatibility` 统一为 `JavaVersion.VERSION_17`
- 移除硬编码 `org.gradle.java.home`，避免绑定本机路径

3. 文档更新
- 更新 `README.md`：补充 JDK 17 构建说明与分支发布流程
- 新增审查与提交流程文档：
  - `docs/review-2026-02-07.md`
  - `docs/pr-checklist-jdk17.md`

## 验证结果

- `npm run build`：通过
- `npx cap sync android`：通过
- `.\android\gradlew.bat -p android clean assembleDebug`（JDK 17 下）：通过

## 风险与影响

1. 本 PR 仅作用于 `feature/jdk17-cap6` 分支，不影响现有 `main`（JDK 21 旧版本）历史。
2. 若本地 `JAVA_HOME` 不是 JDK 17，Android 构建可能失败，请先切换到 JDK 17。

## 备注

- 构建产物 `android/app/release/output-metadata.json` 不纳入本次提交。
