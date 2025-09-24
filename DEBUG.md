# 钱包扩展调试指南

## 当前问题诊断

您遇到的错误 "Could not establish connection. Receiving end does not exist" 通常表示background script没有正确启动。

## 修复步骤

### 1. 重新构建扩展
```bash
npm run build
```

### 2. 重新加载扩展
1. 打开 `chrome://extensions/`
2. 找到 "Universal Web3 Wallet" 扩展
3. 点击 "重新加载" 按钮 🔄
4. 确保扩展状态为"已启用"

### 3. 检查Background Script是否正常运行

#### 3.1 查看扩展详情
1. 在 `chrome://extensions/` 页面
2. 点击扩展的 "详细信息"
3. 查看是否有 "检查视图: 背景页" 或 "Service Worker"
4. 点击它来打开background script的控制台

#### 3.2 检查控制台输出
在background script控制台中，您应该看到：
```
Universal Wallet: Initializing background service...
Universal Wallet Extension installed
Universal Wallet: Background service initialized
```

如果没有看到这些日志，说明background script启动失败。

### 4. 检查Popup连接

#### 4.1 打开扩展popup
1. 点击浏览器工具栏中的扩展图标
2. 右键点击popup → "检查"
3. 打开popup的开发者工具

#### 4.2 查看popup控制台
在popup的控制台中，尝试手动发送消息：
```javascript
browser.runtime.sendMessage({type: 'GET_WALLET_STATE'})
  .then(response => console.log('Response:', response))
  .catch(error => console.error('Error:', error))
```

### 5. 常见解决方案

#### 5.1 检查manifest权限
确保 `dist/manifest.json` 包含：
```json
{
  "permissions": ["storage", "tabs", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

#### 5.2 清除扩展数据
1. 在 `chrome://extensions/` 中删除扩展
2. 重新加载扩展文件夹

#### 5.3 检查TypeScript编译错误
```bash
npm run build
```
确保没有编译错误。

### 6. 手动测试Background Script

在background script控制台中运行：
```javascript
// 测试WalletManager
const manager = window.walletManager || WalletManager.getInstance()
console.log('Wallet state:', manager.getState())
```

## 开发模式调试

如果您正在使用开发模式 (`npm run dev`)：

1. 确保所有文件都正确构建到 `dist` 文件夹
2. 检查 `dist/src/background.js` 是否存在且完整
3. 在浏览器中加载 `dist` 文件夹，而不是源代码文件夹

## 重要提醒

⚠️ **开发模式问题**: 当前在开发模式下popup.html可能引用localhost资源，这在生产构建中会被修复。请确保：

1. 使用 `npm run build` 构建生产版本
2. 在浏览器中加载 `dist` 文件夹
3. 不要在开发服务器运行时加载扩展

## 如果问题持续存在

请提供以下信息：
1. background script控制台的完整日志
2. popup控制台的错误信息
3. `chrome://extensions/` 页面中扩展的状态
4. 浏览器版本和操作系统信息