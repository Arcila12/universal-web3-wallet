import { ethers } from 'ethers'
import * as bip39 from 'bip39'
import { encrypt, decrypt } from 'crypto-js/aes'
import { enc } from 'crypto-js'
import browser from 'webextension-polyfill'
import { NetworkManager } from './NetworkManager'
const INFRA_KEY='574138be66974922bc4c949d5b1282ae'
export interface WalletAccount {
  address: string
  privateKey: string
  name: string
  index: number
  type: 'derived' | 'imported'
}

export interface WalletState {
  isLocked: boolean
  hasWallet: boolean
  accounts: WalletAccount[]
  currentAccountIndex: number
  network: {
    chainId: string
    name: string
    rpcUrl: string
  }
}

export class WalletManager {
  private static instance: WalletManager
  private state: WalletState
  private password: string | null = null
  private mnemonic: string | null = null

  private constructor() {
    this.state = {
      isLocked: true,
      hasWallet: false,
      accounts: [],
      currentAccountIndex: 0,
      network: {
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        rpcUrl: `https://mainnet.infura.io/v3/${INFRA_KEY}`
      }
    }
  }

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager()
    }
    return WalletManager.instance
  }

  async initialize(): Promise<void> {
    // 从存储中恢复钱包状态
    const stored = await this.getStoredData()
    if (stored.encryptedMnemonic) {
      this.state.hasWallet = true
    }
  }

  async createWallet(password: string): Promise<string> {
    try {
      console.log('WalletManager: Starting createWallet...')

      if (this.state.hasWallet) {
        throw new Error('Wallet already exists')
      }

      // 生成助记词
      const mnemonic = bip39.generateMnemonic()
      console.log('WalletManager: Generated mnemonic')

      this.mnemonic = mnemonic
      this.password = password

      // 解锁钱包以便创建账户
      this.state.hasWallet = true
      this.state.isLocked = false

      // 加密存储助记词
      const encryptedMnemonic = encrypt(mnemonic, password).toString()
      await this.saveToStorage({ encryptedMnemonic })
      console.log('WalletManager: Saved encrypted mnemonic')

      // 创建第一个账户
      console.log('WalletManager: About to create first account')
      const account = await this.createAccount('Account 1')
      console.log('WalletManager: Created account:', account.address)

      console.log('WalletManager: Wallet creation completed. Accounts count:', this.state.accounts.length)
      return mnemonic
    } catch (error) {
      console.error('WalletManager: Error in createWallet:', error)
      throw error
    }
  }

  async importWallet(mnemonic: string, password: string): Promise<void> {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }

    this.mnemonic = mnemonic
    this.password = password

    // 加密存储助记词
    const encryptedMnemonic = encrypt(mnemonic, password).toString()
    await this.saveToStorage({ encryptedMnemonic })

    // 创建第一个账户
    await this.createAccount('Account 1')

    this.state.hasWallet = true
    this.state.isLocked = false
  }

  async unlock(password: string): Promise<boolean> {
    if (!this.state.hasWallet) {
      throw new Error('No wallet found')
    }

    try {
      const stored = await this.getStoredData()
      if (!stored.encryptedMnemonic) {
        throw new Error('No encrypted wallet found')
      }

      // 解密助记词
      const decryptedBytes = decrypt(stored.encryptedMnemonic, password)
      const mnemonic = decryptedBytes.toString(enc.Utf8)

      if (!bip39.validateMnemonic(mnemonic)) {
        return false
      }

      this.mnemonic = mnemonic
      this.password = password
      this.state.isLocked = false

      // 恢复账户
      await this.restoreAccounts()

      return true
    } catch (error) {
      return false
    }
  }

  lock(): void {
    this.password = null
    this.mnemonic = null
    this.state.isLocked = true
    this.state.accounts = []
  }

  async createAccount(name: string): Promise<WalletAccount> {
    console.log('WalletManager: createAccount called with name:', name)
    console.log('WalletManager: isLocked:', this.state.isLocked)
    console.log('WalletManager: has mnemonic:', !!this.mnemonic)

    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }
    if(!this.mnemonic){
      throw new Error('No mnemonic available')
    }

    // 计算下一个助记词账户的索引（只计算derived类型的账户）
    const derivedAccounts = this.state.accounts.filter(acc => acc.type === 'derived')
    const index = derivedAccounts.length
    console.log('WalletManager: Creating derived account at index:', index)

    const hdNode = ethers.HDNodeWallet.fromPhrase(this.mnemonic, undefined, `m/44'/60'/0'/0/${index}`)
    console.log('WalletManager: Generated HD node address:', hdNode.address)

    const account: WalletAccount = {
      address: hdNode.address,
      privateKey: hdNode.privateKey,
      name,
      index,
      type: 'derived'
    }

    this.state.accounts.push(account)
    console.log('WalletManager: Added account to state. Total accounts:', this.state.accounts.length)

    await this.saveAccountsToStorage()
    console.log('WalletManager: Saved accounts to storage')

    return account
  }

  async importAccountFromPrivateKey(name: string, privateKey: string): Promise<WalletAccount> {
    console.log('WalletManager: importAccountFromPrivateKey called with name:', name)

    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    // 验证私钥格式
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey
    }

    try {
      // 使用ethers验证私钥并获取地址
      const wallet = new ethers.Wallet(privateKey)
      const address = wallet.address

      // 检查是否已存在相同地址的账户
      const existingAccount = this.state.accounts.find(acc => acc.address.toLowerCase() === address.toLowerCase())
      if (existingAccount) {
        throw new Error('Account with this address already exists')
      }

      // 生成唯一的账户索引（对于导入账户，索引为负数以区分）
      const importedAccounts = this.state.accounts.filter(acc => acc.type === 'imported')
      const index = -(importedAccounts.length + 1)

      const account: WalletAccount = {
        address,
        privateKey,
        name,
        index,
        type: 'imported'
      }

      this.state.accounts.push(account)
      console.log('WalletManager: Added imported account to state. Total accounts:', this.state.accounts.length)

      await this.saveAccountsToStorage()
      console.log('WalletManager: Saved accounts to storage')

      return account
    } catch (error) {
      console.error('WalletManager: Error importing private key:', error)
      throw new Error('Invalid private key')
    }
  }

  async signTransaction(transaction: any): Promise<string> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    const currentAccount = this.getCurrentAccount()
    if (!currentAccount) {
      throw new Error('No account selected')
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey)
    const signedTx = await wallet.signTransaction(transaction)

    return signedTx
  }

  async signMessage(message: string): Promise<string> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    const currentAccount = this.getCurrentAccount()
    if (!currentAccount) {
      throw new Error('No account selected')
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey)
    const signature = await wallet.signMessage(message)

    return signature
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    const currentAccount = this.getCurrentAccount()
    if (!currentAccount) {
      throw new Error('No account selected')
    }

    const wallet = new ethers.Wallet(currentAccount.privateKey)
    const signature = await wallet.signTypedData(domain, types, value)

    return signature
  }

  getCurrentAccount(): WalletAccount | null {
    return this.state.accounts[this.state.currentAccountIndex] || null
  }

  getAccounts(): WalletAccount[] {
    return this.state.accounts
  }

  getState(): WalletState {
    console.log('WalletManager: getState called')
    console.log('WalletManager: Current state:', {
      hasWallet: this.state.hasWallet,
      isLocked: this.state.isLocked,
      accountsCount: this.state.accounts.length,
      currentAccountIndex: this.state.currentAccountIndex
    })
    return { ...this.state }
  }

  switchAccount(index: number): void {
    if (index >= 0 && index < this.state.accounts.length) {
      this.state.currentAccountIndex = index
    }
  }

  async switchNetwork(chainId: string, name: string, rpcUrl: string): Promise<void> {
    // 验证网络是否存在
    const networkManager = NetworkManager.getInstance()
    const network = networkManager.getNetworkByChainId(chainId)

    if (network) {
      this.state.network = { chainId: network.chainId, name: network.name, rpcUrl: network.rpcUrl }
    } else {
      this.state.network = { chainId, name, rpcUrl }
    }

    await this.saveNetworkToStorage()
  }

  async getPrivateKey(password: string, accountIndex: number): Promise<string> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    // 验证密码
    if (this.password !== password) {
      throw new Error('Incorrect password')
    }

    const account = this.state.accounts[accountIndex]
    if (!account) {
      throw new Error('Account not found')
    }

    return account.privateKey
  }

  async getMnemonic(password: string): Promise<string> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    // 验证密码
    if (this.password !== password) {
      throw new Error('Incorrect password')
    }

    if (!this.mnemonic) {
      throw new Error('Mnemonic not available')
    }

    return this.mnemonic
  }

  async renameAccount(accountIndex: number, newName: string): Promise<void> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked')
    }

    if (accountIndex < 0 || accountIndex >= this.state.accounts.length) {
      throw new Error('Invalid account index')
    }

    if (!newName || newName.trim().length === 0) {
      throw new Error('Account name cannot be empty')
    }

    this.state.accounts[accountIndex].name = newName.trim()
    await this.saveAccountsToStorage()
  }

  private async restoreAccounts(): Promise<void> {
    const stored = await this.getStoredData()
    if (stored.accounts) {
      this.state.accounts = stored.accounts
      this.state.currentAccountIndex = stored.currentAccountIndex || 0
    }

    if (stored.network) {
      this.state.network = stored.network
    }
  }

  private async saveAccountsToStorage(): Promise<void> {
    const data = await this.getStoredData()
    data.accounts = this.state.accounts
    data.currentAccountIndex = this.state.currentAccountIndex
    await this.saveToStorage(data)
  }

  private async saveNetworkToStorage(): Promise<void> {
    const data = await this.getStoredData()
    data.network = this.state.network
    await this.saveToStorage(data)
  }

  private async getStoredData(): Promise<any> {
    const result = await browser.storage.local.get(['walletData'])
    return result.walletData || {}
  }

  private async saveToStorage(data: any): Promise<void> {
    await browser.storage.local.set({ walletData: data })
  }
}