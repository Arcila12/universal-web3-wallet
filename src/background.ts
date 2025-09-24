import browser from 'webextension-polyfill';
import { Buffer } from 'buffer';
import process from 'process';
import { WalletManager } from './wallet/WalletManager'
import { NetworkManager } from './wallet/NetworkManager'
import TokenManager from './wallet/TokenManager'

interface PendingRequest {
  id: string;
  type: 'connection' | 'transaction' | 'sign' | 'typedData';
  origin?: string;
  data?: any;
  message?: string;
  address?: string;
  transaction?: any;
  typedData?: any;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

// Make Node.js APIs available globally
globalThis.Buffer = Buffer;
globalThis.process = process;

// Add additional global definitions for crypto and other APIs
if (!globalThis.global) {
  globalThis.global = globalThis;
}

class BackgroundService {
  private walletManager: WalletManager
  private networkManager: NetworkManager
  private tokenManager: TokenManager
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private currentPopupWindowId: number | null = null
  private pendingRequestAfterUnlock: PendingRequest | null = null

  constructor() {
    this.walletManager = WalletManager.getInstance()
    this.networkManager = NetworkManager.getInstance()
    this.tokenManager = TokenManager.getInstance()
    this.init()
  }

  private async init() {
    console.log('Universal Wallet: Initializing background service...')
    await this.walletManager.initialize()
    await this.networkManager.initialize()
    await this.tokenManager.initialize()
    this.setupMessageListeners()
    console.log('Universal Wallet: Background service initialized')
  }

  private setupMessageListeners() {
    browser.runtime.onMessage.addListener((message, sender) => {
      return this.handleMessage(message, sender);
    })

    // 监听扩展安装
    browser.runtime.onInstalled.addListener(() => {
      console.log('Universal Wallet Extension installed')
    })
  }

  private async handleMessage(message: any, sender: any): Promise<any> {
    console.log('Universal Wallet: Received message:', message)
    try {
      switch (message.type) {
        case 'GET_WALLET_STATE':
          const res = this.walletManager.getState()
          return { state: res }
        case 'CREATE_WALLET':
          const mnemonic = await this.walletManager.createWallet(message.password)
          
          return { success: true, mnemonic }

        case 'IMPORT_WALLET':
          await this.walletManager.importWallet(message.mnemonic, message.password)
          return { success: true }

        case 'UNLOCK_WALLET':
          const unlocked = await this.walletManager.unlock(message.password)
          if (unlocked) {
            // 解锁成功后广播账户变更事件
            await this.broadcastAccountsChanged()
          }
          return { success: unlocked }

        case 'LOCK_WALLET':
          this.walletManager.lock()
          return { success: true }

        case 'GET_ACCOUNTS':
          const allAccounts = this.walletManager.getAccounts()
          const accounts = allAccounts.map(acc => acc.address)
          const currentAccount = this.walletManager.getCurrentAccount()
          return {
            accounts,
            selectedAddress: currentAccount?.address || accounts[0]
          }

        case 'CREATE_ACCOUNT':
          const account = await this.walletManager.createAccount(message.name)
          // 广播账户变更事件
          await this.broadcastAccountsChanged()
          return { account: account.address }

        case 'IMPORT_ACCOUNT_FROM_PRIVATE_KEY':
          const importedAccount = await this.walletManager.importAccountFromPrivateKey(message.name, message.privateKey)
          // 广播账户变更事件
          await this.broadcastAccountsChanged()
          return { success: true, account: importedAccount.address }

        case 'SWITCH_ACCOUNT':
          this.walletManager.switchAccount(message.index)
          // 广播账户变更事件
          await this.broadcastAccountsChanged()
          return { success: true }

        case 'SWITCH_NETWORK':
          await this.walletManager.switchNetwork(message.chainId, message.name, message.rpcUrl)
          // 广播网络变更事件
          await this.broadcastChainChanged(message.chainId)
          return { success: true }

        case 'REQUEST_CONNECTION':
          return await this.createUserRequest('connection', {
            origin: sender.tab?.url || sender.origin
          })

        case 'REQUEST_TRANSACTION':
          return await this.createUserRequest('transaction', {
            transaction: message.transaction,
            origin: sender.tab?.url || sender.origin
          })

        case 'REQUEST_SIGN':
          return await this.createUserRequest('sign', {
            message: message.message,
            address: message.address,
            origin: sender.tab?.url || sender.origin
          })

        case 'REQUEST_TYPED_DATA_SIGN':
          return await this.createUserRequest('typedData', {
            typedData: message.typedData,
            address: message.address,
            origin: sender.tab?.url || sender.origin
          })

        case 'GET_PENDING_REQUEST':
          return this.getPendingRequest()

        case 'APPROVE_REQUEST':
          return this.approveRequest(message.id)

        case 'REJECT_REQUEST':
          return this.rejectRequest(message.id)

        case 'WALLET_UNLOCKED_CONTINUE_REQUEST':
          return this.handleWalletUnlockedContinue()

        case 'SIGN_TRANSACTION':
          const signedTx = await this.walletManager.signTransaction(message.transaction)
          return { signature: signedTx }

        case 'SIGN_MESSAGE':
          const signature = await this.walletManager.signMessage(message.message)
          return { signature }

        case 'SIGN_TYPED_DATA':
          const typedSignature = await this.handleTypedDataSign(message.typedData)
          return { signature: typedSignature }

        // Network management
        case 'GET_NETWORKS':
          const networks = this.networkManager.getNetworks()
          console.log('Background: GET_NETWORKS response:', networks.length, 'networks')
          return { success: true, networks }

        case 'ADD_NETWORK':
          const newNetwork = await this.networkManager.addNetwork({
            chainId: message.chainId,
            name: message.name,
            rpcUrl: message.rpcUrl,
            symbol: message.symbol,
            blockExplorerUrl: message.blockExplorerUrl
          })
          // 添加网络后，如果需要可以在这里广播网络变更
          return { success: true, network: newNetwork }

        case 'UPDATE_NETWORK':
          const updatedNetwork = await this.networkManager.updateNetwork(message.id, {
            chainId: message.chainId,
            name: message.name,
            rpcUrl: message.rpcUrl,
            symbol: message.symbol,
            blockExplorerUrl: message.blockExplorerUrl
          })
          return { success: true, network: updatedNetwork }

        case 'REMOVE_NETWORK':
          await this.networkManager.removeNetwork(message.id)
          return { success: true }

        // Account management
        case 'GET_PRIVATE_KEY':
          const privateKey = await this.walletManager.getPrivateKey(message.password, message.accountIndex)
          return { success: true, privateKey }

        case 'GET_MNEMONIC':
          const walletMnemonic = await this.walletManager.getMnemonic(message.password)
          return { success: true, mnemonic: walletMnemonic }

        // Balance management
        case 'GET_BALANCE':
          const balance = await this.getBalance(message.address, message.chainId)
          return { success: true, balance }

        // Account management
        case 'RENAME_ACCOUNT':
          await this.walletManager.renameAccount(message.accountIndex, message.newName)
          return { success: true }

        // Token management
        case 'GET_TOKENS':
          const tokens = this.tokenManager.getTokens(message.accountAddress, message.chainId)
          return { success: true, tokens }

        case 'ADD_TOKEN':
          const tokenAdded = await this.tokenManager.addToken(
            message.accountAddress,
            message.chainId,
            {
              address: message.tokenAddress,
              symbol: message.symbol,
              name: message.name,
              decimals: message.decimals
            }
          )
          return { success: tokenAdded }

        case 'REMOVE_TOKEN':
          const tokenRemoved = await this.tokenManager.removeToken(
            message.accountAddress,
            message.chainId,
            message.tokenAddress
          )
          return { success: tokenRemoved }

        case 'UPDATE_TOKEN_BALANCE':
          await this.tokenManager.updateTokenBalance(
            message.accountAddress,
            message.chainId,
            message.tokenAddress,
            message.balance
          )
          return { success: true }

        case 'GET_POPULAR_TOKENS':
          const popularTokens = this.tokenManager.getPopularTokens(message.chainId)
          return { success: true, tokens: popularTokens }

        // 权限管理
        case 'REVOKE_PERMISSIONS':
          // 清除连接权限（这里可以扩展为更详细的权限管理）
          return { success: true }

        case 'GET_PERMISSIONS':
          // 返回当前权限状态
          const walletState = this.walletManager.getState()
          if (!walletState.isLocked && walletState.accounts.length > 0) {
            return {
              success: true,
              permissions: [
                {
                  id: 'account-access',
                  parentCapability: 'eth_accounts',
                  caveats: [
                    {
                      type: 'restrictReturnedAccounts',
                      value: walletState.accounts.map(acc => acc.address)
                    }
                  ],
                  date: Date.now()
                }
              ]
            }
          }
          return { success: true, permissions: [] }

        default:
          return { error: 'Unknown message type' }
      }
    } catch (error: any) {
      return { error: error.message }
    }
  }

  private async createUserRequest(type: PendingRequest['type'], data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        timestamp: Date.now(),
        resolve,
        reject,
        ...data
      }

      this.pendingRequests.set(request.id, request)

      // 检查钱包是否锁定
      if (this.walletManager.getState().isLocked) {
        this.pendingRequestAfterUnlock = request
        this.openUnlockPopup(request)
      } else {
        this.openConfirmationPopup(request)
      }
    })
  }

  private async openConfirmationPopup(request: PendingRequest): Promise<void> {
    // 关闭现有的弹窗
    if (this.currentPopupWindowId) {
      try {
        await browser.windows.remove(this.currentPopupWindowId)
      } catch (error) {
        console.log('Failed to close previous popup:', error)
      }
    }

    try {
      const popup = await browser.windows.create({
        url: browser.runtime.getURL('src/confirm.html'),
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
      })

      this.currentPopupWindowId = popup.id || null

      // 监听弹窗关闭事件
      browser.windows.onRemoved.addListener((windowId) => {
        if (windowId === this.currentPopupWindowId) {
          this.currentPopupWindowId = null
          // 如果用户关闭弹窗，拒绝请求
          const pendingRequest = this.pendingRequests.get(request.id)
          if (pendingRequest) {
            pendingRequest.reject(new Error('User closed popup'))
            this.pendingRequests.delete(request.id)
          }
        }
      })
    } catch (error) {
      request.reject(error)
      this.pendingRequests.delete(request.id)
    }
  }

  private getPendingRequest(): { success: boolean; request?: PendingRequest } {
    const requests = Array.from(this.pendingRequests.values())
    if (requests.length === 0) {
      return { success: true }
    }

    // 返回最新的请求
    const latestRequest = requests.sort((a, b) => b.timestamp - a.timestamp)[0]
    return {
      success: true,
      request: {
        id: latestRequest.id,
        type: latestRequest.type,
        origin: latestRequest.origin,
        message: latestRequest.message,
        address: latestRequest.address,
        transaction: latestRequest.transaction,
        typedData: latestRequest.typedData,
        timestamp: latestRequest.timestamp,
        resolve: latestRequest.resolve,
        reject: latestRequest.reject
      } as PendingRequest
    }
  }

  private async approveRequest(id: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const request = this.pendingRequests.get(id)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    try {
      let result: any = { approved: true }

      switch (request.type) {
        case 'connection':
          // 授权连接，返回当前账户信息
          const connectionAccounts = this.walletManager.getAccounts().map(acc => acc.address)
          const connectionCurrentAccount = this.walletManager.getCurrentAccount()
          result = {
            approved: true,
            accounts: connectionAccounts,
            selectedAddress: connectionCurrentAccount?.address || connectionAccounts[0]
          }
          break

        case 'transaction':
          // 签名并发送交易
          const signedTx = await this.walletManager.signTransaction(request.transaction)
          result = { approved: true, txHash: signedTx }
          break

        case 'sign':
          // 签名消息
          if (!request.message) {
            throw new Error('Message is required for signing')
          }
          const signature = await this.walletManager.signMessage(request.message)
          result = { approved: true, signature }
          break

        case 'typedData':
          // 签名类型化数据
          const typedSignature = await this.walletManager.signTypedData(
            request.typedData.domain,
            request.typedData.types,
            request.typedData.value
          )
          result = { approved: true, signature: typedSignature }
          break
      }

      request.resolve(result)
      this.pendingRequests.delete(id)

      // 关闭弹窗
      if (this.currentPopupWindowId) {
        browser.windows.remove(this.currentPopupWindowId)
        this.currentPopupWindowId = null
      }

      return { success: true, result }
    } catch (error: any) {
      request.reject(error)
      this.pendingRequests.delete(id)
      return { success: false, error: error.message }
    }
  }

  private async rejectRequest(id: string): Promise<{ success: boolean; error?: string }> {
    const request = this.pendingRequests.get(id)
    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    request.reject(new Error('User rejected the request'))
    this.pendingRequests.delete(id)

    // 关闭弹窗
    if (this.currentPopupWindowId) {
      browser.windows.remove(this.currentPopupWindowId)
      this.currentPopupWindowId = null
    }

    return { success: true }
  }

  private async openUnlockPopup(request: PendingRequest): Promise<void> {
    // 关闭现有的弹窗
    if (this.currentPopupWindowId) {
      try {
        await browser.windows.remove(this.currentPopupWindowId)
      } catch (error) {
        console.log('Failed to close previous popup:', error)
      }
    }

    try {
      const popup = await browser.windows.create({
        url: browser.runtime.getURL('src/unlock.html'),
        type: 'popup',
        width: 400,
        height: 500,
        focused: true
      })

      this.currentPopupWindowId = popup.id || null

      // 监听弹窗关闭事件
      browser.windows.onRemoved.addListener((windowId) => {
        if (windowId === this.currentPopupWindowId) {
          this.currentPopupWindowId = null
          // 如果用户关闭解锁弹窗，拒绝原始请求
          if (this.pendingRequestAfterUnlock) {
            this.pendingRequestAfterUnlock.reject(new Error('User closed unlock popup'))
            this.pendingRequests.delete(this.pendingRequestAfterUnlock.id)
            this.pendingRequestAfterUnlock = null
          }
        }
      })
    } catch (error) {
      request.reject(error)
      this.pendingRequests.delete(request.id)
      this.pendingRequestAfterUnlock = null
    }
  }

  private async handleWalletUnlockedContinue(): Promise<{ success: boolean; error?: string }> {
    if (!this.pendingRequestAfterUnlock) {
      return { success: false, error: 'No pending request found' }
    }

    try {
      // 关闭解锁弹窗
      if (this.currentPopupWindowId) {
        browser.windows.remove(this.currentPopupWindowId)
        this.currentPopupWindowId = null
      }

      // 打开确认弹窗
      this.openConfirmationPopup(this.pendingRequestAfterUnlock)

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  private async handleTypedDataSign(typedDataString: string): Promise<string> {
    const typedData = JSON.parse(typedDataString)
    return this.walletManager.signTypedData(typedData.domain, typedData.types, typedData.value)
  }

  private async getBalance(address: string, chainId: string): Promise<string> {
    try {
      // 获取当前网络的RPC URL
      const network = this.networkManager.getNetworkByChainId(chainId)
      if (!network) {
        throw new Error('Network not found')
      }

      // 简化的余额获取逻辑 - 在实际应用中需要使用ethers.js或web3.js
      // 这里返回模拟数据，实际实现需要调用RPC
      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      // 将wei转换为eth (简化转换，实际需要使用BigNumber)
      const balanceWei = parseInt(data.result, 16)
      const balanceEth = (balanceWei / Math.pow(10, 18)).toFixed(4)

      return balanceEth
    } catch (error) {
      console.error('Error fetching balance:', error)
      return '0.0000'
    }
  }

  // 广播账户变更事件到所有已连接的页面
  private async broadcastAccountsChanged(): Promise<void> {
    try {
      const allAccounts = this.walletManager.getAccounts()
      const accounts = allAccounts.map(acc => acc.address)
      const currentAccount = this.walletManager.getCurrentAccount()
      const selectedAddress = currentAccount?.address || accounts[0]

      // 获取所有活动的标签页
      const tabs = await browser.tabs.query({})

      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          try {
            // 向每个标签页发送账户变更消息
            await browser.tabs.sendMessage(tab.id, {
              type: 'UNIVERSAL_WALLET_ACCOUNTS_CHANGED',
              accounts,
              selectedAddress
            })
          } catch (error) {
            // 忽略无法发送消息的标签页（可能没有注入内容脚本）
            console.log(`Failed to send accountsChanged to tab ${tab.id}:`, error)
          }
        }
      }

      console.log('Universal Wallet: Broadcasted accountsChanged:', accounts, 'Selected:', selectedAddress)
    } catch (error) {
      console.error('Universal Wallet: Failed to broadcast accountsChanged:', error)
    }
  }

  // 广播网络变更事件到所有已连接的页面
  private async broadcastChainChanged(chainId: string): Promise<void> {
    try {
      // 获取所有活动的标签页
      const tabs = await browser.tabs.query({})

      for (const tab of tabs) {
        if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
          try {
            // 向每个标签页发送网络变更消息
            await browser.tabs.sendMessage(tab.id, {
              type: 'UNIVERSAL_WALLET_CHAIN_CHANGED',
              chainId
            })
          } catch (error) {
            // 忽略无法发送消息的标签页（可能没有注入内容脚本）
            console.log(`Failed to send chainChanged to tab ${tab.id}:`, error)
          }
        }
      }

      console.log('Universal Wallet: Broadcasted chainChanged:', chainId)
    } catch (error) {
      console.error('Universal Wallet: Failed to broadcast chainChanged:', error)
    }
  }

}

// 初始化背景服务
new BackgroundService()
