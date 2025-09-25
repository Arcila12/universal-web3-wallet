import { ethers } from 'ethers'

// ERC-20标准接口ABI
const ERC20_ABI = [
  // name() -> string
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  // symbol() -> string
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  // decimals() -> uint8
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  // balanceOf(address) -> uint256
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  }
]

export interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  isValid: boolean
}

export interface NetworkConfig {
  chainId: string
  rpcUrl: string
}

// 默认RPC配置
const DEFAULT_RPC_CONFIGS: { [chainId: string]: string } = {
  '0x1': 'https://ethereum-rpc.publicnode.com',     // Ethereum Mainnet
  '0x89': 'https://polygon-rpc.com',                // Polygon
  '0xa86a': 'https://api.avax.network/ext/bc/C/rpc', // Avalanche
  '0x38': 'https://bsc-dataseed1.binance.org',      // BSC
  '0xa4b1': 'https://arb1.arbitrum.io/rpc',         // Arbitrum One
  '0xa': 'https://mainnet.optimism.io',             // Optimism
  '0x64': 'https://gnosis-rpc.publicnode.com',      // Gnosis
  // Testnets
  '0xaa36a7': 'https://ethereum-sepolia-rpc.publicnode.com', // Sepolia
  '0x13882': 'https://rpc.ankr.com/polygon_mumbai', // Mumbai
  '0x61': 'https://data-seed-prebsc-1-s1.binance.org:8545', // BSC Testnet
}

export class TokenInfoFetcher {
  // BSC Testnet备用RPC URLs
  private BSC_TESTNET_RPCS = [
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
    'https://bsc-testnet.public.blastapi.io',
    'https://bsc-testnet-rpc.publicnode.com'
  ]

  private getProvider(chainId: string, customRpcUrl?: string): ethers.JsonRpcProvider {
    const rpcUrl = customRpcUrl || DEFAULT_RPC_CONFIGS[chainId]
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${chainId}`)
    }

    return new ethers.JsonRpcProvider(rpcUrl)
  }

  private async getProviderWithFallback(chainId: string, customRpcUrl?: string): Promise<ethers.JsonRpcProvider> {
    if (customRpcUrl) {
      return new ethers.JsonRpcProvider(customRpcUrl)
    }

    // 对于BSC testnet，尝试多个RPC
    if (chainId === '0x61') {
      for (const rpcUrl of this.BSC_TESTNET_RPCS) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl)
          // 测试连接
          await provider.getBlockNumber()
          console.log(`TokenInfoFetcher: Successfully connected to BSC testnet via ${rpcUrl}`)
          return provider
        } catch (error) {
          console.warn(`TokenInfoFetcher: Failed to connect to ${rpcUrl}:`, error)
          continue
        }
      }
      throw new Error('All BSC testnet RPC URLs failed')
    }

    return this.getProvider(chainId, customRpcUrl)
  }

  async getTokenInfo(
    tokenAddress: string,
    chainId: string,
    customRpcUrl?: string,
    timeout: number = 10000
  ): Promise<TokenInfo> {
    console.log(`TokenInfoFetcher: Getting token info for ${tokenAddress} on chain ${chainId}`)
    if (!this.isValidAddress(tokenAddress)) {
      console.warn(`TokenInfoFetcher: Invalid token address: ${tokenAddress}`)
      return {
        name: '',
        symbol: '',
        decimals: 18,
        isValid: false
      }
    }

    try {
      const provider = await this.getProviderWithFallback(chainId, customRpcUrl)
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

      // 先检查合约是否存在
      const code = await provider.getCode(tokenAddress)
      if (code === '0x') {
        console.warn(`TokenInfoFetcher: No contract found at address ${tokenAddress}`)
        return {
          name: '',
          symbol: '',
          decimals: 18,
          isValid: false
        }
      }

      console.log(`TokenInfoFetcher: Contract exists, fetching token info...`)

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })

      // 并行调用name, symbol, decimals
      const results = await Promise.race([
        Promise.all([
          this.safeCall(contract.name()),
          this.safeCall(contract.symbol()),
          this.safeCall(contract.decimals())
        ]),
        timeoutPromise
      ])

      const [name, symbol, decimals] = results as [string | null, string | null, bigint | null]

      console.log(`TokenInfoFetcher: Retrieved data - name: ${name}, symbol: ${symbol}, decimals: ${decimals}`)

      // 验证获取到的数据
      const validName = name || ''
      const validSymbol = symbol || ''
      const validDecimals = typeof decimals === 'bigint' ? Number(decimals) : 18

      // 只有当name、symbol、decimals都成功获取到时，才认为是有效的
      const isValid = name && symbol && typeof decimals === 'bigint' ? true : false

      console.log(`TokenInfoFetcher: Token info - name: "${validName}", symbol: "${validSymbol}", decimals: ${validDecimals}, isValid: ${isValid}`)

      return {
        name: validName,
        symbol: validSymbol,
        decimals: validDecimals,
        isValid
      }

    } catch (error) {
      console.error(`TokenInfoFetcher: Failed to fetch token info for ${tokenAddress}:`, error)
      return {
        name: '',
        symbol: '',
        decimals: 18,
        isValid: false
      }
    }
  }

  private async safeCall<T>(contractCall: Promise<T>): Promise<T | null> {
    try {
      return await contractCall
    } catch (error) {
      console.warn('Contract call failed:', error)
      return null
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // 获取Token余额
  async getTokenBalance(
    tokenAddress: string,
    accountAddress: string,
    chainId: string,
    customRpcUrl?: string
  ): Promise<string> {
    try {
      if (!this.isValidAddress(tokenAddress) || !this.isValidAddress(accountAddress)) {
        return '0'
      }

      const provider = this.getProvider(chainId, customRpcUrl)
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

      const balance = await contract.balanceOf(accountAddress)
      return balance.toString()
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
      return '0'
    }
  }

  // 验证Token合约是否有效（通过检查是否实现了ERC-20标准方法）
  async validateTokenContract(
    tokenAddress: string,
    chainId: string,
    customRpcUrl?: string
  ): Promise<boolean> {
    try {
      const tokenInfo = await this.getTokenInfo(tokenAddress, chainId, customRpcUrl, 5000)
      return tokenInfo.isValid
    } catch (error) {
      return false
    }
  }

  // 获取常用Token列表（可扩展）
  getPopularTokens(chainId: string): Array<{address: string, symbol: string, name: string}> {
    const tokens: { [chainId: string]: Array<{address: string, symbol: string, name: string}> } = {
      '0x1': [
        { address: '0xA0b86a33E6441019Faa8Ec161C7bd8D33B8f7e1e', symbol: 'USDT', name: 'Tether USD' },
        { address: '0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b', symbol: 'USDC', name: 'USD Coin' },
        { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'ChainLink Token' },
        { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC' },
        { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap' }
      ],
      '0x89': [
        { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD (PoS)' },
        { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin (PoS)' },
        { address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', symbol: 'LINK', name: 'ChainLink Token' }
      ],
      '0x38': [
        { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD' },
        { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin' },
        { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD' }
      ]
    }

    return tokens[chainId] || []
  }
}

export default TokenInfoFetcher