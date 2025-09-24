// 注入脚本 - 运行在网页上下文中
import UniversalWalletProvider from '../provider/EthereumProvider'

// 创建提供者实例
const provider = new UniversalWalletProvider()

// 将提供者注入到 window 对象
declare global {
  interface Window {
    ethereum?: any
    universalWallet?: any
  }
}

// 设置为主要的以太坊提供者
window.ethereum = provider
window.universalWallet = provider

// 发出提供者可用事件
window.dispatchEvent(new Event('ethereum#initialized'))

// 兼容老版本的事件
const announceProvider = () => {
  window.dispatchEvent(new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzAwN0NGRiIvPgo8cGF0aCBkPSJNMTYgOEMxMi42ODYzIDggMTAgMTAuNjg2MyAxMCAxNEMxMCAxNy4zMTM3IDEyLjY4NjMgMjAgMTYgMjBDMTkuMzEzNyAyMCAyMiAxNy4zMTM3IDIyIDE0QzIyIDEwLjY4NjMgMTkuMzEzNyA4IDE2IDhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
        name: 'Universal Wallet',
        rdns: 'com.universal.wallet',
        uuid: '350670db-19fa-4704-a166-e52e178b59d2'
      },
      provider
    }
  }))
}

// 立即宣布提供者
announceProvider()

// 监听提供者发现请求
window.addEventListener('eip6963:requestProvider', announceProvider)

console.log('Universal Wallet provider injected successfully')