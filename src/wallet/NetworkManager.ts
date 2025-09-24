import browser from 'webextension-polyfill'

export interface Network {
  id: string
  chainId: string
  name: string
  rpcUrl: string
  symbol: string
  blockExplorerUrl?: string
  isMainnet?: boolean
  isTestnet?: boolean
  isDefault?: boolean
  category?: 'mainnet' | 'testnet'
}

export class NetworkManager {
  private static instance: NetworkManager
  private networks: Network[] = []

  private constructor() {
    this.initializeDefaultNetworks()
  }

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager()
    }
    return NetworkManager.instance
  }

  private initializeDefaultNetworks() {
    this.networks = [
      // Mainnet Networks
      {
        id: 'ethereum-mainnet',
        chainId: '0x1',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        symbol: 'ETH',
        blockExplorerUrl: 'https://etherscan.io',
        isMainnet: true,
        isDefault: true,
        category: 'mainnet'
      },
      {
        id: 'polygon-mainnet',
        chainId: '0x89',
        name: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        symbol: 'MATIC',
        blockExplorerUrl: 'https://polygonscan.com',
        isDefault: true,
        category: 'mainnet'
      },
      {
        id: 'bsc-mainnet',
        chainId: '0x38',
        name: 'BSC Mainnet',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        symbol: 'BNB',
        blockExplorerUrl: 'https://bscscan.com',
        isDefault: true,
        category: 'mainnet'
      },
      {
        id: 'base-mainnet',
        chainId: '0x2105',
        name: 'Base Mainnet',
        rpcUrl: 'https://mainnet.base.org',
        symbol: 'ETH',
        blockExplorerUrl: 'https://basescan.org',
        isDefault: true,
        category: 'mainnet'
      },
      {
        id: 'linea-mainnet',
        chainId: '0xe708',
        name: 'Linea Mainnet',
        rpcUrl: 'https://rpc.linea.build',
        symbol: 'ETH',
        blockExplorerUrl: 'https://lineascan.build',
        isDefault: true,
        category: 'mainnet'
      },
      {
        id: 'solana-mainnet',
        chainId: '0x195',
        name: 'Solana Mainnet',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        symbol: 'SOL',
        blockExplorerUrl: 'https://explorer.solana.com',
        isDefault: true,
        category: 'mainnet'
      },

      // Testnet Networks
      {
        id: 'ethereum-sepolia',
        chainId: '0xaa36a7',
        name: 'Sepolia Testnet',
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        symbol: 'SepoliaETH',
        blockExplorerUrl: 'https://sepolia.etherscan.io',
        isTestnet: true,
        isDefault: true,
        category: 'testnet'
      },
      {
        id: 'bsc-testnet',
        chainId: '0x61',
        name: 'BSC Testnet',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
        symbol: 'tBNB',
        blockExplorerUrl: 'https://testnet.bscscan.com',
        isTestnet: true,
        isDefault: true,
        category: 'testnet'
      }
    ]
  }

  async initialize(): Promise<void> {
    console.log('NetworkManager: Initializing...')
    console.log('NetworkManager: Initial networks count:', this.networks.length)

    // 从存储中恢复网络配置
    const stored = await this.getStoredNetworks()
    console.log('NetworkManager: Stored networks:', stored)

    // 总是合并默认网络和存储的自定义网络
    const defaultNetworks = this.networks.filter(n => n.isDefault || n.isMainnet || n.isTestnet)
    const customNetworks = stored ? stored.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet) : []
    this.networks = [...defaultNetworks, ...customNetworks]

    console.log('NetworkManager: Final networks count:', this.networks.length)
    console.log('NetworkManager: Final networks:', this.networks.map(n => ({ id: n.id, name: n.name, category: n.category })))
  }

  async addNetwork(network: Omit<Network, 'id'>): Promise<Network> {
    // 检查是否已存在相同的 chainId
    const existingNetwork = this.networks.find(n => n.chainId === network.chainId)
    if (existingNetwork) {
      throw new Error('Network with this chain ID already exists')
    }

    const newNetwork: Network = {
      ...network,
      id: `custom-${Date.now()}`,
      isDefault: false
    }

    this.networks.push(newNetwork)
    await this.saveNetworks()
    return newNetwork
  }

  async updateNetwork(id: string, updates: Partial<Omit<Network, 'id' | 'isDefault'>>): Promise<Network> {
    const networkIndex = this.networks.findIndex(n => n.id === id)
    if (networkIndex === -1) {
      throw new Error('Network not found')
    }

    const network = this.networks[networkIndex]

    // 检查是否为主网、测试网或默认网络
    if (network.isMainnet || network.isTestnet || network.isDefault) {
      throw new Error('Cannot modify default, mainnet or testnet networks')
    }

    // 如果更新 chainId，检查是否与其他网络冲突
    if (updates.chainId && updates.chainId !== network.chainId) {
      const existingNetwork = this.networks.find(n => n.chainId === updates.chainId && n.id !== id)
      if (existingNetwork) {
        throw new Error('Network with this chain ID already exists')
      }
    }

    this.networks[networkIndex] = { ...network, ...updates }
    await this.saveNetworks()
    return this.networks[networkIndex]
  }

  async removeNetwork(id: string): Promise<void> {
    const network = this.networks.find(n => n.id === id)
    if (!network) {
      throw new Error('Network not found')
    }

    // 检查是否为主网、测试网或默认网络
    if (network.isMainnet || network.isTestnet || network.isDefault) {
      throw new Error('Cannot remove default, mainnet or testnet networks')
    }

    this.networks = this.networks.filter(n => n.id !== id)
    await this.saveNetworks()
  }

  getNetworks(): Network[] {
    return [...this.networks]
  }

  getNetworkById(id: string): Network | null {
    return this.networks.find(n => n.id === id) || null
  }

  getNetworkByChainId(chainId: string): Network | null {
    return this.networks.find(n => n.chainId === chainId) || null
  }

  getDefaultNetwork(): Network {
    return this.networks.find(n => n.isMainnet) || this.networks[0]
  }

  private async getStoredNetworks(): Promise<Network[]> {
    const result = await browser.storage.local.get(['networks'])
    return result.networks || []
  }

  private async saveNetworks(): Promise<void> {
    // 只保存自定义网络到存储
    const customNetworks = this.networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet)
    await browser.storage.local.set({ networks: customNetworks })
  }

  getMainnetNetworks(): Network[] {
    return this.networks.filter(n => n.category === 'mainnet' || n.isMainnet)
  }

  getTestnetNetworks(): Network[] {
    return this.networks.filter(n => n.category === 'testnet' || n.isTestnet)
  }

  getCustomNetworks(): Network[] {
    return this.networks.filter(n => !n.isDefault && !n.isMainnet && !n.isTestnet)
  }
}