import { ethers } from 'ethers'

// 简单的EventEmitter实现，适用于浏览器环境
class EventEmitter {
  private events: { [key: string]: Function[] } = {}

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args))
    }
  }

  removeListener(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener)
    }
  }
}

export interface RequestArguments {
  method: string
  params?: any[]
}

export interface EthereumProvider extends EventEmitter {
  isMetaMask?: boolean
  isUniversalWallet?: boolean
  chainId: string
  selectedAddress: string | null
  networkVersion: string
  request(args: RequestArguments): Promise<any>
  enable(): Promise<string[]>
  send(method: string, params?: any[]): Promise<any>
  sendAsync(payload: any, callback: (error: any, result: any) => void): void
}

class UniversalWalletProvider extends EventEmitter implements EthereumProvider {
  public isUniversalWallet = true
  public isMetaMask = false // 兼容性标识
  public chainId = '0x1' // Ethereum mainnet
  public selectedAddress: string | null = null
  public networkVersion = '1'

  private accounts: string[] = []
  private isConnected = false

  constructor() {
    super()
    this.initialize()
    this.setupEventListeners()
  }

  private async initialize() {
    console.log('Universal Wallet: Initializing provider...')
    // 延迟获取账户状态，确保消息通信已建立
    // 注意：这里只获取账户信息，不自动设置连接状态
    // 连接状态需要用户明确授权后才设置为true
    setTimeout(async () => {
      try {
        const savedAccounts = await this.getStoredAccounts()
        if (savedAccounts.length > 0) {
          this.accounts = savedAccounts
          // selectedAddress已经在getStoredAccounts中根据后台响应设置了
          // 如果没有设置，才使用第一个账户作为fallback
          if (!this.selectedAddress) {
            this.selectedAddress = savedAccounts[0]
          }
          // 不自动设置为已连接，需要用户重新授权
          // this.isConnected = true
          console.log('Universal Wallet: Accounts loaded (not connected):', this.accounts, 'Selected:', this.selectedAddress)
        }
      } catch (error) {
        console.log('Universal Wallet: Failed to load accounts from storage, will request on first use')
      }
    }, 500)
  }

  private setupEventListeners() {
    // 监听来自content script的事件广播
    window.addEventListener('message', (event) => {
      // 只处理来自同源的消息
      if (event.source !== window) return

      const message = event.data

      if (message.type === 'UNIVERSAL_WALLET_ACCOUNTS_CHANGED') {
        this.handleAccountsChangedEvent(message.accounts, message.selectedAddress)
      } else if (message.type === 'UNIVERSAL_WALLET_CHAIN_CHANGED') {
        this.handleChainChangedEvent(message.chainId)
      }
    })
  }

  private handleAccountsChangedEvent(accounts: string[], selectedAddress?: string) {
    console.log('Universal Wallet: Received accountsChanged event:', accounts, 'Selected:', selectedAddress)

    // 更新本地状态
    const previousAccounts = this.accounts
    this.accounts = accounts

    // 更新选中地址
    if (selectedAddress && accounts.includes(selectedAddress)) {
      this.selectedAddress = selectedAddress
    } else {
      this.selectedAddress = accounts[0] || null
    }

    // 如果账户列表发生变化，发出事件
    if (JSON.stringify(previousAccounts) !== JSON.stringify(accounts)) {
      // 确保当前选中的账户排在第一位
      let accountsToEmit = accounts
      if (this.selectedAddress && accounts.includes(this.selectedAddress)) {
        accountsToEmit = [this.selectedAddress, ...accounts.filter(acc => acc !== this.selectedAddress)]
      }

      this.emit('accountsChanged', accountsToEmit)
      console.log('Universal Wallet: Emitted accountsChanged event:', accountsToEmit)
    }
  }

  private handleChainChangedEvent(chainId: string) {
    console.log('Universal Wallet: Received chainChanged event:', chainId)

    // 更新本地状态
    const previousChainId = this.chainId
    this.chainId = chainId
    this.networkVersion = parseInt(chainId, 16).toString()

    // 如果网络ID发生变化，发出事件
    if (previousChainId !== chainId) {
      this.emit('chainChanged', chainId)
      console.log('Universal Wallet: Emitted chainChanged event:', chainId)
    }
  }

  async request(args: RequestArguments): Promise<any> {
    const { method, params = [] } = args

    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return this.handleAccountsRequest()

      case 'eth_chainId':
        return this.chainId

      case 'net_version':
        return this.networkVersion

      case 'eth_getBalance':
        return this.handleGetBalance(params[0], params[1])

      case 'eth_sendTransaction':
        return this.handleSendTransaction(params[0])

      case 'personal_sign':
        return this.handlePersonalSign(params[0], params[1])

      case 'eth_signTypedData_v4':
        return this.handleSignTypedData(params[0], params[1])

      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params[0])

      case 'wallet_addEthereumChain':
        return this.handleAddChain(params[0])

      case 'wallet_revokePermissions':
        return this.handleRevokePermissions(params[0])

      case 'wallet_getPermissions':
        return this.handleGetPermissions()

      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  }

  async enable(): Promise<string[]> {
    return this.handleAccountsRequest()
  }

  async send(method: string, params?: any[]): Promise<any> {
    return this.request({ method, params })
  }

  sendAsync(payload: any, callback: (error: any, result: any) => void): void {
    this.request(payload)
      .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
      .catch(error => callback(error, null))
  }

  private async handleAccountsRequest(): Promise<string[]> {
    if (!this.isConnected) {
      // 请求用户授权
      const approval = await this.requestUserApproval()
      if (!approval) {
        throw new Error('User rejected the request')
      }
      this.isConnected = true

      // 授权成功后立即获取最新的账户信息
      try {
        const latestAccounts = await this.getStoredAccounts()
        if (latestAccounts.length > 0) {
          this.accounts = latestAccounts
          // selectedAddress已经在getStoredAccounts中根据后台响应设置了
          // 如果没有设置，才使用第一个账户作为fallback
          if (!this.selectedAddress) {
            this.selectedAddress = latestAccounts[0]
          }
          this.emit('accountsChanged', this.accounts)
          console.log('Universal Wallet: Accounts updated after authorization:', this.accounts, 'Selected:', this.selectedAddress)
        }
      } catch (error) {
        console.error('Universal Wallet: Failed to get accounts after authorization:', error)
      }
    }

    // 如果accounts为空，再次尝试获取
    if (this.accounts.length === 0) {
      try {
        const accounts = await this.getStoredAccounts()
        if (accounts.length > 0) {
          this.accounts = accounts
          // selectedAddress已经在getStoredAccounts中根据后台响应设置了
          // 如果没有设置，才使用第一个账户作为fallback
          if (!this.selectedAddress) {
            this.selectedAddress = accounts[0]
          }
          this.emit('accountsChanged', this.accounts)
        }
      } catch (error) {
        console.error('Universal Wallet: Failed to get accounts:', error)
      }
    }

    // 返回账户列表，确保当前选中的账户排在第一位
    if (this.selectedAddress && this.accounts.includes(this.selectedAddress)) {
      const reorderedAccounts = [this.selectedAddress, ...this.accounts.filter(acc => acc !== this.selectedAddress)]
      return reorderedAccounts
    }
    return this.accounts
  }

  private async handleGetBalance(address: string, blockTag: string): Promise<string> {
    // 通过RPC获取余额
    return this.callRPC('eth_getBalance', [address, blockTag])
  }

  private async handleSendTransaction(transaction: any): Promise<string> {
    // 显示交易确认弹窗
    const approval = await this.requestTransactionApproval(transaction)
    if (!approval) {
      throw new Error('User rejected transaction')
    }

    // 签名并发送交易
    return this.signAndSendTransaction(transaction)
  }

  private async handlePersonalSign(message: string, address: string): Promise<string> {
    // 显示签名确认弹窗
    const approval = await this.requestSignApproval(message, address)
    if (!approval) {
      throw new Error('User rejected signature')
    }

    // 执行签名
    return this.signMessage(message, address)
  }

  private async handleSignTypedData(address: string, typedData: string): Promise<string> {
    // 显示类型化数据签名确认弹窗
    const approval = await this.requestTypedDataSignApproval(typedData, address)
    if (!approval) {
      throw new Error('User rejected signature')
    }

    // 执行类型化数据签名
    return this.signTypedData(address, typedData)
  }

  private async handleSwitchChain(chainParams: any): Promise<null> {
    const chainId = chainParams.chainId
    // 切换网络逻辑
    await this.switchNetwork(chainId)
    return null
  }

  private async handleAddChain(chainParams: any): Promise<null> {
    // 添加新网络逻辑
    await this.addNetwork(chainParams)
    return null
  }

  private async handleRevokePermissions(permissions: any): Promise<null> {
    // 撤销权限，断开连接
    await this.sendRevokePermissions(permissions)
    this.disconnect()
    return null
  }

  private async handleGetPermissions(): Promise<any[]> {
    // 从后台获取权限状态
    const permissions = await this.sendGetPermissions()
    return permissions
  }

  // 辅助方法 - 通过窗口消息与content script通信
  private async requestUserApproval(): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          const response = event.data.response

          // 如果授权成功且返回了账户信息，立即更新本地状态
          if (response.approved && response.accounts && response.accounts.length > 0) {
            this.accounts = response.accounts
            // 使用后台返回的selectedAddress，如果没有则使用第一个账户
            this.selectedAddress = response.selectedAddress || response.accounts[0]
            this.emit('accountsChanged', this.accounts)
            console.log('Universal Wallet: Accounts updated from authorization response:', this.accounts, 'Selected:', this.selectedAddress)
          }

          resolve(response.approved)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_REQUEST_CONNECTION',
        id: messageId
      }, '*')
    })
  }

  private async requestTransactionApproval(transaction: any): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.approved)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_REQUEST_TRANSACTION',
        id: messageId,
        transaction
      }, '*')
    })
  }

  private async requestSignApproval(message: string, address: string): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.approved)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_REQUEST_SIGN',
        id: messageId,
        message,
        address
      }, '*')
    })
  }

  private async requestTypedDataSignApproval(typedData: string, address: string): Promise<boolean> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.approved)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_REQUEST_TYPED_DATA_SIGN',
        id: messageId,
        typedData,
        address
      }, '*')
    })
  }

  private async callRPC(method: string, params: any[]): Promise<any> {
    // 调用以太坊RPC
    const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/574138be66974922bc4c949d5b1282ae')
    return provider.send(method, params)
  }

  private async signAndSendTransaction(transaction: any): Promise<string> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.txHash)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_SIGN_TRANSACTION',
        id: messageId,
        transaction
      }, '*')
    })
  }

  private async signMessage(message: string, address: string): Promise<string> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.signature)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_SIGN_MESSAGE',
        id: messageId,
        message,
        address
      }, '*')
    })
  }

  private async signTypedData(address: string, typedData: string): Promise<string> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.signature)
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_SIGN_TYPED_DATA',
        id: messageId,
        typedData,
        address
      }, '*')
    })
  }

  private async switchNetwork(chainId: string): Promise<void> {
    this.chainId = chainId
    this.networkVersion = parseInt(chainId, 16).toString()
    this.emit('chainChanged', chainId)
  }

  private async addNetwork(chainParams: any): Promise<void> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve()
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_ADD_NETWORK',
        id: messageId,
        chainParams
      }, '*')
    })
  }

  private async getStoredAccounts(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      // 设置超时时间
      const timeout = setTimeout(() => {
        window.removeEventListener('message', handler)
        reject(new Error('Timeout waiting for accounts response'))
      }, 3000)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          clearTimeout(timeout)

          if (event.data.response.error) {
            reject(new Error(event.data.response.error))
          } else {
            // 如果响应包含selectedAddress，更新选中地址
            const accounts = event.data.response.accounts || []
            if (event.data.response.selectedAddress && accounts.includes(event.data.response.selectedAddress)) {
              this.selectedAddress = event.data.response.selectedAddress
              console.log('Universal Wallet: Selected address updated to:', this.selectedAddress)
            }
            resolve(accounts)
          }
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_GET_ACCOUNTS',
        id: messageId
      }, '*')
    })
  }

  private async sendRevokePermissions(permissions: any): Promise<void> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve()
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_REVOKE_PERMISSIONS',
        id: messageId,
        permissions
      }, '*')
    })
  }

  private async sendGetPermissions(): Promise<any[]> {
    return new Promise((resolve) => {
      const messageId = Math.random().toString(36).substr(2, 9)

      const handler = (event: MessageEvent) => {
        if (event.data.type === 'UNIVERSAL_WALLET_RESPONSE' && event.data.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(event.data.response.permissions || [])
        }
      }

      window.addEventListener('message', handler)
      window.postMessage({
        type: 'UNIVERSAL_WALLET_GET_PERMISSIONS',
        id: messageId
      }, '*')
    })
  }

  // 公共方法，供钱包UI调用
  public setAccounts(accounts: string[]) {
    const previousAccounts = this.accounts
    this.accounts = accounts
    this.selectedAddress = accounts[0] || null

    if (JSON.stringify(previousAccounts) !== JSON.stringify(accounts)) {
      this.emit('accountsChanged', accounts)
    }
  }

  public setChainId(chainId: string) {
    if (this.chainId !== chainId) {
      this.chainId = chainId
      this.networkVersion = parseInt(chainId, 16).toString()
      this.emit('chainChanged', chainId)
    }
  }

  // 断开连接方法
  public disconnect() {
    console.log('Universal Wallet: Disconnecting...')
    this.isConnected = false
    this.accounts = []
    this.selectedAddress = null
    this.emit('accountsChanged', [])
    this.emit('disconnect', { code: 4900, message: 'User disconnected' })
  }

  // 检查是否已连接
  public get connected(): boolean {
    return this.isConnected && this.accounts.length > 0
  }
}

export default UniversalWalletProvider