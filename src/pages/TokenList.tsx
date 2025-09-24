import React, { useState, useEffect, useRef } from 'react'
import { Card, Button, List, Typography, Space, Divider, Switch, Spin, Empty, Modal, message } from 'antd'
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
import { useI18n } from '../hooks/useI18n'
import { Token } from '../wallet/TokenManager'
import AddTokenModal from './AddTokenModal'

const { Title, Text } = Typography

interface TokenListProps {
  tokens: Token[]
  loading?: boolean
  accountAddress: string
  chainId: string
  onAddToken: (token: Omit<Token, 'chainId'>) => Promise<boolean>
  onRemoveToken: (tokenAddress: string) => Promise<boolean>
  onRefreshBalance: (tokenAddress: string) => Promise<void>
  onRefreshAllBalances: () => Promise<void>
}

const TokenList: React.FC<TokenListProps> = ({
  tokens,
  loading = false,
  accountAddress,
  chainId,
  onAddToken,
  onRemoveToken,
  onRefreshBalance,
  onRefreshAllBalances
}) => {
  const { t } = useI18n()
  const [showAddModal, setShowAddModal] = useState(false)
  const [hideZeroBalance, setHideZeroBalance] = useState(false)
  const [refreshingTokens, setRefreshingTokens] = useState<Set<string>>(new Set())
  const [refreshingAll, setRefreshingAll] = useState(false)
  const tokenBalanceIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // 设置代币余额轮询
  useEffect(() => {
    if (tokens.length > 0) {
      // 立即刷新一次余额
      onRefreshAllBalances();

      // 启动轮询 - 每6秒刷新一次余额
      tokenBalanceIntervalRef.current = setInterval(() => {
        onRefreshAllBalances();
      }, 6000);
    }

    // 清理轮询
    return () => {
      if (tokenBalanceIntervalRef.current) {
        clearInterval(tokenBalanceIntervalRef.current);
        tokenBalanceIntervalRef.current = null;
      }
    };
  }, [tokens.length, accountAddress, chainId, onRefreshAllBalances]);

  // 监听账户变更和网络变更事件
  useEffect(() => {
    const handleAccountChange = () => {
      if (tokens.length > 0) {
        onRefreshAllBalances();
      }
    };

    const handleNetworkChange = () => {
      if (tokens.length > 0) {
        onRefreshAllBalances();
      }
    };

    // 监听全局的账户和网络变更事件
    window.addEventListener('accountsChanged', handleAccountChange);
    window.addEventListener('chainChanged', handleNetworkChange);

    return () => {
      window.removeEventListener('accountsChanged', handleAccountChange);
      window.removeEventListener('chainChanged', handleNetworkChange);
    };
  }, [tokens.length, onRefreshAllBalances]);

  // 过滤Token（隐藏零余额）
  const filteredTokens = hideZeroBalance
    ? tokens.filter(token => parseFloat(token.balance || '0') > 0)
    : tokens

  const handleAddToken = async (tokenData: Omit<Token, 'chainId'>): Promise<boolean> => {
    const success = await onAddToken(tokenData)
    if (success) {
      setShowAddModal(false)
      message.success(t('token.tokenAdded'))
      // 代币添加成功后立即刷新余额
      setTimeout(() => {
        onRefreshAllBalances();
      }, 500); // 延迟500ms确保后端已处理完成
      return true
    } else {
      message.error(t('token.tokenExists'))
      return false
    }
  }

  const handleRemoveToken = (token: Token) => {
    Modal.confirm({
      title: t('token.confirmRemoveToken'),
      content: `${token.name} (${token.symbol})`,
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        const success = await onRemoveToken(token.address)
        if (success) {
          message.success(t('token.tokenRemoved'))
        } else {
          message.error(t('errors.operationFailed'))
        }
      }
    })
  }

  const handleRefreshBalance = async (tokenAddress: string) => {
    setRefreshingTokens(prev => new Set(prev).add(tokenAddress))
    try {
      await onRefreshBalance(tokenAddress)
    } finally {
      setRefreshingTokens(prev => {
        const newSet = new Set(prev)
        newSet.delete(tokenAddress)
        return newSet
      })
    }
  }

  const handleRefreshAllBalances = async () => {
    setRefreshingAll(true)
    try {
      await onRefreshAllBalances()
    } finally {
      setRefreshingAll(false)
    }
  }

  const formatBalance = (balance: string | undefined, decimals: number) => {
    if (!balance) return '0'
    const balanceNum = parseFloat(balance) / Math.pow(10, decimals)
    return balanceNum.toFixed(6).replace(/\.?0+$/, '')
  }

  return (
    <Card>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={4} style={{ margin: 0 }}>
            {t('token.myTokens')}
          </Title>
          <Space>
            <Switch
              size="small"
              checked={hideZeroBalance}
              onChange={setHideZeroBalance}
              checkedChildren={<EyeInvisibleOutlined />}
              unCheckedChildren={<EyeOutlined />}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {hideZeroBalance ? t('token.hideZeroBalance') : t('token.showZeroBalance')}
            </Text>
          </Space>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
            size="small"
          >
            {t('token.addToken')}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshAllBalances}
            loading={refreshingAll}
            size="small"
          >
            {t('token.refreshBalance')}
          </Button>
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">{t('common.loading')}</Text>
          </div>
        </div>
      ) : filteredTokens.length === 0 ? (
        <Empty
          description={hideZeroBalance ? t('token.noTokensFound') : t('token.noTokensFound')}
          style={{ padding: '40px 0' }}
        />
      ) : (
        <List
          dataSource={filteredTokens}
          renderItem={(token) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  size="small"
                  loading={refreshingTokens.has(token.address)}
                  onClick={() => handleRefreshBalance(token.address)}
                />,
                token.isCustom && (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleRemoveToken(token)}
                  />
                )
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <Text strong>{token.symbol}</Text>
                      {token.isCustom && <Text type="secondary" style={{ fontSize: '12px' }}>({t('token.customToken')})</Text>}
                    </Space>
                    <Text strong style={{ fontSize: '14px' }}>
                      {formatBalance(token.balance, token.decimals)} {token.symbol}
                    </Text>
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{token.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                      {token.address}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      <AddTokenModal
        visible={showAddModal}
        chainId={chainId}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddToken}
      />
    </Card>
  )
}

export default TokenList