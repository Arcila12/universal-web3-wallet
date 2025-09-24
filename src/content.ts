// 内容脚本 - 运行在隔离的扩展上下文中
import browser from 'webextension-polyfill'

// 注入我们的提供者到页面上下文
const injectScript = () => {
  try {
    const container = document.head || document.documentElement
    const scriptTag = document.createElement('script')
    scriptTag.src = browser.runtime.getURL('src/content/inject.js')
    scriptTag.onload = function() {
      // 脚本加载完成后移除
      if (scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag)
      }
    }
    container.insertBefore(scriptTag, container.children[0])
  } catch (error) {
    console.error('Universal Wallet: Failed to inject provider', error)
  }
}

// 当DOM准备好时注入脚本
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript)
} else {
  injectScript()
}

// 监听来自注入脚本的消息
window.addEventListener('message', async (event) => {
  // 只处理来自同源的消息
  if (event.source !== window) return

  const message = event.data

  // 转发到背景脚本处理
  if (message.type && message.type.startsWith('UNIVERSAL_WALLET_')) {
    try {
      let backgroundMessage: any

      // 转换消息格式以匹配background script期望的格式
      switch (message.type) {
        case 'UNIVERSAL_WALLET_REQUEST_CONNECTION':
          backgroundMessage = { type: 'REQUEST_CONNECTION' }
          break
        case 'UNIVERSAL_WALLET_REQUEST_TRANSACTION':
          backgroundMessage = { type: 'REQUEST_TRANSACTION', transaction: message.transaction }
          break
        case 'UNIVERSAL_WALLET_REQUEST_SIGN':
          backgroundMessage = { type: 'REQUEST_SIGN', message: message.message, address: message.address }
          break
        case 'UNIVERSAL_WALLET_REQUEST_TYPED_DATA_SIGN':
          backgroundMessage = { type: 'REQUEST_TYPED_DATA_SIGN', typedData: message.typedData, address: message.address }
          break
        case 'UNIVERSAL_WALLET_SIGN_TRANSACTION':
          backgroundMessage = { type: 'SIGN_TRANSACTION', transaction: message.transaction }
          break
        case 'UNIVERSAL_WALLET_SIGN_MESSAGE':
          backgroundMessage = { type: 'SIGN_MESSAGE', message: message.message, address: message.address }
          break
        case 'UNIVERSAL_WALLET_SIGN_TYPED_DATA':
          backgroundMessage = { type: 'SIGN_TYPED_DATA', typedData: message.typedData, address: message.address }
          break
        case 'UNIVERSAL_WALLET_GET_ACCOUNTS':
          backgroundMessage = { type: 'GET_ACCOUNTS' }
          break
        case 'UNIVERSAL_WALLET_ADD_NETWORK':
          backgroundMessage = { type: 'SWITCH_NETWORK', chainId: message.chainParams.chainId, name: message.chainParams.chainName, rpcUrl: message.chainParams.rpcUrls[0] }
          break
        case 'UNIVERSAL_WALLET_REVOKE_PERMISSIONS':
          backgroundMessage = { type: 'REVOKE_PERMISSIONS', permissions: message.permissions }
          break
        case 'UNIVERSAL_WALLET_GET_PERMISSIONS':
          backgroundMessage = { type: 'GET_PERMISSIONS' }
          break
        default:
          backgroundMessage = message
      }

      browser.runtime.sendMessage(backgroundMessage).then((response: any) => {
        // 将响应发送回注入的脚本
        window.postMessage({
          type: 'UNIVERSAL_WALLET_RESPONSE',
          id: message.id,
          response
        }, '*')
      }).catch((error: any) => {
        window.postMessage({
          type: 'UNIVERSAL_WALLET_RESPONSE',
          id: message.id,
          response: { error: error.message }
        }, '*')
      })
    } catch (error: any) {
      console.error('Universal Wallet: Error handling message', error)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_RESPONSE',
        id: message.id,
        response: { error: error.message }
      }, '*')
    }
  }
})

// 监听来自background的广播消息
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'UNIVERSAL_WALLET_ACCOUNTS_CHANGED') {
    // 将账户变更事件转发给页面上的provider
    window.postMessage({
      type: 'UNIVERSAL_WALLET_ACCOUNTS_CHANGED',
      accounts: message.accounts,
      selectedAddress: message.selectedAddress
    }, '*')
    console.log('Universal Wallet: Forwarded accountsChanged event to page:', message.accounts)
  } else if (message.type === 'UNIVERSAL_WALLET_CHAIN_CHANGED') {
    // 将网络变更事件转发给页面上的provider
    window.postMessage({
      type: 'UNIVERSAL_WALLET_CHAIN_CHANGED',
      chainId: message.chainId
    }, '*')
    console.log('Universal Wallet: Forwarded chainChanged event to page:', message.chainId)
  }
})

console.log('Universal Wallet content script loaded')