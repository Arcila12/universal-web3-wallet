# 🌐 Universal Web3 Wallet

<div align="center">

![Universal Web3 Wallet Logo](https://img.shields.io/badge/Web3-Wallet-blue?style=for-the-badge&logo=ethereum&logoColor=white)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=flat&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![EIP-1193](https://img.shields.io/badge/EIP--1193-Compatible-orange?style=flat)](https://eips.ethereum.org/EIPS/eip-1193)
[![MetaMask](https://img.shields.io/badge/MetaMask-Alternative-ff6600?style=flat&logo=metamask&logoColor=white)](https://metamask.io/)

**🚀 The Complete Web3 Wallet Browser Extension - MetaMask Alternative with Advanced Features**

*Secure • Multi-Network • ERC-20 Ready • DeFi Optimized • Open Source*

[🚀 Quick Install](#-installation) • [✨ Features](#-features) • [📖 Docs](#-documentation) • [🤝 Contribute](#-contributing) • [🔐 Security](#-security)

**⭐ Star this repo** | **🍴 Fork & Contribute** | **📢 Share with Community**

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Installation](#-installation)
- [🏗️ Architecture](#️-architecture)
- [🔧 Development](#-development)
- [📱 Usage](#-usage)
- [🌍 Multi-language Support](#-multi-language-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

> **Why Choose Universal Web3 Wallet?**
> Built for the next generation of DeFi users who demand security, flexibility, and seamless multi-chain experiences.

### 🔐 **Core Wallet Features**
- **🛡️ EIP-1193 Provider**: Full compliance with Ethereum provider standard - works with ALL DApps
- **🔑 Mnemonic Support**: BIP39 12-word mnemonic phrase generation and import with entropy validation
- **👥 Multi-Account**: HD wallet with hierarchical deterministic account generation (unlimited accounts)
- **📥 Account Import**: Import accounts via private keys with security warnings
- **🔒 Secure Storage**: Military-grade AES encryption for keys and mnemonics - never leaves your device

### 🌐 **Multi-Chain Network Support**
- **🌍 15+ Networks**: Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche, Fantom + more
- **⚙️ Custom Networks**: Add any EVM-compatible network with custom RPC endpoints
- **⚡ Instant Switching**: Seamless network switching with automatic balance updates
- **🦊 MetaMask Compatible**: Drop-in replacement - works with existing DApp integrations
- **🔄 Auto-Detection**: Automatically detects and suggests network additions from DApps

### 💰 **Token Management**
- **ERC-20 Tokens**: Add, remove, and manage custom tokens
- **Balance Tracking**: Real-time balance updates every 6 seconds
- **Auto-refresh**: Balance updates on account/network changes
- **Token Filtering**: Hide/show zero-balance tokens

### 🔒 **Transaction & Signing**
- **Transaction Signing**: Secure transaction signing with user confirmation
- **Message Signing**: Support for `personal_sign` message signing
- **Typed Data**: Full `eth_signTypedData_v4` support
- **Confirmation UI**: User-friendly transaction confirmation popups

### 🎨 **User Experience**
- **Modern UI**: Built with Ant Design for sleek interface
- **Multi-language**: Support for English, Chinese, Korean, and Japanese
- **Lock/Unlock**: Secure wallet state management
- **Address Book**: Easy address management and copying

## 🚀 Installation

### Prerequisites
- Node.js 16+ and npm
- Chrome/Chromium browser
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/UniversalWeb3Wallet.git
   cd UniversalWeb3Wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked extension"
   - Select the `dist` folder from the project

### Development Mode

```bash
# Start development server with hot reload
npm run dev
```

## 🏗️ Architecture

```
src/
├── 📂 provider/
│   └── EthereumProvider.ts    # EIP-1193 provider implementation
├── 📂 wallet/
│   ├── WalletManager.ts       # Core wallet functionality
│   ├── NetworkManager.ts      # Network management
│   └── TokenManager.ts        # ERC-20 token management
├── 📂 pages/
│   ├── Popup.tsx             # Main wallet interface
│   ├── TokenList.tsx         # Token management UI
│   └── Settings.tsx          # Settings and preferences
├── 📂 content/
│   └── inject.ts             # DApp injection script
├── 📂 hooks/
│   └── useI18n.ts           # Internationalization hook
├── background.ts             # Service worker
├── content.ts               # Content script
└── manifest.json            # Extension configuration
```

### Tech Stack

- **Frontend**: React 18 + TypeScript + Ant Design
- **Blockchain**: ethers.js v6 + EIP-1193
- **Crypto**: bip39, crypto-js, @metamask/eth-sig-util
- **Build**: Vite + vite-plugin-web-extension
- **Browser**: WebExtension Polyfill

## 🔧 Development

### Project Structure

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Production build
npm run build

# Type checking
npm run type-check
```

### Configuration

1. **Infura Setup**: Configure your Infura API key in `WalletManager.ts`
2. **Networks**: Add custom networks in `NetworkManager.ts`
3. **Tokens**: Configure popular tokens in `TokenManager.ts`

## 📱 Usage

### 🆕 First Time Setup

1. **Create New Wallet**
   - Click extension icon → "Create Wallet"
   - Set secure password
   - **⚠️ Important**: Save your mnemonic phrase securely!

2. **Import Existing Wallet**
   - Choose "Import Wallet" tab
   - Enter your 12-word mnemonic phrase
   - Set password

### 🔗 Connecting to DApps

```javascript
// DApp integration example
if (window.ethereum) {
  console.log('Universal Wallet detected!')

  // Request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  })

  // Send transaction
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from: accounts[0],
      to: '0x...',
      value: '0x...'
    }]
  })
}
```

### 🪙 Managing Tokens

- **Add Token**: Click "+" button → Enter contract address
- **Auto-detection**: Popular tokens load automatically
- **Balance Updates**: Refreshes every 6 seconds
- **Hide Zero**: Toggle to hide tokens with zero balance

## 🌍 Multi-language Support

Available in 4 languages:
- 🇺🇸 **English** ([Setup Guide](./docs/WEB3_SETUP_EN.md))
- 🇨🇳 **中文** ([设置指南](./docs/WEB3_SETUP_CN.md))
- 🇰🇷 **한국어** ([설정 가이드](./docs/WEB3_SETUP_KO.md))
- 🇯🇵 **日本語** ([セットアップガイド](./docs/WEB3_SETUP_JP.md))

## 🛡️ Security Features

- **🔐 Local Encryption**: AES encryption for all sensitive data
- **🔒 Password Protection**: Required for all wallet operations
- **✅ User Confirmation**: Manual approval for all transactions
- **🏠 Isolated Storage**: Chrome extension secure storage
- **🔑 No Key Logging**: Private keys never leave your device

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. Always:
- Test on testnets first
- Keep backups of your mnemonic phrases
- Never share private keys
- Conduct security audits before production use

## 🙋‍♂️ Support

- 📁 [Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/yourusername/UniversalWeb3Wallet/issues)
- 💬 [Discussions](https://github.com/yourusername/UniversalWeb3Wallet/discussions)
- 🔒 [Security Policy](SECURITY.md)

---

<div align="center">
<strong>Built with ❤️ for the decentralized web</strong>

[![Star this repo](https://img.shields.io/github/stars/yourusername/UniversalWeb3Wallet?style=social)](https://github.com/yourusername/UniversalWeb3Wallet)

</div>