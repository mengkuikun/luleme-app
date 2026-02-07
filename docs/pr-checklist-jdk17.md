# JDK17 分支 PR 检查清单

适用分支：`feature/jdk17-cap6`（或同类 JDK17/Capacitor6 迁移分支）

## 1. 本地环境确认

```powershell
$env:JAVA_HOME='F:\Java\jdk-17'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -version
```

预期：显示 `17.x`。

## 2. 依赖与构建链确认

```bash
rg -n "@capacitor/(android|cli|core|filesystem|share)" package.json
rg -n "com.android.tools.build:gradle|VERSION_17" android/build.gradle android/app/build.gradle
rg -n "distributionUrl" android/gradle/wrapper/gradle-wrapper.properties
```

预期：
1. Capacitor 依赖在 `6.x`
2. Java 编译目标为 `VERSION_17`
3. Gradle Wrapper 为 `8.2.1`

## 3. 必跑验证

```powershell
npm run build
npx cap sync android
.\android\gradlew.bat -p android clean assembleDebug
```

预期：全部通过。

## 4. 提交前文件检查（重点）

查看改动：

```bash
git status --short
```

`android/app/release/output-metadata.json` 属于构建产物，通常不建议提交。  
若你不想提交它，执行：

```bash
git restore --worktree --staged android/app/release/output-metadata.json
```

再次确认：

```bash
git status --short
```

## 5. 提交与推送（仅新分支）

```bash
git switch -c feature/jdk17-cap6
git add package.json package-lock.json android/build.gradle android/app/build.gradle android/app/capacitor.build.gradle android/gradle.properties android/gradle/wrapper/gradle-wrapper.properties docs/review-2026-02-07.md docs/pr-checklist-jdk17.md README.md
git commit -m "chore(android): downgrade toolchain to JDK17 + Capacitor 6"
git push -u origin feature/jdk17-cap6
```

## 6. PR 描述建议

标题建议：
- `chore(android): migrate toolchain to JDK17 + Capacitor 6`

正文建议：
1. 变更范围：Capacitor 版本、AGP/Gradle、Java target 17、README 文档更新
2. 验证结果：`npm run build`、`npx cap sync android`、`assembleDebug` 全通过
3. 风险说明：`main`（JDK21 旧版本）不受影响，仅新分支生效

## 7. 回滚方案

如果 PR 验证失败，不合并该分支即可。  
已推送分支回退可用：

```bash
git revert <commit_sha>
```

