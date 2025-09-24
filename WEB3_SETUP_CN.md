# Universal Web3 Wallet - 钱包扩展说明

## 项目概述

这是一个完整的Web3钱包浏览器扩展，实现了EIP-1193标准，为DApp提供以太坊提供者服务。

## 核心功能

### ✅ 钱包提供者功能
- **EIP-1193 Provider**: 实现了标准的以太坊提供者接口
- **DApp注入**: 向所有网页注入 `window.ethereum` 对象
- **多网络支持**: 支持以太坊主网及其他EVM兼容网络
- **标准兼容**: 兼容MetaMask和其他钱包的API

### ✅ 钱包管理功能
- **助记词生成/导入**: 支持12个单词的BIP39助记词
- **多账户管理**: 基于HD钱包的分层确定性账户生成
- **密码加密**: 本地加密存储助记词和私钥
- **账户切换**: 支持多个账户之间的切换

### ✅ 交易和签名功能
- **交易签名**: 支持标准以太坊交易签名
- **消息签名**: 支持 `personal_sign` 消息签名
- **类型化数据签名**: 支持 `eth_signTypedData_v4`
- **交易确认**: 弹窗确认所有签名和交易操作

### ✅ 用户界面
- **Ant Design UI**: 现代化的用户界面
- **钱包状态管理**: 锁定/解锁状态管理
- **网络切换**: 支持切换不同的以太坊网络
- **余额显示**: 账户余额查询和显示

## 技术架构

### 核心依赖
```json
{
  "ethers": "^6.15.0",           // 以太坊库，用于交易和签名
  "bip39": "^3.1.0",            // 助记词生成和验证
  "@metamask/eth-sig-util": "^8.2.0", // 签名工具
  "crypto-js": "^4.2.0",        // 加密库
  "antd": "^5.27.4",            // UI组件库
  "webextension-polyfill": "^0.10.0" // 浏览器扩展API兼容层
}
```

### 文件结构
```
src/
├── provider/
│   └── EthereumProvider.ts    # EIP-1193提供者实现
├── wallet/
│   └── WalletManager.ts       # 钱包核心管理
├── content/
│   └── inject.ts              # 注入脚本
├── content.ts                 # 内容脚本
├── background.ts              # 背景脚本
├── pages/
│   └── Popup.tsx              # 钱包UI界面
├── popup.tsx                  # 弹窗入口
└── manifest.json              # 扩展配置
```

## 开发和构建

### 1. 安装依赖
```bash
npm install
```

### 2. 开发模式
```bash
npm run dev
```

### 3. 构建扩展
```bash
npm run build
```

### 4. 加载扩展
1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 文件夹

## 使用方法

### 1. 创建钱包
- 点击扩展图标打开钱包
- 选择"创建钱包"
- 设置密码并保存助记词

### 2. 连接DApp
- 访问支持Web3的网站
- 网站会自动检测到Universal Wallet
- 点击连接钱包按钮进行连接

### 3. 签名交易
- DApp发起交易时会弹出确认窗口
- 确认交易详情后点击确认
- 钱包会自动签名并发送交易

## DApp集成示例

```javascript
// 检测钱包
if (window.ethereum) {
  console.log('Universal Wallet detected')
}

// 连接钱包
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts'
})

// 发送交易
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...',
    gasLimit: '0x5208'
  }]
})

// 签名消息
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: ['Hello World', accounts[0]]
})
```

## 安全特性

- **本地加密存储**: 私钥和助记词使用AES加密存储
- **密码保护**: 钱包操作需要密码验证
- **确认弹窗**: 所有签名操作都需要用户确认
- **隔离存储**: 使用Chrome扩展的独立存储空间

## 扩展功能

可以继续添加的功能：
- **代币支持**: ERC-20代币管理和转账
- **NFT展示**: ERC-721/ERC-1155 NFT管理
- **交易历史**: 本地交易记录存储
- **地址簿**: 常用地址管理
- **多语言**: 国际化支持
- **硬件钱包**: Ledger/Trezor集成

## 注意事项

1. **Infura配置**: 需要在 `WalletManager.ts` 中配置有效的Infura API密钥
2. **网络配置**: 可以在代码中添加更多EVM兼容网络
3. **安全性**: 生产环境使用前请进行充分的安全审计
4. **测试**: 建议先在测试网络上进行充分测试

这个钱包扩展实现了完整的Web3钱包功能，可以为DApp提供标准的以太坊提供者服务。