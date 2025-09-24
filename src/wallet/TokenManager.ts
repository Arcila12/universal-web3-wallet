import browser from 'webextension-polyfill'

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  chainId: string
  balance?: string
  isCustom?: boolean
}

export interface AccountTokens {
  [accountAddress: string]: {
    [chainId: string]: Token[]
  }
}

class TokenManager {
  private static instance: TokenManager
  private tokens: AccountTokens = {}
  private storageKey = 'account_tokens'

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  async initialize(): Promise<void> {
    console.log('TokenManager: Initializing...')
    await this.loadFromStorage()
    console.log('TokenManager: Initialized')
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await browser.storage.local.get(this.storageKey)
      this.tokens = result[this.storageKey] || {}
      console.log('TokenManager: Loaded tokens from storage:', this.tokens)
    } catch (error) {
      console.error('TokenManager: Failed to load from storage:', error)
      this.tokens = {}
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await browser.storage.local.set({ [this.storageKey]: this.tokens })
      console.log('TokenManager: Saved tokens to storage')
    } catch (error) {
      console.error('TokenManager: Failed to save to storage:', error)
    }
  }

  // 获取指定账户和链的Token列表
  getTokens(accountAddress: string, chainId: string): Token[] {
    if (!this.tokens[accountAddress] || !this.tokens[accountAddress][chainId]) {
      return []
    }
    return this.tokens[accountAddress][chainId] || []
  }

  // 添加Token到指定账户和链
  async addToken(accountAddress: string, chainId: string, token: Omit<Token, 'chainId'>): Promise<boolean> {
    try {
      // 确保账户和链ID存在
      if (!this.tokens[accountAddress]) {
        this.tokens[accountAddress] = {}
      }
      if (!this.tokens[accountAddress][chainId]) {
        this.tokens[accountAddress][chainId] = []
      }

      const tokenList = this.tokens[accountAddress][chainId]

      // 检查Token是否已存在
      const exists = tokenList.some(t => t.address.toLowerCase() === token.address.toLowerCase())
      if (exists) {
        console.log('TokenManager: Token already exists:', token.address)
        return false
      }

      // 添加Token
      const newToken: Token = {
        ...token,
        chainId,
        address: token.address.toLowerCase(),
        isCustom: true
      }

      tokenList.push(newToken)
      await this.saveToStorage()

      console.log('TokenManager: Added token:', newToken)
      return true
    } catch (error) {
      console.error('TokenManager: Failed to add token:', error)
      return false
    }
  }

  // 移除Token
  async removeToken(accountAddress: string, chainId: string, tokenAddress: string): Promise<boolean> {
    try {
      if (!this.tokens[accountAddress] || !this.tokens[accountAddress][chainId]) {
        return false
      }

      const tokenList = this.tokens[accountAddress][chainId]
      const index = tokenList.findIndex(t => t.address.toLowerCase() === tokenAddress.toLowerCase())

      if (index === -1) {
        console.log('TokenManager: Token not found:', tokenAddress)
        return false
      }

      tokenList.splice(index, 1)
      await this.saveToStorage()

      console.log('TokenManager: Removed token:', tokenAddress)
      return true
    } catch (error) {
      console.error('TokenManager: Failed to remove token:', error)
      return false
    }
  }

  // 更新Token余额
  async updateTokenBalance(accountAddress: string, chainId: string, tokenAddress: string, balance: string): Promise<void> {
    try {
      if (!this.tokens[accountAddress] || !this.tokens[accountAddress][chainId]) {
        return
      }

      const tokenList = this.tokens[accountAddress][chainId]
      const token = tokenList.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())

      if (token) {
        token.balance = balance
        await this.saveToStorage()
        console.log('TokenManager: Updated token balance:', tokenAddress, balance)
      }
    } catch (error) {
      console.error('TokenManager: Failed to update token balance:', error)
    }
  }

  // 获取默认Token列表（常用Token）
  getPopularTokens(chainId: string): Token[] {
    const popularTokens: { [chainId: string]: Token[] } = {
      '0x1': [ // Ethereum Mainnet
        {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          chainId: '0x1',
          isCustom: false
        },
        {
          address: '0xA0b86a33E6441019Faa8Ec161C7bd8D33B8f7e1e',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: '0x1',
          isCustom: false
        },
        {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          symbol: 'LINK',
          name: 'ChainLink Token',
          decimals: 18,
          chainId: '0x1',
          isCustom: false
        },
        {
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          symbol: 'WBTC',
          name: 'Wrapped BTC',
          decimals: 8,
          chainId: '0x1',
          isCustom: false
        },
        {
          address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          symbol: 'UNI',
          name: 'Uniswap',
          decimals: 18,
          chainId: '0x1',
          isCustom: false
        }
      ],
      '0x89': [ // Polygon
        {
          address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
          symbol: 'USDT',
          name: 'Tether USD (PoS)',
          decimals: 6,
          chainId: '0x89',
          isCustom: false
        },
        {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          symbol: 'USDC',
          name: 'USD Coin (PoS)',
          decimals: 6,
          chainId: '0x89',
          isCustom: false
        },
        {
          address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
          symbol: 'LINK',
          name: 'ChainLink Token',
          decimals: 18,
          chainId: '0x89',
          isCustom: false
        }
      ],
      '0x38': [ // BSC
        {
          address: '0x55d398326f99059fF775485246999027B3197955',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 18,
          chainId: '0x38',
          isCustom: false
        },
        {
          address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 18,
          chainId: '0x38',
          isCustom: false
        },
        {
          address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
          symbol: 'BUSD',
          name: 'Binance USD',
          decimals: 18,
          chainId: '0x38',
          isCustom: false
        }
      ]
    }

    return popularTokens[chainId] || []
  }

  // 获取所有账户的Token
  getAllTokens(): AccountTokens {
    return this.tokens
  }

  // 清除指定账户的Token
  async clearAccountTokens(accountAddress: string): Promise<void> {
    try {
      delete this.tokens[accountAddress]
      await this.saveToStorage()
      console.log('TokenManager: Cleared tokens for account:', accountAddress)
    } catch (error) {
      console.error('TokenManager: Failed to clear account tokens:', error)
    }
  }
}

export default TokenManager